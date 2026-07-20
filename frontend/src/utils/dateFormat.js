export const APP_TIMEZONE = 'Asia/Dubai';

const dubaiDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dubaiLongMonthFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIMEZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const dubaiShortFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIMEZONE,
});

const toValidDate = (date) => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Format date to dd/mm/yyyy in Asia/Dubai.
 */
export const formatDateDDMMYYYY = (date) => {
  const d = toValidDate(date);
  if (!d) return '';
  return dubaiDateFormatter.format(d);
};

/**
 * Format date to dd Month year in Asia/Dubai (e.g., "15 January 2024").
 */
export const formatDateDDMonthYear = (date) => {
  const d = toValidDate(date);
  if (!d) return '';
  return dubaiLongMonthFormatter.format(d);
};

/**
 * Standard display format for tables and lists in Asia/Dubai.
 */
export const formatDateForDisplay = (date) => {
  const d = toValidDate(date);
  if (!d) return '';
  return dubaiShortFormatter.format(d);
};

/**
 * Format seconds to H:M:S format (e.g., "01:23:45" or "2h 30m 15s")
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
