import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('web emits restrictive browser security headers and externalizes theme bootstrap', () => {
  const config = readFileSync('apps/web/next.config.ts', 'utf8');
  const layout = readFileSync('apps/web/app/layout.tsx', 'utf8');
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /Referrer-Policy/);
  assert.match(config, /Permissions-Policy/);
  assert.equal(existsSync('apps/web/public/theme-init.js'), true);
  assert.match(layout, /src="\/theme-init\.js"/);
  assert.doesNotMatch(layout, /dangerouslySetInnerHTML/);
});

test('API validates mutation origins and redacts wallet material', () => {
  const server = readFileSync('server/src/server.ts', 'utf8');
  assert.match(server, /MUTATION_METHODS/);
  assert.match(server, /request\.headers\.origin/);
  assert.match(server, /ORIGIN_NOT_ALLOWED/);
  assert.match(server, /req\.body\.password/);
  assert.match(server, /req\.body\.signedXdr/);
  assert.match(server, /X-Content-Type-Options/);
});

test('Stellar mutations have scoped rate limits and emergency read-only control', () => {
  const routes = readFileSync('server/src/modules/stellar/routes.ts', 'utf8');
  const service = readFileSync('server/src/modules/stellar/service.ts', 'utf8');
  const config = readFileSync('server/src/config.ts', 'utf8');
  assert.match(routes, /rateLimit/);
  assert.match(routes, /STELLAR_QUOTE_RATE_LIMIT_MAX/);
  assert.match(routes, /STELLAR_SUBMIT_RATE_LIMIT_MAX/);
  assert.match(service, /emergencyReadOnly/);
  assert.match(config, /STELLAR_EMERGENCY_READ_ONLY/);
});

