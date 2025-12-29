import { parse } from 'csv-parse/sync';

/**
 * Parse CSV file buffer to array of objects
 * @param {Buffer} fileBuffer - CSV file buffer
 * @returns {Array<Object>} Array of parsed CSV rows as objects
 */
export const parseCSV = (fileBuffer) => {
  try {
    const csvString = fileBuffer.toString('utf-8');
    
    const records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      relax_quotes: true,
    });

    return records;
  } catch (error) {
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
};

/**
 * Normalize and clean CSV row data
 * @param {Object} row - Raw CSV row object
 * @returns {Object} Cleaned row object
 */
export const normalizeCSVRow = (row) => {
  const normalized = {};
  
  for (const [key, value] of Object.entries(row)) {
    // Trim whitespace and handle empty strings
    const cleanedKey = key.trim();
    const cleanedValue = value ? value.trim() : '';
    
    normalized[cleanedKey] = cleanedValue;
  }
  
  return normalized;
};

