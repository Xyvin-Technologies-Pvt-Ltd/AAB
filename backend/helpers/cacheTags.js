/**
 * Cache tags identify which collections a cached GET response depends on.
 * A write anywhere in the app calls invalidateTags([...]) with the tags it
 * affects; every cache key is built from the *current* version number of
 * each of its tags (see helpers/cache.js), so bumping a tag's version makes
 * every previously cached key for that tag unreachable without a Redis
 * KEYS/SCAN pass. Stale entries simply expire via their TTL.
 */
export const CACHE_TAGS = {
  CLIENTS: 'clients',
  PACKAGES: 'packages',
  TASKS: 'tasks',
  TIME_ENTRIES: 'timeEntries',
  INVOICES: 'invoices',
  EMPLOYEES: 'employees',
  TEAMS: 'teams',
  SERVICES: 'services',
  ACTIVITIES: 'activities',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
};

// Analytics aggregates across every other collection, so any data mutation
// should also invalidate it. Cache reads for analytics routes depend on all
// of these tags too (see analytics.route.js).
export const ALL_DATA_TAGS = Object.values(CACHE_TAGS).filter(
  (tag) => tag !== CACHE_TAGS.ANALYTICS
);
