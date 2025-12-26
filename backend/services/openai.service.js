import { openaiConfig } from '../config/openai.js';
import logger from '../helpers/logger.js';

/**
 * Extract data from Trade License document
 * @param {string} imageBase64 - Base64 encoded image
 * @returns {Promise<Object>} Extracted data with confidence scores
 */
export const extractTradeLicense = async (imageBase64) => {
    try {
        const prompt = `Analyze this Trade License document and extract the following information. Return a JSON object with the exact structure below. For each field, provide the extracted value and a confidence score (0-1).

Required fields:
- legalNameEnglish (string): Legal name in English
- legalNameArabic (string): Legal name in Arabic (if available)
- licenseNumber (string): License number
- licenseStartDate (string): Start date in YYYY-MM-DD format
- licenseExpiryDate (string): Expiry date in YYYY-MM-DD format
- address (string): Complete business address
- emirate (string): Emirate name (Dubai, Abu Dhabi, Sharjah, etc.)
- managerName (string): Manager name if mentioned
- partners (array): Array of partner names if mentioned (e.g., ["Partner 1", "Partner 2"])

Return JSON format:
{
  "legalNameEnglish": {"value": "...", "confidence": 0.95},
  "legalNameArabic": {"value": "...", "confidence": 0.90},
  "licenseNumber": {"value": "...", "confidence": 0.98},
  "licenseStartDate": {"value": "YYYY-MM-DD", "confidence": 0.95},
  "licenseExpiryDate": {"value": "YYYY-MM-DD", "confidence": 0.95},
  "address": {"value": "...", "confidence": 0.90},
  "emirate": {"value": "...", "confidence": 0.95},
  "managerName": {"value": "...", "confidence": 0.85},
  "partners": {"value": ["...", "..."], "confidence": 0.80}
}`;

        const response = await openaiConfig.client.chat.completions.create({
            model: openaiConfig.visionModel,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 2000,
            response_format: { type: 'json_object' },
        });

        const extractedData = JSON.parse(response.choices[0].message.content);
        logger.info('Trade License extraction completed', { confidence: extractedData });
        return extractedData;
    } catch (error) {
        logger.error('Error extracting Trade License data', { error: error.message });
        throw new Error(`Failed to extract Trade License data: ${error.message}`);
    }
};

/**
 * Extract data from VAT Certificate document
 * @param {string} imageBase64 - Base64 encoded image
 * @returns {Promise<Object>} Extracted data with confidence scores
 */
export const extractVATCertificate = async (imageBase64) => {
    try {
        const prompt = `Analyze this VAT Certificate document and extract the following information. Return a JSON object with the exact structure below.

Required fields:
- trn (string): Tax Registration Number (TRN)
- registrationStatus (string): Registration status (Active, Inactive, etc.)
- vatReturnCycle (string): Return cycle - either "MONTHLY" or "QUARTERLY"
- registrationDate (string): Registration date in YYYY-MM-DD format
- legalNameEnglish (string): Legal name in English (if available)
- legalNameArabic (string): Legal name in Arabic (if available)
- address (string): Business address (if available)
- emirate (string): Emirate name (Dubai, Abu Dhabi, Sharjah, etc.) (if available)

Return JSON format:
{
  "trn": {"value": "...", "confidence": 0.98},
  "registrationStatus": {"value": "...", "confidence": 0.95},
  "vatReturnCycle": {"value": "MONTHLY or QUARTERLY", "confidence": 0.90},
  "registrationDate": {"value": "YYYY-MM-DD", "confidence": 0.90},
  "legalNameEnglish": {"value": "...", "confidence": 0.90},
  "legalNameArabic": {"value": "...", "confidence": 0.85},
  "address": {"value": "...", "confidence": 0.85},
  "emirate": {"value": "...", "confidence": 0.90}
}`;

        const response = await openaiConfig.client.chat.completions.create({
            model: openaiConfig.visionModel,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 1000,
            response_format: { type: 'json_object' },
        });

        const extractedData = JSON.parse(response.choices[0].message.content);
        logger.info('VAT Certificate extraction completed', { confidence: extractedData });
        return extractedData;
    } catch (error) {
        logger.error('Error extracting VAT Certificate data', { error: error.message });
        throw new Error(`Failed to extract VAT Certificate data: ${error.message}`);
    }
};

