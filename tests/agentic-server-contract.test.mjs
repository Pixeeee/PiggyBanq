import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('server registers authenticated agentic intent routes', () => {
  const server = readFileSync('server/src/server.ts', 'utf8');
  const routes = readFileSync('server/src/modules/agentic/routes.ts', 'utf8');

  assert.match(server, /registerAgenticRoutes\(server\)/);
  assert.match(routes, /\/agentic\/capabilities/);
  assert.match(routes, /\/agentic\/intents\/preview/);
  assert.match(routes, /\/agentic\/intents\/:id\/approve/);
  assert.match(routes, /\/agentic\/intents\/:id\/execute/);
  assert.match(routes, /requireAuthUser/);
  assert.match(routes, /z\.object/);
  assert.match(routes, /APPROVAL_REQUIRED/);
});

test('schema adds user-owned agent actions and receipts without secret fields', () => {
  const schema = readFileSync('server/prisma/schema.prisma', 'utf8');
  const migration = readFileSync('server/prisma/migrations/20260908123000_agentic_payment_intents/migration.sql', 'utf8');
  const combined = `${schema}\n${migration}`;

  assert.match(schema, /model AgentAction/);
  assert.match(schema, /model ProviderReceipt/);
  assert.match(schema, /agentActions\s+AgentAction\[\]/);
  assert.match(migration, /CREATE TABLE "AgentAction"/);
  assert.match(migration, /CREATE TABLE "ProviderReceipt"/);
  assert.doesNotMatch(combined, /mnemonic|secretKey|accessToken|privateKey/i);
});
