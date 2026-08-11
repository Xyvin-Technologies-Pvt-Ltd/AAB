// Exercises the shared (Redis-backed) auth-user cache against a real Redis
// instance. See tests/cache.test.js for the "no Redis" fallback coverage.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connectRedis, disconnectRedis, isRedisReady } from '../config/redis.js';
import { getCachedUser, setCachedUser, invalidateCachedUser } from '../helpers/userCache.js';

before(async () => {
  await connectRedis();
  assert.equal(isRedisReady(), true, 'test requires REDIS_URL to point at a reachable Redis instance');
});

after(async () => {
  await disconnectRedis();
});

test('getCachedUser returns null on a miss', async () => {
  const user = await getCachedUser(`missing-user-${Date.now()}`);
  assert.equal(user, null);
});

test('setCachedUser followed by getCachedUser round-trips the user doc', async () => {
  const userId = `user-${Date.now()}`;
  const user = { id: userId, role: 'ADMIN', isActive: true };
  await setCachedUser(userId, user);
  const cached = await getCachedUser(userId);
  assert.deepEqual(cached, user);
});

test('invalidateCachedUser removes the entry immediately (no waiting out the TTL)', async () => {
  const userId = `user-${Date.now()}`;
  await setCachedUser(userId, { id: userId, role: 'EMPLOYEE', isActive: true });
  assert.ok(await getCachedUser(userId));

  await invalidateCachedUser(userId);
  assert.equal(await getCachedUser(userId), null);
});

test('two different user ids never collide with each other\'s cached entry', async () => {
  const userA = `user-a-${Date.now()}`;
  const userB = `user-b-${Date.now()}`;
  await setCachedUser(userA, { id: userA, role: 'ADMIN' });
  await setCachedUser(userB, { id: userB, role: 'EMPLOYEE' });

  assert.equal((await getCachedUser(userA)).role, 'ADMIN');
  assert.equal((await getCachedUser(userB)).role, 'EMPLOYEE');
});
