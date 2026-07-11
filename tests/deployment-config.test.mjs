import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('frontend removes trailing slashes from the configured API base URL', () => {
  const walletApi = readFileSync('apps/web/app/lib/wallet-auth-api.ts', 'utf8');
  const session = readFileSync('apps/web/app/(app)/dashboard/_lib/session.ts', 'utf8');

  assert.equal(walletApi.includes(".replace(/\\/+$/, '')"), true);
  assert.equal(session.includes(".replace(/\\/+$/, '')"), true);
});

test('backend supports an explicit list of allowed production origins', () => {
  const server = readFileSync('server/src/server.ts', 'utf8');

  assert.match(server, /AUTH_ALLOWED_ORIGINS/);
  assert.match(server, /split\(','\)/);
  assert.match(server, /allowedOrigins\.includes\(origin\)/);
});

test('production auth cookies work between Vercel and Render', () => {
  const routes = readFileSync('server/src/modules/auth/routes.ts', 'utf8');

  assert.match(routes, /sameSite:\s*config\.secureCookie \? 'none' : 'lax'/);
  assert.match(routes, /secure:\s*config\.secureCookie/);
});
