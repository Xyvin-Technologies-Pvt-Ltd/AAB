// Verifies that every caching code path is a safe no-op when Redis was never
// connected (REDIS_URL unset) - this is the "Redis outage fallback" case,
// since a dropped connection looks the same to callers as never having
// connected: isRedisReady() simply reads false.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRedisReady } from '../config/redis.js';
import { cacheGet, cacheSet, getTagVersion, invalidateTags } from '../helpers/cache.js';
import { getCachedUser, setCachedUser, invalidateCachedUser } from '../helpers/userCache.js';
import { cacheRoute } from '../middlewares/cache.js';
import { CACHE_TAGS } from '../helpers/cacheTags.js';

test('isRedisReady() is false when Redis was never connected', () => {
  assert.equal(isRedisReady(), false);
});

test('cacheGet/cacheSet/getTagVersion no-op without throwing when Redis is down', async () => {
  await assert.doesNotReject(async () => {
    const value = await cacheGet('any-key');
    assert.equal(value, undefined);
    await cacheSet('any-key', { hello: 'world' });
    const version = await getTagVersion(CACHE_TAGS.CLIENTS);
    assert.equal(version, 0);
    await invalidateTags([CACHE_TAGS.CLIENTS]);
  });
});

test('userCache no-ops without throwing when Redis is down', async () => {
  await assert.doesNotReject(async () => {
    const user = await getCachedUser('user-123');
    assert.equal(user, null);
    await setCachedUser('user-123', { id: 'user-123', role: 'ADMIN' });
    await invalidateCachedUser('user-123');
  });
});

test('cacheRoute middleware falls through to next() without touching res when Redis is down', async () => {
  const middleware = cacheRoute([CACHE_TAGS.CLIENTS], { ttl: 60 });
  const req = { baseUrl: '/api/clients', path: '/', route: { path: '/' }, query: {}, params: {}, user: { id: 'u1', role: 'ADMIN' } };
  let jsonCalled = false;
  const res = {
    json: () => {
      jsonCalled = true;
    },
    set: () => {},
    status: () => res,
  };

  let nextCalled = false;
  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(jsonCalled, false);
  // res.json must be untouched (no monkey-patching) when caching is skipped.
  assert.equal(typeof res.json, 'function');
});
