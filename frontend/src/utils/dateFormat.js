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

/**
 * Format seconds to H:M:S format (e.g., "01:23:45" or "2h 30m 15s")
 * @param {number} seconds - Total seconds
 * @param {boolean} compact - If true, returns compact format like "2h 30m 15s", otherwise "01:23:45"
 * @returns {string} Formatted time string
 */
export const formatTimeFromSeconds = (seconds, compact = false) => {
  if (!seconds && seconds !== 0) return '0:00:00';

  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (compact) {
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

