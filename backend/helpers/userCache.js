/**
 * Shared TTL cache for the authenticated-user lookup that runs on every
 * request (middlewares/auth.js). Avoids a DB round trip + Mongoose
 * hydration per request for a document that changes rarely.
 *
 * Backed by Redis so multiple backend instances agree on a user's
 * active/role state (a deactivated user loses access everywhere, not just
 * on the instance that handled the deactivation). If Redis is unset or
 * unreachable, every call below no-ops/misses and auth.js simply falls back
 * to a normal DB lookup per request - slower, but never incorrect.
 *
 * TTL is kept short (30s) because a role/isActive change should propagate
 * quickly - e.g. a deactivated user should lose API access promptly, not
 * just at their next login. invalidateCachedUser() also lets writers drop a
 * user immediately instead of waiting out the TTL.
 */

import { getRedisClient, isRedisReady } from '../config/redis.js';
import logger from './logger.js';

const TTL_SECONDS = 30;
const KEY_PREFIX = `${process.env.CACHE_KEY_PREFIX || 'aac'}:auth:user:`;

const keyFor = (userId) => `${KEY_PREFIX}${userId}`;

/**
 * @param {string} userId
 * @returns {Promise<object|null>} cached lean user doc, or null on miss/expiry/unavailable
 */
export const getCachedUser = async (userId) => {
  if (!isRedisReady()) return null;
  try {
    const raw = await getRedisClient().get(keyFor(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.warn(`userCache get failed for user ${userId}: ${error.message}`);
    return null;
  }
};

/**
 * @param {string} userId
 * @param {object} user - lean user doc (already excludes password)
 */
export const setCachedUser = async (userId, user) => {
  if (!isRedisReady()) return;
  try {
    await getRedisClient().set(keyFor(userId), JSON.stringify(user), { EX: TTL_SECONDS });
  } catch (error) {
    logger.warn(`userCache set failed for user ${userId}: ${error.message}`);
  }
};

/**
 * Drop a user from the cache immediately - call this after any write that
 * changes role/isActive/employeeId so the next request sees it right away
 * instead of waiting out the TTL.
 * @param {string} userId
 */
export const invalidateCachedUser = async (userId) => {
  if (!isRedisReady()) return;
  const id = userId?.toString?.() ?? userId;
  try {
    await getRedisClient().del(keyFor(id));
  } catch (error) {
    logger.warn(`userCache invalidate failed for user ${id}: ${error.message}`);
  }
};
