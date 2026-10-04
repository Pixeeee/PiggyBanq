import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(new URL('../server/package.json', import.meta.url));
const { register } = await import(require.resolve('tsx/esm/api'));
register();
const { loadStellarConfig } = await import('../server/src/config.ts');
const startup = await import('../server/src/startup.ts').catch(() => ({}));
const { buildServer } = await import('../server/src/server.ts');
const { prisma } = await import('../server/src/prisma.ts');
const { AUTH_COOKIE_NAME, getAuthConfig } = await import('../server/src/modules/auth/wallet-auth.ts');

test('allowed origins reject URLs that cannot match a browser Origin header', () => {
  for (const origin of ['https://user:password@example.com', 'https://example.com/path', 'https://example.com?x=1', 'https://example.com#fragment']) {
    assert.throws(() => loadStellarConfig({ NODE_ENV: 'production', AUTH_ALLOWED_ORIGINS: origin }), /origin/i, origin);
  }
  assert.deepEqual(loadStellarConfig({ NODE_ENV: 'production', AUTH_ALLOWED_ORIGINS: 'https://EXAMPLE.com:443/' }).webOrigins, ['https://example.com']);
});

test('local environment fills missing values without replacing deployment configuration', () => {
  assert.equal(typeof startup.loadLocalEnv, 'function');
  const directory = mkdtempSync(join(tmpdir(), 'piggybanq-env-'));
  try {
    const path = join(directory, '.env');
    writeFileSync(path, 'PORT=9999\nHOST="127.0.0.1"\nAUTH_DOMAIN=local.test\n');
    const environment = { PORT: '4567', AUTH_DOMAIN: 'deployed.example' };
    startup.loadLocalEnv(pathToFileURL(path), environment);
    assert.deepEqual(environment, { PORT: '4567', AUTH_DOMAIN: 'deployed.example', HOST: '127.0.0.1' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('server listening configuration honors HOST and rejects invalid ports', () => {
  assert.equal(typeof startup.loadListenConfig, 'function');
  assert.deepEqual(startup.loadListenConfig({ HOST: '127.0.0.1', PORT: '4567' }), { host: '127.0.0.1', port: 4567 });
  assert.deepEqual(startup.loadListenConfig({}), { host: '0.0.0.0', port: 4000 });
  for (const port of ['', '0', '-1', '65536', 'NaN', '1.5', '4e3']) {
    assert.throws(() => startup.loadListenConfig({ PORT: port }), /PORT/);
  }
  for (const host of ['', 'https://api.example.com', 'bad host']) {
    assert.throws(() => startup.loadListenConfig({ HOST: host }), /HOST/);
  }
});

test('auth rejects unsafe TTLs and a challenge domain that differs from the application URL', () => {
  const keys = ['AUTH_CHALLENGE_TTL_SECONDS', 'AUTH_SESSION_TTL_SECONDS', 'AUTH_APP_URL', 'AUTH_DOMAIN', 'NODE_ENV'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_APP_URL = 'https://piggybanq.example';
    process.env.AUTH_DOMAIN = 'piggybanq.example';
    for (const [key, values] of [['AUTH_CHALLENGE_TTL_SECONDS', ['0', '-1', 'NaN', '901']], ['AUTH_SESSION_TTL_SECONDS', ['0', '-1', 'Infinity', '2592001']]]) {
      for (const value of values) {
        process.env[key] = value;
        assert.throws(() => getAuthConfig(), new RegExp(key));
      }
      delete process.env[key];
    }
    process.env.AUTH_DOMAIN = 'another.example';
    assert.throws(() => getAuthConfig(), /AUTH_DOMAIN/);
    delete process.env.AUTH_DOMAIN;
    process.env.AUTH_APP_URL = 'http://piggybanq.example';
    assert.throws(() => getAuthConfig(), /AUTH_APP_URL/);
    process.env.AUTH_APP_URL = 'https://user:password@piggybanq.example';
    assert.throws(() => getAuthConfig(), /AUTH_APP_URL/);
    process.env.AUTH_APP_URL = 'https://piggybanq.example';
    const config = getAuthConfig();
    assert.equal(config.domain, 'piggybanq.example');
    assert.equal(config.challengeTtlMs, 300000);
    assert.equal(config.sessionTtlMs, 604800000);
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test('readiness checks the database while liveness stays available during a database outage', async () => {
  const query = prisma.$queryRaw;
  let databaseAvailable = false;
  prisma.$queryRaw = async () => {
    if (!databaseAvailable) throw new Error('Database offline');
    return [{ '?column?': 1 }];
  };
  const server = buildServer();
  try {
    assert.equal((await server.inject('/health')).statusCode, 200);
    const unavailable = await server.inject('/ready');
    assert.equal(unavailable.statusCode, 503);
    assert.equal(unavailable.json().ok, false);
    databaseAvailable = true;
    const available = await server.inject('/ready');
    assert.equal(available.statusCode, 200);
    assert.equal(available.json().ok, true);
    assert.match(available.headers['cache-control'], /no-store/);
  } finally {
    await server.close();
    prisma.$queryRaw = query;
  }
});

test('suspension denies existing sessions and prevents creating login challenges', async () => {
  const sessionLookup = prisma.session.findUnique;
  const userLookup = prisma.user.findUnique;
  const sessionUpdate = prisma.session.update;
  const challengeCreate = prisma.walletAuthChallenge.create;
  const publicKey = 'GCVGERXCFVEQD3KFZPDMFEUWT553QO3HLHP6XXZX2BR2N7A46EGRBROG';
  const user = { id: 'suspended', username: 'suspended', stellarPublicKey: publicKey, displayName: 'Suspended', email: null, role: 'USER', status: 'SUSPENDED', lastLoginAt: null };
  prisma.session.findUnique = async () => ({ id: 'session', revokedAt: null, expiresAt: new Date(Date.now() + 60000), user });
  prisma.user.findUnique = async () => user;
  prisma.session.update = async () => { throw new Error('Suspended sessions must not be refreshed'); };
  prisma.walletAuthChallenge.create = async () => { throw new Error('Suspended users must not receive login challenges'); };
  const server = buildServer();
  try {
    for (const url of ['/api/auth/me', '/api/stellar/capabilities']) {
      const response = await server.inject({ url, cookies: { [AUTH_COOKIE_NAME]: 'test-session-token' } });
      assert.equal(response.statusCode, 403, url);
      assert.equal(response.json().error.code, 'ACCOUNT_SUSPENDED');
      assert.match(response.headers['cache-control'], /private.*no-store/);
    }
    const challenge = await server.inject({ method: 'POST', url: '/api/auth/stellar/challenge', payload: { publicKey, purpose: 'LOGIN', network: 'TESTNET' } });
    assert.equal(challenge.statusCode, 403);
    assert.equal(challenge.json().error.code, 'ACCOUNT_SUSPENDED');
  } finally {
    await server.close();
    prisma.session.findUnique = sessionLookup;
    prisma.user.findUnique = userLookup;
    prisma.session.update = sessionUpdate;
    prisma.walletAuthChallenge.create = challengeCreate;
  }
});
