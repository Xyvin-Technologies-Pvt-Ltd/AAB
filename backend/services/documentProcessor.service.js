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
        return data.text;
    } catch (error) {
        logger.error('Error extracting text from PDF', { error: error.message });
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
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
        const extractionStartTime = Date.now();

        // Use text extraction for PDFs, vision API for images
        if (fileType === 'pdf') {
            // Extract text from PDF
            const text = await extractTextFromPDF(fileBuffer);
            logger.info('Text extracted from PDF', { fileKey, textLength: text.length });

            // Call appropriate text-based extraction function
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
        } else {
            // Use vision API for images
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
        const confidences = fields.map((field) => field.confidence || 0);
        const averageConfidence =
            confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

        logger.info('Document processing completed', {
            documentCategory,
            fileKey,
            fileType,
            extractionTime,
            averageConfidence,
        });

        return {
            extractedData,
            processingMetadata: {
                processedAt: new Date(),
                extractionTime,
                averageConfidence,
                fileType,
                lowConfidenceFields: fields
                    .filter((field) => (field.confidence || 0) < 0.7)
                    .map((field, index) => Object.keys(extractedData)[index]),
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

