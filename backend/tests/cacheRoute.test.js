// Exercises the cacheRoute middleware end-to-end against a real Redis
// instance: miss -> populate -> hit, invalidation, and that responses never
// leak across users/roles for routes scoped that way.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connectRedis, disconnectRedis, isRedisReady } from '../config/redis.js';
import { cacheRoute } from '../middlewares/cache.js';
import { invalidateTags } from '../helpers/cache.js';

before(async () => {
  await connectRedis();
  assert.equal(isRedisReady(), true, 'test requires REDIS_URL to point at a reachable Redis instance');
});

after(async () => {
  await disconnectRedis();
});

const makeReqRes = ({ path = '/', params = {}, query = {}, user } = {}) => {
  const req = { baseUrl: '/api/unit-test-route', path, route: { path }, params, query, user };
  const res = {
    statusCode: 200,
    headers: {},
    set(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return { req, res };
};

const runController = (res, body) => {
  // Mimics a controller calling successResponse(res, 200, ..., body).
  res.status(200).json({ success: true, data: body });
};

test('first request is a MISS and populates the cache; second request is a HIT with the same body', async () => {
  const tag = `unit-test-route-tag-${Date.now()}`;
  const middleware = cacheRoute([tag], { ttl: 30 });
  let controllerCalls = 0;

  const { req: req1, res: res1 } = makeReqRes({ user: { id: 'u1', role: 'ADMIN' } });
  await middleware(req1, res1, () => {
    controllerCalls += 1;
    runController(res1, { count: controllerCalls });
  });
  assert.equal(res1.headers['X-Cache'], 'MISS');
  assert.deepEqual(res1.body, { success: true, data: { count: 1 } });

  const { req: req2, res: res2 } = makeReqRes({ user: { id: 'u1', role: 'ADMIN' } });
  await middleware(req2, res2, () => {
    controllerCalls += 1;
    runController(res2, { count: controllerCalls });
  });
  assert.equal(res2.headers['X-Cache'], 'HIT');
  // Body comes from the cache, not a second controller call - count stays 1.
  assert.deepEqual(res2.body, { success: true, data: { count: 1 } });
  assert.equal(controllerCalls, 1);
});

test('invalidateTags() forces the next request to miss and recompute', async () => {
  const tag = `unit-test-route-invalidate-${Date.now()}`;
  const path = `/invalidate-${Date.now()}`;
  const middleware = cacheRoute([tag], { ttl: 30 });
  let controllerCalls = 0;

  const { req: req1, res: res1 } = makeReqRes({ path, user: { id: 'u1', role: 'ADMIN' } });
  await middleware(req1, res1, () => {
    controllerCalls += 1;
    runController(res1, { count: controllerCalls });
  });
  assert.equal(res1.headers['X-Cache'], 'MISS');

  await invalidateTags([tag]);

  const { req: req2, res: res2 } = makeReqRes({ path, user: { id: 'u1', role: 'ADMIN' } });
  await middleware(req2, res2, () => {
    controllerCalls += 1;
    runController(res2, { count: controllerCalls });
  });
  assert.equal(res2.headers['X-Cache'], 'MISS');
  assert.equal(controllerCalls, 2);
});

test('scopeByUser keeps two different users from ever seeing each other\'s cached response', async () => {
  const tag = `unit-test-route-scope-user-${Date.now()}`;
  const middleware = cacheRoute([tag], { ttl: 30, scopeByUser: true });

  const { req: reqA, res: resA } = makeReqRes({ user: { id: 'user-a', role: 'EMPLOYEE' } });
  await middleware(reqA, resA, () => runController(resA, { owner: 'user-a' }));

  const { req: reqB, res: resB } = makeReqRes({ user: { id: 'user-b', role: 'EMPLOYEE' } });
  await middleware(reqB, resB, () => runController(resB, { owner: 'user-b' }));

  assert.equal(resA.headers['X-Cache'], 'MISS');
  assert.equal(resB.headers['X-Cache'], 'MISS'); // different user -> different key, not a false HIT
  assert.deepEqual(resA.body.data, { owner: 'user-a' });
  assert.deepEqual(resB.body.data, { owner: 'user-b' });
});

test('role is folded into the cache key by default, so ADMIN vs EMPLOYEE never share a response', async () => {
  const tag = `unit-test-route-scope-role-${Date.now()}`;
  const path = `/scope-role-${Date.now()}`;
  const middleware = cacheRoute([tag], { ttl: 30 });

  const { req: reqAdmin, res: resAdmin } = makeReqRes({ path, user: { id: 'shared-route', role: 'ADMIN' } });
  await middleware(reqAdmin, resAdmin, () => runController(resAdmin, { view: 'admin-view' }));

  const { req: reqEmployee, res: resEmployee } = makeReqRes({ path, user: { id: 'shared-route', role: 'EMPLOYEE' } });
  await middleware(reqEmployee, resEmployee, () => runController(resEmployee, { view: 'employee-view' }));

  assert.equal(resAdmin.headers['X-Cache'], 'MISS');
  assert.equal(resEmployee.headers['X-Cache'], 'MISS');
  assert.deepEqual(resAdmin.body.data, { view: 'admin-view' });
  assert.deepEqual(resEmployee.body.data, { view: 'employee-view' });
});

test('error responses (status >= 400) are never cached', async () => {
  const tag = `unit-test-route-error-${Date.now()}`;
  const path = `/error-${Date.now()}`;
  const middleware = cacheRoute([tag], { ttl: 30 });
  let controllerCalls = 0;

  const { req: req1, res: res1 } = makeReqRes({ path, user: { id: 'u1', role: 'ADMIN' } });
  await middleware(req1, res1, () => {
    controllerCalls += 1;
    res1.status(404).json({ success: false, message: 'Not found' });
  });
  assert.equal(res1.headers['X-Cache'], 'MISS');

  const { req: req2, res: res2 } = makeReqRes({ path, user: { id: 'u1', role: 'ADMIN' } });
  await middleware(req2, res2, () => {
    controllerCalls += 1;
    res2.status(404).json({ success: false, message: 'Not found' });
  });
  // Still a MISS the second time - a 404 must never poison the cache for a
  // resource that could legitimately exist moments later.
  assert.equal(res2.headers['X-Cache'], 'MISS');
  assert.equal(controllerCalls, 2);
});
