import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../server/package.json', import.meta.url));
const { register } = require('tsx/esm/api');
register();
const { prisma } = await import('../server/src/prisma.ts');
const { AUTH_COOKIE_NAME } = await import('../server/src/modules/auth/wallet-auth.ts');

test('SSR session checks bound valid users independently and cannot rotate cookies to bypass limits', async () => {
  const { sessionRateLimitKey } = await import('../server/src/modules/auth/rate-limit.ts');
  const original = prisma.session.findUnique;
  const req = cookie => ({ method: 'GET', url: '/api/auth/me', ip: 'proxy-ip', cookies: { [AUTH_COOKIE_NAME]: cookie } });
  try {
    prisma.session.findUnique = async ({ where }) => ({ revokedAt: null, expiresAt: new Date(Date.now() + 10000), user: { id: where.tokenHash.startsWith('unused') ? 'other' : 'saver', status: 'ACTIVE' } });
    assert.equal(await sessionRateLimitKey(req('a'.repeat(43))), 'user:saver');
    assert.equal(await sessionRateLimitKey(req('b'.repeat(43))), 'user:saver');
    prisma.session.findUnique = async () => ({ revokedAt: null, expiresAt: new Date(Date.now() + 10000), user: { id: 'other', status: 'ACTIVE' } });
    assert.equal(await sessionRateLimitKey(req('c'.repeat(43))), 'user:other');
    prisma.session.findUnique = async () => null;
    assert.equal(await sessionRateLimitKey(req('a'.repeat(43))), 'ip:proxy-ip');
    assert.equal(await sessionRateLimitKey(req('b'.repeat(43))), 'ip:proxy-ip');
    prisma.session.findUnique = async () => ({ revokedAt: new Date(), expiresAt: new Date(Date.now() + 10000), user: { id: 'saver', status: 'ACTIVE' } });
    assert.equal(await sessionRateLimitKey(req('a'.repeat(43))), 'ip:proxy-ip');
    assert.equal(await sessionRateLimitKey({ ...req('a'.repeat(43)), url: '/api/auth/stellar/login', method: 'POST' }), 'ip:proxy-ip');
  } finally { prisma.session.findUnique = original; }
});

test('real API session route gives distinct users independent quotas behind one SSR IP', async () => {
  const { buildServer } = await import('../server/src/server.ts');
  const { sha256 } = await import('../server/src/modules/auth/wallet-auth.ts');
  const prior = process.env.AUTH_RATE_LIMIT_MAX;
  const lookup = prisma.session.findUnique, update = prisma.session.update;
  process.env.AUTH_RATE_LIMIT_MAX = '2';
  const saverHash = sha256('a'.repeat(43));
  prisma.session.findUnique = async ({ where }) => ({ id: where.tokenHash, revokedAt: null, expiresAt: new Date(Date.now() + 100000), user: { id: where.tokenHash === saverHash ? 'saver' : 'other', username: 'release_saver', stellarPublicKey: null, displayName: 'Saver', email: null, role: 'USER', status: 'ACTIVE', lastLoginAt: null } });
  prisma.session.update = async () => ({});
  const server = buildServer();
  try {
    const call = token => server.inject({ method: 'GET', url: '/api/auth/me', remoteAddress: '198.51.100.10', cookies: { [AUTH_COOKIE_NAME]: token.repeat(43) } });
    assert.equal((await call('a')).statusCode, 200);
    assert.equal((await call('a')).statusCode, 200);
    assert.equal((await call('a')).statusCode, 429);
    assert.equal((await call('b')).statusCode, 200);
    assert.equal((await call('b')).statusCode, 200);
    assert.equal((await call('b')).statusCode, 429);
  } finally { await server.close(); prisma.session.findUnique = lookup; prisma.session.update = update; if (prior === undefined) delete process.env.AUTH_RATE_LIMIT_MAX; else process.env.AUTH_RATE_LIMIT_MAX = prior; }
});
