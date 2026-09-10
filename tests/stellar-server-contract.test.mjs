import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = readFileSync('server/src/modules/stellar/routes.ts', 'utf8');
const schemas = readFileSync('server/src/modules/stellar/schemas.ts', 'utf8');
const service = readFileSync('server/src/modules/stellar/service.ts', 'utf8');
const server = readFileSync('server/src/server.ts', 'utf8');
const shared = readFileSync('packages/types/src/stellar-transactions.ts', 'utf8');

test('Stellar endpoints require authenticated wallet ownership', () => {
  for (const endpoint of ['/api/stellar/capabilities', '/api/stellar/me/summary', '/api/stellar/me/activity', '/api/stellar/intents/quote', '/api/stellar/intents/:id/submit', '/api/stellar/intents/:id']) {
    assert.match(routes, new RegExp(endpoint.replaceAll('/', '\\/').replace(':id', ':id')));
  }
  assert.match(routes, /requireAuthUser/);
  assert.match(server, /registerStellarRoutes/);
  assert.match(service, /intent\.sourcePublicKey !== source/);
});

test('quote input is discriminated and bounded', () => {
  assert.match(schemas, /discriminatedUnion\('operationType'/);
  assert.match(schemas, /PAYMENT/);
  assert.match(schemas, /CHANGE_TRUST/);
  assert.match(schemas, /PATH_PAYMENT_STRICT_SEND/);
  assert.match(schemas, /slippageBps: z\.number\(\)\.int\(\)\.min\(1\)\.max\(500\)/);
  assert.match(schemas, /Buffer\.byteLength/);
  assert.match(schemas, /idempotencyKeySchema/);
});

test('server persists before signing and accepts only matching locally signed XDR', () => {
  assert.match(service, /createQuotedIntent/);
  assert.match(service, /Buffer\.from\(unsigned\.hash\(\)\)\.equals\(Buffer\.from\(signed\.hash\(\)\)\)/);
  assert.match(service, /publicKey\.verify\(signed\.hash\(\), signature\.signature\)/);
  assert.match(service, /claimIntentForExecution/);
  assert.match(service, /recordSubmittedIntent/);
  assert.match(service, /requireNativeSpendable\(account, sendAmount\)/);
  assert.match(service, /trustline cannot be removed while it has a balance or liabilities/);
  assert.doesNotMatch(service, /fromSecret/);
});

test('capabilities are honest about disabled providers and simulated yield', () => {
  assert.match(shared, /yield: 'SIMULATION_ONLY'/);
  assert.match(shared, /binance: 'DISABLED'/);
  assert.match(shared, /cctp: 'DISABLED'/);
  assert.match(shared, /mainnet: 'DISABLED'/);
});
