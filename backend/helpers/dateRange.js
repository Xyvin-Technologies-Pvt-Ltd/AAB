/**
 * Asia/Dubai date utilities for filters, storage, and display alignment.
 * Uses ISO offset +04:00 (Dubai has no DST).
 */

export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Dubai';
const DUBAI_OFFSET = '+04:00';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const dubaiDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dubaiPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

/**
 * Normalize input to YYYY-MM-DD in Dubai calendar.
 */
export const toDateString = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && DATE_ONLY_REGEX.test(value)) {
    return value;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return dubaiDateFormatter.format(date);
};

/**
 * Start of calendar day in Dubai.
 */
export const startOfDay = (dateStr) => {
  const normalized = toDateString(dateStr);
  if (!normalized) return null;
  return new Date(`${normalized}T00:00:00.000${DUBAI_OFFSET}`);
};

/**
 * End of calendar day in Dubai.
 */
export const endOfDay = (dateStr) => {
  const normalized = toDateString(dateStr);
  if (!normalized) return null;
  return new Date(`${normalized}T23:59:59.999${DUBAI_OFFSET}`);
};

/**
 * Parse date-only form values as Dubai midnight (for storage).
 */
export const parseCalendarDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : startOfDay(toDateString(value));
  }
  if (typeof value === 'string' && DATE_ONLY_REGEX.test(value)) {
    return startOfDay(value);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(toDateString(parsed));
};

/**
 * Build MongoDB date range query bounds in Dubai.
 */
export const buildDateRangeQuery = (startDate, endDate) => {
  const range = {};
  if (startDate) {
    range.$gte = startOfDay(startDate);
  }
  if (endDate) {
    range.$lte = endOfDay(endDate);
  }
  return range;
};

/**
 * Current instant (alias for clarity at call sites).
 */
export const nowInDubai = () => new Date();

/**
 * Start of today in Dubai.
 */
export const startOfToday = () => startOfDay(toDateString(new Date()));

/**
 * Calendar parts in Dubai timezone.
 */
export const getDubaiDateParts = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = dubaiPartsFormatter.formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);

  return {
    year: get('year'),
    month: get('month') - 1,
    day: get('day'),
  };
};

/**
 * Days in a calendar month (1-indexed month).
 */
export const getDaysInMonth = (year, monthIndex) =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/**
 * Inclusive calendar days between two date strings in Dubai.
 */
export const getInclusiveDaysInRange = (startDate, endDate) => {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  if (!start || !end || end < start) return 0;

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end - start) / msPerDay) + 1;
};

/**
 * Prorate monthly cost by inclusive Dubai calendar days in range.
 */
export const getProratedPeriodCost = (monthlyCost, startDate, endDate) => {
  if (!monthlyCost || !startDate || !endDate) return monthlyCost || 0;

  let total = 0;
  let cursor = startOfDay(startDate);
  const end = endOfDay(endDate);

  while (cursor <= end) {
    const parts = getDubaiDateParts(cursor);
    const daysInMonth = getDaysInMonth(parts.year, parts.month);
    total += monthlyCost / daysInMonth;

    const nextDayStr = toDateString(new Date(cursor.getTime() + 24 * 60 * 60 * 1000));
    cursor = startOfDay(nextDayStr);
  }

  return total;
};

/**
 * Signed calendar-day difference: target - reference (in Dubai).
 */
export const daysBetweenDubai = (target, reference = new Date()) => {
  const targetStart = startOfDay(toDateString(target));
  const referenceStart = startOfDay(toDateString(reference));
  if (!targetStart || !referenceStart) return 0;

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((targetStart - referenceStart) / msPerDay);
};

/**
 * First day of month in Dubai for a given date string or Date.
 */
export const startOfMonth = (value) => {
  const parts = getDubaiDateParts(value instanceof Date ? value : parseCalendarDate(value) || value);
  if (!parts) return null;
  const monthStr = String(parts.month + 1).padStart(2, '0');
  return startOfDay(`${parts.year}-${monthStr}-01`);
};

/**
 * Last moment of month in Dubai.
 */
export const endOfMonth = (value) => {
  const parts = getDubaiDateParts(value instanceof Date ? value : parseCalendarDate(value) || value);
  if (!parts) return null;
  const daysInMonth = getDaysInMonth(parts.year, parts.month);
  const monthStr = String(parts.month + 1).padStart(2, '0');
  const dayStr = String(daysInMonth).padStart(2, '0');
  return endOfDay(`${parts.year}-${monthStr}-${dayStr}`);
};
