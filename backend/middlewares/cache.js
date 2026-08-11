import { buildCacheKey, cacheGet, cacheSet, getTagVersions, isCacheEnabled } from '../helpers/cache.js';
import { isRedisReady } from '../config/redis.js';
import logger from '../helpers/logger.js';

/**
 * Cache-aside middleware for GET routes, backed by Redis. Falls through to
 * the normal controller (no caching) whenever Redis is disabled/unreachable,
 * so it never changes correctness - only response latency.
 *
 * @param {string[]} tags - cache tags this route's data depends on. Any
 *   invalidateTags() call anywhere in the app for one of these tags makes
 *   this route recompute on the next request.
 * @param {object} [options]
 * @param {number} [options.ttl] - seconds to cache the response for
 * @param {boolean} [options.scopeByUser=false] - fold req.user.id into the
 *   cache key; required for per-user data (e.g. notifications) so users
 *   never see each other's cached responses
 * @param {boolean} [options.scopeByRole=true] - fold req.user.role into the
 *   cache key; most endpoints here shape their response based on role/RBAC
 * @param {(req) => object} [options.keyParts] - override what request data
 *   is hashed into the key (defaults to { query, params })
 */
export const cacheRoute = (tags, options = {}) => {
  const { ttl, scopeByUser = false, scopeByRole = true, keyParts } = options;

  return async (req, res, next) => {
    if (!isCacheEnabled() || !isRedisReady()) return next();

    try {
      const versions = await getTagVersions(tags);

      const scopeSegments = [];
      if (scopeByRole && req.user?.role) scopeSegments.push(req.user.role);
      if (scopeByUser && req.user?.id) scopeSegments.push(req.user.id);

      const key = buildCacheKey({
        routeTag: `${req.baseUrl}${req.route?.path || req.path}`,
        versions,
        scope: scopeSegments.join(':') || undefined,
        keyParts: keyParts ? keyParts(req) : { query: req.query, params: req.params },
      });

      const cached = await cacheGet(key);
      if (cached !== undefined) {
        res.set('X-Cache', 'HIT');
        return res.status(cached.status).json(cached.body);
      }

      // Intercept the eventual res.json() call (successResponse/errorResponse
      // both funnel through it) to populate the cache on a miss, without
      // requiring every controller to know about caching.
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode < 400) {
          cacheSet(key, { status: res.statusCode, body }, ttl).catch(() => {});
        }
        res.set('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.warn(`cacheRoute middleware error: ${error.message}`);
      next();
    }
  };
};

export default cacheRoute;
