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

Required fields:
- name (string): Full name as shown on ID
- idNumber (string): Emirates ID number
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

        const extractedData = JSON.parse(response.choices[0].message.content);
        logger.info('Emirates ID extraction completed', { confidence: extractedData });
        return extractedData;
    } catch (error) {
        logger.error('Error extracting Emirates ID data', { error: error.message });
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

Required fields:
- name (string): Full name as shown on passport
- passportNumber (string): Passport number
- issueDate (string): Issue date in YYYY-MM-DD format
- expiryDate (string): Expiry date in YYYY-MM-DD format
- nationality (string): Nationality
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

        const extractedData = JSON.parse(response.choices[0].message.content);
        logger.info('Passport extraction completed', { confidence: extractedData });
        return extractedData;
    } catch (error) {
        logger.error('Error extracting Passport data', { error: error.message });
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
        const prompt = `Analyze this Emirates ID document text and extract the following information. Return a JSON object with the exact structure below.

Document Text:
${text}

Required fields:
- name (string): Full name as shown on ID
- idNumber (string): Emirates ID number
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
        logger.info('Emirates ID extraction completed (text)', { confidence: extractedData });
        return extractedData;
    } catch (error) {
        logger.error('Error extracting Emirates ID data from text', { error: error.message });
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
        const prompt = `Analyze this Passport document text and extract the following information. Return a JSON object with the exact structure below.

Document Text:
${text}

Required fields:
- name (string): Full name as shown on passport
- passportNumber (string): Passport number
- issueDate (string): Issue date in YYYY-MM-DD format
- expiryDate (string): Expiry date in YYYY-MM-DD format
- nationality (string): Nationality
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
        logger.info('Passport extraction completed (text)', { confidence: extractedData });
        return extractedData;
    } catch (error) {
        logger.error('Error extracting Passport data from text', { error: error.message });
        throw new Error(`Failed to extract Passport data: ${error.message}`);
    }
};

