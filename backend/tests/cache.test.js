// Exercises helpers/cache.js against a real Redis instance (REDIS_URL must
// point at one - see package.json's "test" script, which starts/stops a
// throwaway redis-server for this). Covers tag versioning/invalidation,
// get/set round-trips, and TTL expiry.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connectRedis, disconnectRedis, isRedisReady } from '../config/redis.js';
import {
  buildCacheKey,
  cacheGet,
  cacheSet,
  getTagVersion,
  getTagVersions,
  invalidateTags,
} from '../helpers/cache.js';

before(async () => {
  await connectRedis();
  assert.equal(isRedisReady(), true, 'test requires REDIS_URL to point at a reachable Redis instance');
});

after(async () => {
  await disconnectRedis();
});

test('getTagVersion starts at 0 for an unused tag', async () => {
  const version = await getTagVersion('unit-test-fresh-tag');
  assert.equal(version, 0);
});

test('invalidateTags bumps the version for every tag it is given', async () => {
  const tag = `unit-test-bump-${Date.now()}`;
  const before1 = await getTagVersion(tag);
  await invalidateTags([tag]);
  const after1 = await getTagVersion(tag);
  assert.equal(after1, before1 + 1);

  await invalidateTags([tag, tag]); // duplicate tags must still only bump once per call
  const after2 = await getTagVersion(tag);
  assert.equal(after2, after1 + 1);
});

test('buildCacheKey changes when versions or keyParts differ, stable otherwise', async () => {
  const keyA = buildCacheKey({ routeTag: '/api/clients', versions: [1], scope: 'ADMIN', keyParts: { query: {} } });
  const keyASame = buildCacheKey({ routeTag: '/api/clients', versions: [1], scope: 'ADMIN', keyParts: { query: {} } });
  const keyDifferentVersion = buildCacheKey({ routeTag: '/api/clients', versions: [2], scope: 'ADMIN', keyParts: { query: {} } });
  const keyDifferentScope = buildCacheKey({ routeTag: '/api/clients', versions: [1], scope: 'EMPLOYEE', keyParts: { query: {} } });
  const keyDifferentQuery = buildCacheKey({ routeTag: '/api/clients', versions: [1], scope: 'ADMIN', keyParts: { query: { page: 2 } } });

  assert.equal(keyA, keyASame);
  assert.notEqual(keyA, keyDifferentVersion);
  assert.notEqual(keyA, keyDifferentScope);
  assert.notEqual(keyA, keyDifferentQuery);
});

test('cacheSet/cacheGet round-trips a JSON-serializable value', async () => {
  const key = `unit-test:roundtrip:${Date.now()}`;
  await cacheSet(key, { status: 200, body: { success: true, data: [1, 2, 3] } }, 30);
  const value = await cacheGet(key);
  assert.deepEqual(value, { status: 200, body: { success: true, data: [1, 2, 3] } });
});

test('cacheGet returns undefined for a key that was never set', async () => {
  const value = await cacheGet(`unit-test:missing:${Date.now()}`);
  assert.equal(value, undefined);
});

test('cacheSet respects its TTL - entry is gone after it expires', async () => {
  const key = `unit-test:ttl:${Date.now()}`;
  await cacheSet(key, { body: 'expires-soon' }, 1);
  assert.deepEqual(await cacheGet(key), { body: 'expires-soon' });

  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert.equal(await cacheGet(key), undefined);
});

test('getTagVersions resolves versions for multiple tags in order', async () => {
  const tagA = `unit-test-multi-a-${Date.now()}`;
  const tagB = `unit-test-multi-b-${Date.now()}`;
  await invalidateTags([tagA]);
  const versions = await getTagVersions([tagA, tagB]);
  assert.equal(versions[0], 1);
  assert.equal(versions[1], 0);
});
