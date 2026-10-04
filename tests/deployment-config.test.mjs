import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('private upstream validates deployment configuration', async () => {
  const { resolveApiBaseUrl } = await import('../apps/web/api-config.ts');
  assert.equal(resolveApiBaseUrl({ API_BASE_URL: 'https://api.example.com///', NODE_ENV: 'production' }), 'https://api.example.com');
  assert.equal(resolveApiBaseUrl({}), 'http://127.0.0.1:4000');
  assert.throws(() => resolveApiBaseUrl({ NODE_ENV: 'production' }), /API_BASE_URL/);
  for (const value of ['garbage', 'ftp://api.example.com', 'https://u:p@api.example.com', 'https://api.example.com/path', 'https://api.example.com?key=x', 'http://api.example.com']) {
    assert.throws(() => resolveApiBaseUrl({ API_BASE_URL: value, NODE_ENV: 'production' }));
  }
  assert.equal(resolveApiBaseUrl({ API_BASE_URL: 'http://127.0.0.1:4000', NODE_ENV: 'production' }), 'http://127.0.0.1:4000');
});

test('browser uses a same-origin proxy, and server rendering uses the private upstream', () => {
  const walletApi = readFileSync('apps/web/app/lib/wallet-auth-api.ts', 'utf8');
  const session = readFileSync('apps/web/app/(app)/dashboard/_lib/session.ts', 'utf8');
  const config = readFileSync('apps/web/next.config.ts', 'utf8');
  assert.match(walletApi, /const API_BASE_URL = '\/backend'/);
  assert.doesNotMatch(walletApi, /NEXT_PUBLIC_API/);
  assert.match(session, /resolveApiBaseUrl/);
  assert.match(config, /source: '\/backend\/:path\*'/);
  assert.match(session, /AbortSignal.timeout/);
});

test('backend supports an explicit list of allowed production origins', () => {
  const server = readFileSync('server/src/server.ts', 'utf8');
  const config = readFileSync('server/src/config.ts', 'utf8');
  const envExample = readFileSync('server/.env.example', 'utf8');

  assert.match(config, /AUTH_ALLOWED_ORIGINS/);
  assert.match(config, /split\(','\)/);
  assert.match(server, /allowedOrigins\.includes\(origin\)/);
  assert.match(envExample, /AUTH_ALLOWED_ORIGINS="http:\/\/127\.0\.0\.1:3010,http:\/\/localhost:3010"/);
  assert.match(envExample, /STELLAR_HORIZON_URL="https:\/\/horizon-testnet\.stellar\.org"/);
  assert.match(envExample, /STELLAR_EMERGENCY_READ_ONLY=false/);
});

test('production auth cookies use same-origin HTTPS sessions', () => {
  const routes = readFileSync('server/src/modules/auth/routes.ts', 'utf8');

  assert.match(routes, /sameSite:\s*'lax'/);
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
