import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Config } from '../config/aws.js';
import {
    extractTradeLicense,
    extractVATCertificate,
    extractCorporateTaxCertificate,
    extractEmiratesID,
    extractPassport,
    extractTradeLicenseFromText,
    extractVATCertificateFromText,
    extractCorporateTaxCertificateFromText,
    extractEmiratesIDFromText,
    extractPassportFromText,
} from './openai.service.js';
import logger from '../helpers/logger.js';
import pdfParse from 'pdf-parse';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';

// Configure pdfjs worker for Node.js
// For Node.js, we can disable the worker or use a file path
// Using 'node_modules' relative path that works from the project root
try {
    const workerPath = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).pathname;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
} catch (error) {
    // If worker setup fails, pdfjs-dist will fallback to main thread
    console.warn('Could not configure pdfjs worker, using main thread');
}

/**
 * Custom NodeCanvasFactory for pdfjs-dist in Node.js environment
 * This is required because pdfjs-dist's canvas handling needs special setup in Node.js
 * Includes proper Image support for handling embedded images in scanned PDFs
 */
class NodeCanvasFactory {
    create(width, height) {
        const canvas = createCanvas(width, height);
        const context = canvas.getContext('2d');
        return { canvas, context };
    }

    reset(canvasAndContext, width, height) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }

    destroy(canvasAndContext) {
        if (canvasAndContext.canvas) {
            canvasAndContext.canvas.width = 0;
            canvasAndContext.canvas.height = 0;
        }
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    }
}

/**
 * Download file from S3 and return as buffer
 * @param {string} fileKey - S3 object key
 * @returns {Promise<Buffer>} File buffer
 */
const downloadFileAsBuffer = async (fileKey) => {
    try {
        const command = new GetObjectCommand({
            Bucket: s3Config.bucket,
            Key: fileKey,
        });

        const response = await s3Config.client.send(command);
        const chunks = [];

        // Convert stream to buffer
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);
        return buffer;
    } catch (error) {
        logger.error('Error downloading file from S3', { fileKey, error: error.message });
        throw new Error(`Failed to download file from S3: ${error.message}`);
    }
};


/**
 * Extract text from PDF buffer
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromPDF = async (pdfBuffer) => {
    try {
        const data = await pdfParse(pdfBuffer);
        // Normalize text: remove excessive whitespace, preserve line breaks
        const normalizedText = data.text
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
            .replace(/[ \t]+/g, ' ') // Normalize spaces
            .trim();

        logger.info('PDF text extracted', {
            originalLength: data.text.length,
            normalizedLength: normalizedText.length,
            preview: normalizedText.substring(0, 200)
        });

        return normalizedText;
    } catch (error) {
        logger.error('Error extracting text from PDF', { error: error.message });
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
};

/**
 * Extract embedded images directly from PDF (for scanned documents)
 * This is a fallback when pdfjs-dist canvas rendering fails
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string|null>} Base64 encoded image or null if no images found
 */
