/**
 * Format number as AED currency
 * @param {number} value - The numeric value to format
 * @returns {string} Formatted currency string (e.g., "AED 1,234.56")
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'AED 0.00';
  }

  return `AED ${parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format number as AED currency without the prefix
 * @param {number} value - The numeric value to format
 * @returns {string} Formatted number string (e.g., "1,234.56")
 */
export const formatAmount = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00';
  }

  return parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

