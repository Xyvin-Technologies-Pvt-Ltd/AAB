const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Parse and clamp a `limit` query param so a single request can never
 * pull an unbounded number of documents (e.g. ?limit=10000).
 * @param {*} value - raw req.query.limit value
 * @param {number} defaultLimit - fallback when value is missing/invalid
 * @param {number} maxLimit - upper bound
 * @returns {number}
 */
export const parseLimit = (value, defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT) => {
  const parsed = parseInt(value, 10);
  if (!parsed || parsed <= 0) {
    return defaultLimit;
  }
  return Math.min(parsed, maxLimit);
};

/**
 * Parse a `page` query param, defaulting to 1 and rejecting non-positive values.
 * @param {*} value - raw req.query.page value
 * @returns {number}
 */
export const parsePage = (value) => {
  const parsed = parseInt(value, 10);
  return !parsed || parsed <= 0 ? 1 : parsed;
};
