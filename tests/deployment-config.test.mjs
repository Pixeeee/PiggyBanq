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
  const envExample = readFileSync('server/.env.example', 'utf8');

  assert.match(server, /AUTH_ALLOWED_ORIGINS/);
  assert.match(server, /split\(','\)/);
  assert.match(server, /allowedOrigins\.includes\(origin\)/);
  assert.match(envExample, /AUTH_ALLOWED_ORIGINS="http:\/\/127\.0\.0\.1:3010,http:\/\/localhost:3010"/);
  assert.match(envExample, /STELLAR_HORIZON_URL="https:\/\/horizon-testnet\.stellar\.org"/);
  assert.match(envExample, /STELLAR_EMERGENCY_READ_ONLY=false/);
});

test('production auth cookies work between Vercel and Render', () => {
  const routes = readFileSync('server/src/modules/auth/routes.ts', 'utf8');

  assert.match(routes, /sameSite:\s*config\.secureCookie \? 'none' : 'lax'/);
  assert.match(routes, /secure:\s*config\.secureCookie/);
});

test('root scripts expose Expo mobile development commands', () => {
  const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
  const readme = readFileSync('README.md', 'utf8');

  assert.equal(rootPackage.scripts['mobile:dev'], 'pnpm --filter @piggybanq/mobile dev');
  assert.equal(rootPackage.scripts['mobile:web'], 'pnpm --filter @piggybanq/mobile exec expo start --web --port 8087 --host localhost');
  assert.equal(rootPackage.scripts['mobile:android'], 'pnpm --filter @piggybanq/mobile android');
  assert.equal(rootPackage.scripts['mobile:build'], 'pnpm --filter @piggybanq/mobile build');
  assert.match(readme, /npm\.cmd run mobile:web/);
  assert.match(readme, /http:\/\/localhost:8087/);
});