/**
 * Extract data from Corporate Tax Certificate document
 * @param {string} imageBase64 - Base64 encoded image
 * @returns {Promise<Object>} Extracted data with confidence scores
 */
export const extractCorporateTaxCertificate = async (imageBase64) => {
    try {
        const prompt = `Analyze this Corporate Tax Certificate document and extract the following information. Return a JSON object with the exact structure below.

Required fields:
- ctrn (string): Corporate Tax Registration Number (CTRN)
- taxPeriodDueDate (string): Tax period due date in YYYY-MM-DD format
- registrationDate (string): Registration date in YYYY-MM-DD format
- legalNameEnglish (string): Legal name in English (if available)
- legalNameArabic (string): Legal name in Arabic (if available)
- address (string): Business address (if available)
- emirate (string): Emirate name (Dubai, Abu Dhabi, Sharjah, etc.) (if available)

Return JSON format:
{
  "ctrn": {"value": "...", "confidence": 0.98},
  "taxPeriodDueDate": {"value": "YYYY-MM-DD", "confidence": 0.90},
  "registrationDate": {"value": "YYYY-MM-DD", "confidence": 0.90},
  "legalNameEnglish": {"value": "...", "confidence": 0.90},
  "legalNameArabic": {"value": "...", "confidence": 0.85},
  "address": {"value": "...", "confidence": 0.85},
  "emirate": {"value": "...", "confidence": 0.90}
}`;

        const response = await openaiConfig.client.chat.completions.create({
            model: openaiConfig.visionModel,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 1000,
            response_format: { type: 'json_object' },
        });

        const extractedData = JSON.parse(response.choices[0].message.content);
        logger.info('Corporate Tax Certificate extraction completed', { confidence: extractedData });
        return extractedData;
    } catch (error) {
        logger.error('Error extracting Corporate Tax Certificate data', { error: error.message });
        throw new Error(`Failed to extract Corporate Tax Certificate data: ${error.message}`);
    }
};

/**
 * Extract data from Emirates ID document
 * @param {string} imageBase64 - Base64 encoded image
 * @returns {Promise<Object>} Extracted data with confidence scores
 */
