/**
 * Format date to dd/mm/yyyy format
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string in dd/mm/yyyy format
 */
export const formatDateDDMMYYYY = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format date to dd Month year format (e.g., "15 January 2024")
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string in dd Month year format
 */
export const formatDateDDMonthYear = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

