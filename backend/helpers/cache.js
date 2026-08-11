import crypto from 'crypto';
import { getRedisClient, isRedisReady } from '../config/redis.js';
import logger from './logger.js';

const PREFIX = process.env.CACHE_KEY_PREFIX || 'aac';
const DEFAULT_TTL_SECONDS = parseInt(process.env.CACHE_DEFAULT_TTL_SECONDS || '60', 10);
// Escape hatch to disable response caching without touching REDIS_URL
// (e.g. to rule out caching while debugging data-freshness issues).
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';

const versionKey = (tag) => `${PREFIX}:ver:${tag}`;

/**
 * Current version number for a cache tag. Every cache key embeds this, so a
 * write that calls invalidateTags([tag]) makes all previously-issued keys
 * for that tag unreachable without deleting anything.
 */
export const getTagVersion = async (tag) => {
  if (!isRedisReady()) return 0;
  try {
    const value = await getRedisClient().get(versionKey(tag));
    return value ? parseInt(value, 10) || 0 : 0;
  } catch (error) {
    logger.warn(`Cache getTagVersion failed for "${tag}": ${error.message}`);
    return 0;
  }
};

export const getTagVersions = async (tags = []) => Promise.all(tags.map(getTagVersion));

/**
 * Bump the version of one or more cache tags, invalidating every cached GET
 * response that depends on them. Call this after any successful write.
 * Safe to call even when Redis is down/unset - it's a no-op.
 */
export const invalidateTags = async (tags = []) => {
  if (!isRedisReady() || tags.length === 0) return;
  const uniqueTags = [...new Set(tags)];
  const client = getRedisClient();
  await Promise.all(
    uniqueTags.map((tag) =>
      client.incr(versionKey(tag)).catch((error) => {
        logger.warn(`Cache invalidateTags failed for "${tag}": ${error.message}`);
      })
    )
  );
};

const hashKeyParts = (parts) => {
  let raw;
  try {
    raw = JSON.stringify(parts);
  } catch {
    raw = String(parts);
  }
  return crypto.createHash('sha1').update(raw).digest('hex');
};

/**
 * @param {object} params
 * @param {string} params.routeTag - stable identifier for the route (e.g. its path)
 * @param {number[]} params.versions - current versions of the route's cache tags, in order
 * @param {string} [params.scope] - extra segment (role/userId) to keep responses from leaking across users
 * @param {object} [params.keyParts] - request-derived data (query/params) that affects the response body
 */
export const buildCacheKey = ({ routeTag, versions, scope, keyParts }) => {
  const hash = hashKeyParts(keyParts || {});
  return `${PREFIX}:route:${routeTag}:v${versions.join('.')}:${scope || 'shared'}:${hash}`;
};

export const cacheGet = async (key) => {
  if (!isRedisReady()) return undefined;
  try {
    const value = await getRedisClient().get(key);
    return value ? JSON.parse(value) : undefined;
  } catch (error) {
    logger.warn(`Cache get failed for key "${key}": ${error.message}`);
    return undefined;
  }
};

export const cacheSet = async (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  if (!isRedisReady()) return;
  try {
    await getRedisClient().set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    logger.warn(`Cache set failed for key "${key}": ${error.message}`);
  }
};

export const cacheDel = async (key) => {
  if (!isRedisReady()) return;
  try {
    await getRedisClient().del(key);
  } catch (error) {
    logger.warn(`Cache del failed for key "${key}": ${error.message}`);
  }
};

export const isCacheEnabled = () => CACHE_ENABLED;
export const defaultTtlSeconds = DEFAULT_TTL_SECONDS;