export const extractEmiratesID = async (imageBase64) => {
    try {
        const prompt = `Analyze this Emirates ID document and extract the following information. Return a JSON object with the exact structure below.

IMPORTANT: The Emirates ID number is typically a 15-digit number. Look for fields labeled "ID Number", "Identity Number", "Emirates ID", or similar. Extract the complete ID number exactly as shown.

Required fields:
- name (string): Full name as shown on ID (first name and last name)
- idNumber (string): Emirates ID number - the complete 15-digit ID number (this is critical, extract it accurately)
- issueDate (string): Issue date in YYYY-MM-DD format
- expiryDate (string): Expiry date in YYYY-MM-DD format
- nationality (string): Nationality if visible

Return JSON format:
{
  "name": {"value": "...", "confidence": 0.98},
  "idNumber": {"value": "...", "confidence": 0.98},
  "issueDate": {"value": "YYYY-MM-DD", "confidence": 0.95},
  "expiryDate": {"value": "YYYY-MM-DD", "confidence": 0.95},
  "nationality": {"value": "...", "confidence": 0.85}
}`;

        const response = await openaiConfig.client.chat.completions.create({
            model: openaiConfig.visionModel,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 1000,
            response_format: { type: 'json_object' },
        });

        const responseContent = response.choices[0].message.content;
        logger.info('OpenAI Vision API response received for Emirates ID', {
            responseLength: responseContent.length,
            responsePreview: responseContent.substring(0, 300)
        });

        const extractedData = JSON.parse(responseContent);

        logger.info('Emirates ID extraction completed (vision)', {
            extractedFields: Object.keys(extractedData),
            hasIdNumber: !!extractedData.idNumber?.value,
            hasName: !!extractedData.name?.value,
            idNumberPreview: extractedData.idNumber?.value ? extractedData.idNumber.value.substring(0, 5) + '...' : null,
            extractedData
        });

        return extractedData;
    } catch (error) {
        logger.error('Error extracting Emirates ID data', {
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Failed to extract Emirates ID data: ${error.message}`);
    }
};

/**
 * Extract data from Passport document
 * @param {string} imageBase64 - Base64 encoded image
 * @returns {Promise<Object>} Extracted data with confidence scores
 */
export const extractPassport = async (imageBase64) => {
    try {
        const prompt = `Analyze this Passport document and extract the following information. Return a JSON object with the exact structure below.

IMPORTANT: The Passport number is typically found in the machine-readable zone (MRZ) or in a field labeled "Passport No", "Passport Number", "Document Number", or similar. Extract the complete passport number exactly as shown, including any letters and numbers.

Required fields:
- name (string): Full name as shown on passport (surname and given names)
- passportNumber (string): Passport number - the complete passport/document number (this is critical, extract it accurately from the MRZ or passport number field)
- issueDate (string): Issue date in YYYY-MM-DD format
- expiryDate (string): Expiry date in YYYY-MM-DD format
- nationality (string): Nationality (3-letter country code if available)
- dateOfBirth (string): Date of birth in YYYY-MM-DD format (if visible)

Return JSON format:
{
  "name": {"value": "...", "confidence": 0.98},
  "passportNumber": {"value": "...", "confidence": 0.98},
  "issueDate": {"value": "YYYY-MM-DD", "confidence": 0.95},
  "expiryDate": {"value": "YYYY-MM-DD", "confidence": 0.95},
  "nationality": {"value": "...", "confidence": 0.90},
  "dateOfBirth": {"value": "YYYY-MM-DD", "confidence": 0.85}
}`;

        const response = await openaiConfig.client.chat.completions.create({
            model: openaiConfig.visionModel,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 1000,
            response_format: { type: 'json_object' },
        });

        const responseContent = response.choices[0].message.content;
        logger.info('OpenAI Vision API response received for Passport', {
            responseLength: responseContent.length,
            responsePreview: responseContent.substring(0, 300)
        });

        const extractedData = JSON.parse(responseContent);

        logger.info('Passport extraction completed (vision)', {
            extractedFields: Object.keys(extractedData),
            hasPassportNumber: !!extractedData.passportNumber?.value,
            hasName: !!extractedData.name?.value,
            passportNumberPreview: extractedData.passportNumber?.value ? extractedData.passportNumber.value.substring(0, 5) + '...' : null,
            extractedData
        });

        return extractedData;
    } catch (error) {
        logger.error('Error extracting Passport data', {
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Failed to extract Passport data: ${error.message}`);
    }
};

/**
 * Extract data from Trade License document text
 * @param {string} text - Extracted text from PDF
 * @returns {Promise<Object>} Extracted data with confidence scores
 */
export const extractTradeLicenseFromText = async (text) => {
    try {
        const prompt = `Analyze this Trade License document text and extract the following information. Return a JSON object with the exact structure below. For each field, provide the extracted value and a confidence score (0-1).

Document Text:
${text}

Required fields:
- legalNameEnglish (string): Legal name in English
- legalNameArabic (string): Legal name in Arabic (if available)
- licenseNumber (string): License number
- licenseStartDate (string): Start date in YYYY-MM-DD format
- licenseExpiryDate (string): Expiry date in YYYY-MM-DD format
- address (string): Complete business address
- emirate (string): Emirate name (Dubai, Abu Dhabi, Sharjah, etc.)
- managerName (string): Manager name if mentioned
- partners (array): Array of partner names if mentioned (e.g., ["Partner 1", "Partner 2"])

Return JSON format:
{
  "legalNameEnglish": {"value": "...", "confidence": 0.95},
  "legalNameArabic": {"value": "...", "confidence": 0.90},
  "licenseNumber": {"value": "...", "confidence": 0.98},
  "licenseStartDate": {"value": "YYYY-MM-DD", "confidence": 0.95},
  "licenseExpiryDate": {"value": "YYYY-MM-DD", "confidence": 0.95},
  "address": {"value": "...", "confidence": 0.90},
  "emirate": {"value": "...", "confidence": 0.95},
  "managerName": {"value": "...", "confidence": 0.85},
  "partners": {"value": ["...", "..."], "confidence": 0.80}
}`;

        const response = await openaiConfig.client.chat.completions.create({
            model: openaiConfig.model,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: 2000,
            response_format: { type: 'json_object' },
        });

        const extractedData = JSON.parse(response.choices[0].message.content);
        logger.info('Trade License extraction completed (text)', { confidence: extractedData });
        return extractedData;
    } catch (error) {
        logger.error('Error extracting Trade License data from text', { error: error.message });
        throw new Error(`Failed to extract Trade License data: ${error.message}`);
    }
};

/**
 * Extract data from VAT Certificate document text
 * @param {string} text - Extracted text from PDF
 * @returns {Promise<Object>} Extracted data with confidence scores
 */
export const extractVATCertificateFromText = async (text) => {
    try {
        const prompt = `Analyze this VAT Certificate document text and extract the following information. Return a JSON object with the exact structure below.

Document Text:
${text}

Required fields:
- trn (string): Tax Registration Number (TRN)
- registrationStatus (string): Registration status (Active, Inactive, etc.)
- vatReturnCycle (string): Return cycle - either "MONTHLY" or "QUARTERLY"
- registrationDate (string): Registration date in YYYY-MM-DD format
- legalNameEnglish (string): Legal name in English (if available)
- legalNameArabic (string): Legal name in Arabic (if available)
- address (string): Business address (if available)
- emirate (string): Emirate name (Dubai, Abu Dhabi, Sharjah, etc.) (if available)

Return JSON format:
{
  "trn": {"value": "...", "confidence": 0.98},
  "registrationStatus": {"value": "...", "confidence": 0.95},
  "vatReturnCycle": {"value": "MONTHLY or QUARTERLY", "confidence": 0.90},
  "registrationDate": {"value": "YYYY-MM-DD", "confidence": 0.90},
  "legalNameEnglish": {"value": "...", "confidence": 0.90},
  "legalNameArabic": {"value": "...", "confidence": 0.85},
  "address": {"value": "...", "confidence": 0.85},
  "emirate": {"value": "...", "confidence": 0.90}
}`;

        const response = await openaiConfig.client.chat.completions.create({
            model: openaiConfig.model,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: 1000,
            response_format: { type: 'json_object' },
        });

        const extractedData = JSON.parse(response.choices[0].message.content);
        logger.info('VAT Certificate extraction completed (text)', { confidence: extractedData });
        return extractedData;
    } catch (error) {
        logger.error('Error extracting VAT Certificate data from text', { error: error.message });
        throw new Error(`Failed to extract VAT Certificate data: ${error.message}`);
    }
};

/**
 * Extract data from Corporate Tax Certificate document text
 * @param {string} text - Extracted text from PDF
 * @returns {Promise<Object>} Extracted data with confidence scores
 */
export const extractCorporateTaxCertificateFromText = async (text) => {
    try {
        const prompt = `Analyze this Corporate Tax Certificate document text and extract the following information. Return a JSON object with the exact structure below.

Document Text:
${text}

Required fields:
- ctrn (string): Corporate Tax Registration Number (CTRN)
- taxPeriodDueDate (string): Tax period due date in YYYY-MM-DD format
- registrationDate (string): Registration date in YYYY-MM-DD format
- legalNameEnglish (string): Legal name in English (if available)
- legalNameArabic (string): Legal name in Arabic (if available)
- address (string): Business address (if available)
- emirate (string): Emirate name (Dubai, Abu Dhabi, Sharjah, etc.) (if available)

Return JSON format:
{
  "ctrn": {"value": "...", "confidence": 0.98},
  "taxPeriodDueDate": {"value": "YYYY-MM-DD", "confidence": 0.90},
  "registrationDate": {"value": "YYYY-MM-DD", "confidence": 0.90},
  "legalNameEnglish": {"value": "...", "confidence": 0.90},
  "legalNameArabic": {"value": "...", "confidence": 0.85},
  "address": {"value": "...", "confidence": 0.85},
  "emirate": {"value": "...", "confidence": 0.90}
}`;

        const response = await openaiConfig.client.chat.completions.create({
            model: openaiConfig.model,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: 1000,
            response_format: { type: 'json_object' },
        });

        const extractedData = JSON.parse(response.choices[0].message.content);
        logger.info('Corporate Tax Certificate extraction completed (text)', { confidence: extractedData });
        return extractedData;
    } catch (error) {
        logger.error('Error extracting Corporate Tax Certificate data from text', { error: error.message });
        throw new Error(`Failed to extract Corporate Tax Certificate data: ${error.message}`);
    }
};

/**
 * Extract data from Emirates ID document text
 * @param {string} text - Extracted text from PDF
 * @returns {Promise<Object>} Extracted data with confidence scores
 */
export const extractEmiratesIDFromText = async (text) => {
    try {
        // Log text preview for debugging
        const textPreview = text.substring(0, 500);
        logger.info('Extracting Emirates ID from text', {
            textLength: text.length,
            textPreview
        });

        const prompt = `Analyze this Emirates ID document text and extract the following information. Return a JSON object with the exact structure below.

IMPORTANT INSTRUCTIONS:
- The text may contain OCR artifacts, extra spaces, line breaks, or formatting issues
- Look for patterns even if text is malformed (e.g., "IDN0" instead of "ID No", extra spaces in numbers)
- The Emirates ID number is typically a 15-digit number but may appear with spaces, dashes, or other separators
- Dates may appear in various formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.) - normalize to YYYY-MM-DD
- If a field is not found or unclear, set its value to null (not empty string) and confidence to 0.0
- Handle text in both English and Arabic - extract English names when available

Document Text:
${text}

CRITICAL: The Emirates ID number is the most important field. Look for:
- Fields labeled "ID Number", "Identity Number", "Emirates ID", "ID No", "IDN", "رقم الهوية"
- 15-digit numbers (may have spaces: "784 1985 1234567 8" or dashes: "784-1985-1234567-8")
- Numbers near labels like "ID", "Identity", "هوية"
- Extract the complete number, removing spaces/dashes but preserving the digits

Required fields:
- name (string): Full name as shown on ID (first name and last name). Handle multiple name formats.
- idNumber (string): Emirates ID number - the complete 15-digit ID number WITHOUT spaces or dashes (this is critical, extract it accurately)
- issueDate (string): Issue date in YYYY-MM-DD format (convert from any date format found)
- expiryDate (string): Expiry date in YYYY-MM-DD format (convert from any date format found)
- nationality (string): Nationality if visible (can be null if not found)

Return JSON format (use null for missing values, not empty strings):
{
  "name": {"value": "John Doe" or null, "confidence": 0.98},
  "idNumber": {"value": "784198512345678" or null, "confidence": 0.98},
  "issueDate": {"value": "2020-01-15" or null, "confidence": 0.95},
  "expiryDate": {"value": "2030-01-15" or null, "confidence": 0.95},
  "nationality": {"value": "UAE" or null, "confidence": 0.85}
}

If you cannot find a field, return null for value and set confidence to 0.0.`;

        const response = await openaiConfig.client.chat.completions.create({
            model: openaiConfig.model,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: 1500,
            response_format: { type: 'json_object' },
            temperature: 0.1, // Lower temperature for more consistent extraction
        });

        const responseContent = response.choices[0].message.content;
        logger.info('OpenAI API response received', {
            responseLength: responseContent.length,
            responsePreview: responseContent.substring(0, 300)
        });

        const extractedData = JSON.parse(responseContent);

        // Validate and normalize extracted data
        if (extractedData.idNumber?.value) {
            // Remove spaces, dashes, and other non-digit characters from ID number
            extractedData.idNumber.value = extractedData.idNumber.value.replace(/[^\d]/g, '');
        }

        logger.info('Emirates ID extraction completed (text)', {
            extractedFields: Object.keys(extractedData),
            hasIdNumber: !!extractedData.idNumber?.value,
            hasName: !!extractedData.name?.value,
            extractedData
        });

        return extractedData;
    } catch (error) {
        logger.error('Error extracting Emirates ID data from text', {
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Failed to extract Emirates ID data: ${error.message}`);
    }
};

/**
 * Extract data from Passport document text
 * @param {string} text - Extracted text from PDF
 * @returns {Promise<Object>} Extracted data with confidence scores
 */
export const extractPassportFromText = async (text) => {
    try {
        // Log text preview for debugging
        const textPreview = text.substring(0, 500);
        logger.info('Extracting Passport from text', {
            textLength: text.length,
            textPreview
        });

        const prompt = `Analyze this Passport document text and extract the following information. Return a JSON object with the exact structure below.

IMPORTANT INSTRUCTIONS:
- The text may contain OCR artifacts, extra spaces, line breaks, or formatting issues
- Look for patterns even if text is malformed (e.g., "P@SSP0RT" instead of "PASSPORT", extra spaces)
- The Machine Readable Zone (MRZ) appears as lines with "<" characters - extract passport number from there if available
- Dates may appear in various formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.) - normalize to YYYY-MM-DD
- If a field is not found or unclear, set its value to null (not empty string) and confidence to 0.0
- Handle text in both English and Arabic - extract English names when available
- Passport numbers can be alphanumeric (e.g., "A1234567", "123456789", "AB123456")

Document Text:
${text}

CRITICAL: The Passport number is the most important field. Look for:
- Fields labeled "Passport No", "Passport Number", "Document Number", "P No", "رقم الجواز"
- Machine Readable Zone (MRZ) lines that start with "P<" or contain "<" characters
- Alphanumeric codes (letters and numbers combined, typically 6-9 characters)
- Numbers near labels like "Passport", "Document", "جواز"
- Extract the complete passport number exactly as shown (preserve letters and numbers)

Required fields:
- name (string): Full name as shown on passport (surname and given names). Handle multiple name formats.
- passportNumber (string): Passport number - the complete passport/document number (this is critical, extract it accurately from MRZ or passport number field)
- issueDate (string): Issue date in YYYY-MM-DD format (convert from any date format found)
- expiryDate (string): Expiry date in YYYY-MM-DD format (convert from any date format found)
- nationality (string): Nationality (3-letter country code if available, can be null)
- dateOfBirth (string): Date of birth in YYYY-MM-DD format (if visible, can be null)

Return JSON format (use null for missing values, not empty strings):
{
  "name": {"value": "JOHN DOE" or null, "confidence": 0.98},
  "passportNumber": {"value": "A1234567" or null, "confidence": 0.98},
  "issueDate": {"value": "2020-01-15" or null, "confidence": 0.95},
  "expiryDate": {"value": "2030-01-15" or null, "confidence": 0.95},
  "nationality": {"value": "USA" or null, "confidence": 0.90},
  "dateOfBirth": {"value": "1990-05-20" or null, "confidence": 0.85}
}

If you cannot find a field, return null for value and set confidence to 0.0.`;

        const response = await openaiConfig.client.chat.completions.create({
            model: openaiConfig.model,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: 1500,
            response_format: { type: 'json_object' },
            temperature: 0.1, // Lower temperature for more consistent extraction
        });

        const responseContent = response.choices[0].message.content;
        logger.info('OpenAI API response received', {
            responseLength: responseContent.length,
            responsePreview: responseContent.substring(0, 300)
        });

        const extractedData = JSON.parse(responseContent);

        logger.info('Passport extraction completed (text)', {
            extractedFields: Object.keys(extractedData),
            hasPassportNumber: !!extractedData.passportNumber?.value,
            hasName: !!extractedData.name?.value,
            extractedData
        });

        return extractedData;
    } catch (error) {
        logger.error('Error extracting Passport data from text', {
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Failed to extract Passport data: ${error.message}`);
    }
};