const extractEmbeddedImagesFromPdf = async (pdfBuffer) => {
    try {
        logger.info('Attempting to extract embedded images from PDF', { bufferSize: pdfBuffer.length });

        const uint8Array = new Uint8Array(pdfBuffer);

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            disableFontFace: true,
        });
        const pdfDocument = await loadingTask.promise;

        // Get first page
        const page = await pdfDocument.getPage(1);

        // Get operator list to find images
        const operatorList = await page.getOperatorList();
        const commonObjs = page.commonObjs;
        const objs = page.objs;

        // Find image objects in the operator list
        const imageRefs = [];
        for (let i = 0; i < operatorList.fnArray.length; i++) {
            // OPS.paintImageXObject = 85, OPS.paintInlineImageXObject = 86
            if (operatorList.fnArray[i] === 85 || operatorList.fnArray[i] === 86) {
                const imgArgs = operatorList.argsArray[i];
                if (imgArgs && imgArgs[0]) {
                    imageRefs.push(imgArgs[0]);
                }
            }
        }

        logger.info('Found image references in PDF', { imageCount: imageRefs.length });

        if (imageRefs.length === 0) {
            return null;
        }

        // Try to get the first image
        const imgName = imageRefs[0];
        let imgData = null;

        // Try to get image from objs or commonObjs
        try {
            imgData = objs.get(imgName);
        } catch (e) {
            try {
                imgData = commonObjs.get(imgName);
            } catch (e2) {
                logger.warn('Could not retrieve image object', { imgName });
            }
        }

        if (imgData && imgData.data) {
            // Create canvas and draw the raw image data
            const canvas = createCanvas(imgData.width, imgData.height);
            const ctx = canvas.getContext('2d');

            // Create ImageData and put it on canvas
            const imageData = ctx.createImageData(imgData.width, imgData.height);

            // Copy the image data (handling different formats)
            if (imgData.data.length === imgData.width * imgData.height * 4) {
                // RGBA format
                imageData.data.set(imgData.data);
            } else if (imgData.data.length === imgData.width * imgData.height * 3) {
                // RGB format - need to add alpha channel
                for (let i = 0, j = 0; i < imgData.data.length; i += 3, j += 4) {
                    imageData.data[j] = imgData.data[i];
                    imageData.data[j + 1] = imgData.data[i + 1];
                    imageData.data[j + 2] = imgData.data[i + 2];
                    imageData.data[j + 3] = 255;
                }
            } else {
                // Grayscale or other format
                const pixelCount = imgData.width * imgData.height;
                for (let i = 0; i < pixelCount; i++) {
                    const gray = imgData.data[i] || 0;
                    imageData.data[i * 4] = gray;
                    imageData.data[i * 4 + 1] = gray;
                    imageData.data[i * 4 + 2] = gray;
                    imageData.data[i * 4 + 3] = 255;
                }
            }

            ctx.putImageData(imageData, 0, 0);

            const imageBuffer = canvas.toBuffer('image/png');
            const imageBase64 = imageBuffer.toString('base64');

            logger.info('Embedded image extracted successfully', {
                width: imgData.width,
                height: imgData.height,
                imageSize: imageBuffer.length,
            });

            return imageBase64;
        }

        return null;
    } catch (error) {
        logger.error('Error extracting embedded images from PDF', {
            error: error.message,
            stack: error.stack,
        });
        return null;
    }
};

/**
 * Convert PDF buffer to PNG image (base64)
 * Uses pdfjs-dist with canvas rendering, with fallback to embedded image extraction
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Base64 encoded PNG image
 */
const convertPdfToImage = async (pdfBuffer) => {
    try {
        logger.info('Converting PDF to image', { bufferSize: pdfBuffer.length });

        // Convert Buffer to Uint8Array (required by pdfjs-dist)
        const uint8Array = new Uint8Array(pdfBuffer);

        // Create canvas factory for Node.js
        const canvasFactory = new NodeCanvasFactory();

        // Load PDF document with canvas factory and optimized settings for scanned docs
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            canvasFactory: canvasFactory,
            // Disable font loading which can cause issues in Node.js
            disableFontFace: true,
            // Use standard fonts
            useSystemFonts: true,
            // Disable features that cause issues with scanned PDFs
            isOffscreenCanvasSupported: false,
        });
        const pdfDocument = await loadingTask.promise;

        // Get first page (most documents have ID/passport on first page)
        const pageNumber = 1;
        const page = await pdfDocument.getPage(pageNumber);

        // Set scale for good quality (2x for better OCR)
        const scale = 2.0;
        const viewport = page.getViewport({ scale });

        // Create canvas using our factory
        const canvasAndContext = canvasFactory.create(
            Math.floor(viewport.width),
            Math.floor(viewport.height)
        );

        // Render PDF page to canvas
        const renderContext = {
            canvasContext: canvasAndContext.context,
            viewport: viewport,
            canvasFactory: canvasFactory,
        };

        await page.render(renderContext).promise;

        // Convert canvas to PNG buffer, then to base64
        const imageBuffer = canvasAndContext.canvas.toBuffer('image/png');
        const imageBase64 = imageBuffer.toString('base64');

        logger.info('PDF converted to image successfully', {
            pageNumber,
            width: viewport.width,
            height: viewport.height,
            imageSize: imageBuffer.length,
        });

        // Cleanup
        canvasFactory.destroy(canvasAndContext);

        return imageBase64;
    } catch (error) {
        logger.error('Error converting PDF to image with pdfjs-dist, trying fallback extraction', {
            error: error.message,
        });

        // Fallback: Try to extract embedded images directly
        // This works better for scanned PDFs that are essentially images wrapped in PDF
        const embeddedImage = await extractEmbeddedImagesFromPdf(pdfBuffer);

        if (embeddedImage) {
            logger.info('Successfully extracted embedded image as fallback');
            return embeddedImage;
        }

        // If fallback also fails, throw the original error
        logger.error('Both PDF rendering and embedded image extraction failed', {
            error: error.message,
            stack: error.stack,
        });
        throw new Error(`Failed to convert PDF to image: ${error.message}`);
    }
};

