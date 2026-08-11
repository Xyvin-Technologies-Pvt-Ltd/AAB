import { createClient } from 'redis';
import logger from '../helpers/logger.js';

// Redis backs two features: the shared auth-user cache (helpers/userCache.js)
// and the API response cache (helpers/cache.js + middlewares/cache.js). Both
// degrade gracefully to their non-cached path (DB lookup / no caching) when
// Redis is unset or unreachable, so a missing REDIS_URL never breaks the app -
// it just runs without the extra caching layer.
let client = null;
let ready = false;

export const connectRedis = async () => {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('REDIS_URL not set - Redis caching is disabled, falling back to direct DB reads');
    return null;
  }

  client = createClient({
    url,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
      connectTimeout: 5000,
    },
  });

  client.on('error', (error) => {
    ready = false;
    logger.error(`Redis client error: ${error.message}`);
  });
  client.on('ready', () => {
    ready = true;
    logger.info('Redis connected');
  });
  client.on('end', () => {
    ready = false;
    logger.warn('Redis connection closed');
  });

  try {
    await client.connect();
  } catch (error) {
    ready = false;
    logger.error(`Redis connection failed, continuing without cache: ${error.message}`);
  }

  return client;
};

export const disconnectRedis = async () => {
  if (client) {
    await client.quit().catch(() => {});
  }
  ready = false;
};

export const getRedisClient = () => client;

// isReady is checked (not just presence of a client) because the socket can
// drop and reconnect at any time; callers must be safe to no-op mid-outage.
export const isRedisReady = () => ready && !!client?.isReady;

export default { connectRedis, disconnectRedis, getRedisClient, isRedisReady };
