import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../server/package.json', import.meta.url));
const { register } = await import(require.resolve('tsx/esm/api'));
register();
const { buildServer } = await import('../server/src/server.ts');
const startup = await import('../server/src/startup.ts');

async function withServer(environment, run) {
  const original = Object.fromEntries(Object.keys(environment).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(environment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const server = buildServer();
  try {
    await run(server);
  } finally {
    await server.close();
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('global limiter is active on routes and cookie rotation cannot bypass it', async () => {
  await withServer({ AUTH_RATE_LIMIT_MAX: '2', TRUST_PROXY: undefined }, async server => {
    for (let index = 0; index < 4; index += 1) {
      const response = await server.inject({ url: '/api/auth/me', headers: { cookie: `other_cookie=${index}` } });
      assert.equal(response.statusCode, index < 2 ? 401 : 429);
    }
    // A hosting probe must not use up the application's client quota.
    for (let index = 0; index < 4; index += 1) {
      assert.equal((await server.inject('/health')).statusCode, 200);
    }
    assert.ok([200, 503].includes((await server.inject('/ready')).statusCode));
  });
});

test('authentication challenge route applies its stricter scoped limiter', async () => {
  await withServer({ AUTH_RATE_LIMIT_MAX: '100', TRUST_PROXY: undefined }, async server => {
    for (let index = 0; index < 11; index += 1) {
      const response = await server.inject({ method: 'POST', url: '/api/auth/stellar/challenge', payload: {} });
      assert.equal(response.statusCode, index < 10 ? 400 : 429);
    }
  });
});

test('untrusted forwarding headers cannot split the direct client rate-limit bucket', async () => {
  await withServer({ AUTH_RATE_LIMIT_MAX: '2', TRUST_PROXY: undefined }, async server => {
    for (let index = 0; index < 3; index += 1) {
      const response = await server.inject({ url: '/api/auth/me', remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': `203.0.113.${index + 1}` } });
      assert.equal(response.statusCode, index < 2 ? 401 : 429);
    }
  });
});

test('an explicitly trusted proxy keeps independent forwarded client buckets', async () => {
  await withServer({ AUTH_RATE_LIMIT_MAX: '2', TRUST_PROXY: 'loopback' }, async server => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      for (const address of ['203.0.113.10', '203.0.113.11']) {
        const response = await server.inject({ url: '/api/auth/me', remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': address } });
        assert.equal(response.statusCode, attempt < 2 ? 401 : 429, address);
      }
    }
    // The same configuration must still ignore a header from an untrusted peer.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await server.inject({ url: '/api/auth/me', remoteAddress: '198.51.100.2', headers: { 'x-forwarded-for': `203.0.113.${attempt + 20}` } });
      assert.equal(response.statusCode, attempt < 2 ? 401 : 429);
    }
  });
});

test('proxy trust requires an explicit bounded configuration', () => {
  assert.equal(typeof startup.loadTrustProxy, 'function');
  assert.equal(startup.loadTrustProxy({}), false);
  assert.equal(startup.loadTrustProxy({ TRUST_PROXY: 'false' }), false);
  assert.equal(startup.loadTrustProxy({ TRUST_PROXY: '2' }), 2);
  assert.deepEqual(startup.loadTrustProxy({ TRUST_PROXY: 'loopback,10.0.0.0/8,2001:db8::/32,192.0.2.1' }), ['loopback', '10.0.0.0/8', '2001:db8::/32', '192.0.2.1']);
  for (const value of ['true', '', '0', '17', '1.5', '-1', 'proxy.example.com', '10.0.0.0/99', 'loopback,']) {
    assert.throws(() => startup.loadTrustProxy({ TRUST_PROXY: value }), /TRUST_PROXY/, value);
  }
});

test('oversized request bodies are rejected before schema validation', async () => {
  await withServer({ AUTH_RATE_LIMIT_MAX: '100', TRUST_PROXY: undefined }, async server => {
    const response = await server.inject({ method: 'POST', url: '/api/auth/stellar/challenge',
      payload: { padding: 'x'.repeat(64 * 1024) } });
    assert.equal(response.statusCode, 413);
  });
});