/**
 * Validate text quality for extraction
 * @param {string} text - Extracted text
 * @returns {Object} Quality assessment with isValid flag and details
 */
const isTextQualityGood = (text) => {
    if (!text || typeof text !== 'string') {
        return { isValid: false, reason: 'Text is empty or invalid' };
    }

    // Check minimum length
    if (text.length < 50) {
        return { isValid: false, reason: `Text too short: ${text.length} characters` };
    }

    // Check word density (filter out very short words)
    const words = text.split(/\s+/).filter(w => w.length > 2);
    if (words.length < 10) {
        return { isValid: false, reason: `Insufficient words: ${words.length} meaningful words` };
    }

    // Check for reasonable character diversity (not just repeated characters)
    const uniqueChars = new Set(text.replace(/\s/g, '')).size;
    if (uniqueChars < 5) {
        return { isValid: false, reason: `Low character diversity: ${uniqueChars} unique characters` };
    }

    return { isValid: true };
};

/**
 * Detect file type from buffer
 * @param {Buffer} buffer - File buffer
 * @param {string} fileKey - File key (for extension check)
 * @returns {string} File type: 'pdf' or 'image'
 */
const detectFileType = (buffer, fileKey) => {
    // Check file extension first
    const extension = fileKey.split('.').pop().toLowerCase();
    if (extension === 'pdf') {
        return 'pdf';
    }

    // Check PDF magic number
    if (buffer.length >= 4) {
        const header = buffer.toString('ascii', 0, 4);
        if (header === '%PDF') {
            return 'pdf';
        }
    }

    // Default to image
    return 'image';
};

/**
 * Process document and extract data using AI
 * @param {string} documentCategory - Document category
 * @param {string} fileKey - S3 file key
 * @returns {Promise<Object>} Extracted data with processing metadata
 */
export const processDocument = async (documentCategory, fileKey) => {
    try {
        logger.info('Starting document processing', { documentCategory, fileKey });

        // Download file as buffer
        const fileBuffer = await downloadFileAsBuffer(fileKey);

        // Detect file type
        const fileType = detectFileType(fileBuffer, fileKey);
        logger.info('File type detected', { fileKey, fileType });

        let extractedData;
        let extractionMethod = 'unknown';
        const extractionStartTime = Date.now();

        // Use text extraction for PDFs, vision API for images
        if (fileType === 'pdf') {
            // Extract text from PDF
            const text = await extractTextFromPDF(fileBuffer);
            logger.info('Text extracted from PDF', {
                fileKey,
                textLength: text.length,
                textPreview: text.substring(0, 500)
            });

            // Validate text quality
            const qualityCheck = isTextQualityGood(text);
            logger.info('Text quality check', {
                fileKey,
                isValid: qualityCheck.isValid,
                reason: qualityCheck.reason
            });

            // For Emirates ID and Passport, implement hybrid extraction strategy
            const isPersonDocument = documentCategory.includes('EMIRATES_ID') ||
                documentCategory.includes('PASSPORT');

            if (isPersonDocument && !qualityCheck.isValid) {
                logger.warn('Text quality poor for person document, converting PDF to image for vision API', {
                    fileKey,
                    documentCategory,
                    reason: qualityCheck.reason
                });
                extractionMethod = 'vision_api_fallback';
                // Convert PDF to image before sending to Vision API
                const imageBase64 = await convertPdfToImage(fileBuffer);

                if (documentCategory.includes('EMIRATES_ID')) {
                    extractedData = await extractEmiratesID(imageBase64);
                } else {
                    extractedData = await extractPassport(imageBase64);
                }
            } else {
                // Try text extraction first
                extractionMethod = 'text_extraction';

                switch (documentCategory) {
                    case 'TRADE_LICENSE':
                        extractedData = await extractTradeLicenseFromText(text);
                        break;
                    case 'VAT_CERTIFICATE':
                        extractedData = await extractVATCertificateFromText(text);
                        break;
                    case 'CORPORATE_TAX_CERTIFICATE':
                        extractedData = await extractCorporateTaxCertificateFromText(text);
                        break;
                    case 'EMIRATES_ID_PARTNER':
                    case 'EMIRATES_ID_MANAGER':
                        extractedData = await extractEmiratesIDFromText(text);
                        break;
                    case 'PASSPORT_PARTNER':
                    case 'PASSPORT_MANAGER':
                        extractedData = await extractPassportFromText(text);
                        break;
                    default:
                        throw new Error(`Unsupported document category: ${documentCategory}`);
                }

                // For person documents, check if critical fields are missing and fallback to vision API
                if (isPersonDocument) {
                    const hasCriticalField = documentCategory.includes('EMIRATES_ID')
                        ? extractedData.idNumber?.value
                        : extractedData.passportNumber?.value;

                    // Calculate average confidence
                    const fields = Object.values(extractedData);
                    const confidences = fields.map((field) => field?.confidence || 0);
                    const averageConfidence = confidences.length > 0
                        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
                        : 0;

                    if (!hasCriticalField || averageConfidence < 0.7) {
                        logger.warn('Text extraction failed for person document, converting PDF to image for vision API fallback', {
                            fileKey,
                            documentCategory,
                            hasCriticalField: !!hasCriticalField,
                            averageConfidence
                        });

                        extractionMethod = 'hybrid_vision_fallback';
                        // Convert PDF to image before sending to Vision API
                        const imageBase64 = await convertPdfToImage(fileBuffer);

                        if (documentCategory.includes('EMIRATES_ID')) {
                            extractedData = await extractEmiratesID(imageBase64);
                        } else {
                            extractedData = await extractPassport(imageBase64);
                        }
                    }
                }
            }
        } else {
            // Use vision API for images
            extractionMethod = 'vision_api';
            const imageBase64 = fileBuffer.toString('base64');

            switch (documentCategory) {
                case 'TRADE_LICENSE':
                    extractedData = await extractTradeLicense(imageBase64);
                    break;
                case 'VAT_CERTIFICATE':
                    extractedData = await extractVATCertificate(imageBase64);
                    break;
                case 'CORPORATE_TAX_CERTIFICATE':
                    extractedData = await extractCorporateTaxCertificate(imageBase64);
                    break;
                case 'EMIRATES_ID_PARTNER':
                case 'EMIRATES_ID_MANAGER':
                    extractedData = await extractEmiratesID(imageBase64);
                    break;
                case 'PASSPORT_PARTNER':
                case 'PASSPORT_MANAGER':
                    extractedData = await extractPassport(imageBase64);
                    break;
                default:
                    throw new Error(`Unsupported document category: ${documentCategory}`);
            }
        }

        const extractionTime = Date.now() - extractionStartTime;

        // Calculate overall confidence (average of all field confidences)
        const fields = Object.values(extractedData);
        const confidences = fields.map((field) => field?.confidence || 0);
        const averageConfidence =
            confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

        // Check for critical fields in person documents
        let hasCriticalFields = true;
        if (documentCategory.includes('EMIRATES_ID')) {
            hasCriticalFields = !!extractedData.idNumber?.value;
        } else if (documentCategory.includes('PASSPORT')) {
            hasCriticalFields = !!extractedData.passportNumber?.value;
        }

        logger.info('Document processing completed', {
            documentCategory,
            fileKey,
            fileType,
            extractionMethod,
            extractionTime,
            averageConfidence,
            hasCriticalFields,
            extractedFields: Object.keys(extractedData)
        });

        return {
            extractedData,
            processingMetadata: {
                processedAt: new Date(),
                extractionTime,
                extractionMethod,
                averageConfidence,
                fileType,
                hasCriticalFields,
                lowConfidenceFields: fields
                    .map((field, index) => ({
                        field: Object.keys(extractedData)[index],
                        confidence: field?.confidence || 0
                    }))
                    .filter((item) => item.confidence < 0.7)
                    .map((item) => item.field),
            },
        };
    } catch (error) {
        logger.error('Error processing document', {
            documentCategory,
            fileKey,
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
};

/**
 * Map extracted data to client business info fields
 * @param {string} documentCategory - Document category
 * @param {Object} extractedData - Extracted data from AI
 * @returns {Object} Mapped business info fields and AI-extracted field names
 */
export const mapExtractedDataToBusinessInfo = (documentCategory, extractedData) => {
    const updates = {};
    const aiExtractedFields = [];

    // Extract common fields from any document type
    if (extractedData.legalNameEnglish?.value) {
        updates.name = extractedData.legalNameEnglish.value;
        aiExtractedFields.push('name');
    }
    if (extractedData.legalNameArabic?.value) {
        updates.nameArabic = extractedData.legalNameArabic.value;
        aiExtractedFields.push('nameArabic');
    }
    if (extractedData.address?.value) {
        updates['businessInfo.address'] = extractedData.address.value;
        aiExtractedFields.push('businessInfo.address');
    }
    if (extractedData.emirate?.value) {
        updates['businessInfo.emirate'] = extractedData.emirate.value;
        aiExtractedFields.push('businessInfo.emirate');
    }

    // Extract document-specific fields
    switch (documentCategory) {
        case 'TRADE_LICENSE':
            if (extractedData.licenseNumber?.value) {
                updates['businessInfo.licenseNumber'] = extractedData.licenseNumber.value;
                aiExtractedFields.push('businessInfo.licenseNumber');
            }
            if (extractedData.licenseStartDate?.value) {
                updates['businessInfo.licenseStartDate'] = new Date(extractedData.licenseStartDate.value);
                aiExtractedFields.push('businessInfo.licenseStartDate');
            }
            if (extractedData.licenseExpiryDate?.value) {
                updates['businessInfo.licenseExpiryDate'] = new Date(extractedData.licenseExpiryDate.value);
                aiExtractedFields.push('businessInfo.licenseExpiryDate');
            }
            if (extractedData.managerName?.value) {
                // This will be handled separately for manager records
                updates._managerName = extractedData.managerName.value;
            }
            if (extractedData.partners?.value && Array.isArray(extractedData.partners.value)) {
                updates._partners = extractedData.partners.value;
            }
            break;

        case 'VAT_CERTIFICATE':
            if (extractedData.trn?.value) {
                updates['businessInfo.trn'] = extractedData.trn.value;
                aiExtractedFields.push('businessInfo.trn');
            }
            if (extractedData.vatReturnCycle?.value) {
                const cycle = extractedData.vatReturnCycle.value.toUpperCase();
                if (cycle === 'MONTHLY' || cycle === 'QUARTERLY') {
                    updates['businessInfo.vatReturnCycle'] = cycle;
                    aiExtractedFields.push('businessInfo.vatReturnCycle');
                }
            }
            break;

        case 'CORPORATE_TAX_CERTIFICATE':
            if (extractedData.ctrn?.value) {
                updates['businessInfo.ctrn'] = extractedData.ctrn.value;
                aiExtractedFields.push('businessInfo.ctrn');
            }
            if (extractedData.taxPeriodDueDate?.value) {
                updates['businessInfo.corporateTaxDueDate'] = new Date(extractedData.taxPeriodDueDate.value);
                aiExtractedFields.push('businessInfo.corporateTaxDueDate');
            }
            break;

        default:
            // For Emirates ID and Passport, data will be mapped to person records
            break;
    }

    return { updates, aiExtractedFields };
};

/**
 * Cross-validate names across documents
 * @param {Object} client - Client document
 * @param {Object} newExtractedData - Newly extracted data
 * @param {string} documentCategory - Category of the new document
 * @returns {Object} Validation result with errors if any
 */
export const validateNameConsistency = (client, newExtractedData, documentCategory) => {
    const errors = [];
    const warnings = [];

    // Get existing names from client
    const existingName = client.name;
    const existingNameArabic = client.nameArabic;

    // Get new names from extracted data
    const newName = newExtractedData.legalNameEnglish?.value;
    const newNameArabic = newExtractedData.legalNameArabic?.value;

    // Check English name consistency
    if (newName && existingName) {
        // Normalize names for comparison (remove extra spaces, convert to uppercase)
        const normalizedExisting = existingName.trim().toUpperCase().replace(/\s+/g, ' ');
        const normalizedNew = newName.trim().toUpperCase().replace(/\s+/g, ' ');

        if (normalizedExisting !== normalizedNew) {
            errors.push({
                field: 'legalNameEnglish',
                message: `Name mismatch detected. Existing: "${existingName}", New from ${documentCategory}: "${newName}"`,
                existingValue: existingName,
                newValue: newName,
                documentCategory,
            });
        }
    }

    // Check Arabic name consistency
    if (newNameArabic && existingNameArabic) {
        const normalizedExisting = existingNameArabic.trim().replace(/\s+/g, ' ');
        const normalizedNew = newNameArabic.trim().replace(/\s+/g, ' ');

        if (normalizedExisting !== normalizedNew) {
            errors.push({
                field: 'legalNameArabic',
                message: `Arabic name mismatch detected. Existing: "${existingNameArabic}", New from ${documentCategory}: "${newNameArabic}"`,
                existingValue: existingNameArabic,
                newValue: newNameArabic,
                documentCategory,
            });
        }
    }

    // Check names across other documents
    const businessDocs = client.documents.filter(
        (doc) =>
            ['TRADE_LICENSE', 'VAT_CERTIFICATE', 'CORPORATE_TAX_CERTIFICATE'].includes(doc.category) &&
            doc.extractedData
    );

    for (const doc of businessDocs) {
        const docName = doc.extractedData?.legalNameEnglish?.value;
        const docNameArabic = doc.extractedData?.legalNameArabic?.value;

        if (newName && docName && doc.category !== documentCategory) {
            const normalizedDoc = docName.trim().toUpperCase().replace(/\s+/g, ' ');
            const normalizedNew = newName.trim().toUpperCase().replace(/\s+/g, ' ');

            if (normalizedDoc !== normalizedNew) {
                warnings.push({
                    field: 'legalNameEnglish',
                    message: `Name mismatch between documents. ${doc.category}: "${docName}", ${documentCategory}: "${newName}"`,
                    document1: doc.category,
                    value1: docName,
                    document2: documentCategory,
                    value2: newName,
                });
            }
        }

        if (newNameArabic && docNameArabic && doc.category !== documentCategory) {
            const normalizedDoc = docNameArabic.trim().replace(/\s+/g, ' ');
            const normalizedNew = newNameArabic.trim().replace(/\s+/g, ' ');

            if (normalizedDoc !== normalizedNew) {
                warnings.push({
                    field: 'legalNameArabic',
                    message: `Arabic name mismatch between documents. ${doc.category}: "${docNameArabic}", ${documentCategory}: "${newNameArabic}"`,
                    document1: doc.category,
                    value1: docNameArabic,
                    document2: documentCategory,
                    value2: newNameArabic,
                });
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
};

/**
 * Map extracted data to person record (for Emirates ID or Passport)
 * @param {string} documentCategory - Document category
 * @param {Object} extractedData - Extracted data from AI
 * @returns {Object} Person record updates
 */
export const mapExtractedDataToPerson = (documentCategory, extractedData) => {
    const updates = {};

    if (documentCategory.includes('EMIRATES_ID')) {
        if (extractedData.name?.value) {
            updates.name = extractedData.name.value;
        }
        if (extractedData.idNumber?.value) {
            updates['emiratesId.number'] = extractedData.idNumber.value;
        }
        if (extractedData.issueDate?.value) {
            updates['emiratesId.issueDate'] = new Date(extractedData.issueDate.value);
        }
        if (extractedData.expiryDate?.value) {
            updates['emiratesId.expiryDate'] = new Date(extractedData.expiryDate.value);
        }
    } else if (documentCategory.includes('PASSPORT')) {
        if (extractedData.name?.value) {
            updates.name = extractedData.name.value;
        }
        if (extractedData.passportNumber?.value) {
            updates['passport.number'] = extractedData.passportNumber.value;
        }
        if (extractedData.issueDate?.value) {
            updates['passport.issueDate'] = new Date(extractedData.issueDate.value);
        }
        if (extractedData.expiryDate?.value) {
            updates['passport.expiryDate'] = new Date(extractedData.expiryDate.value);
        }
    }

    return updates;
};

