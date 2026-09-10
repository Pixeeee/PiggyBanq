import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('schema persists a durable idempotent Stellar transaction state machine', () => {
  const schema = readFileSync('server/prisma/schema.prisma', 'utf8');
  for (const status of ['QUOTED', 'AWAITING_SIGNATURE', 'EXECUTING', 'SUBMITTED', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELLED', 'UNKNOWN']) {
    assert.match(schema, new RegExp(`\\b${status}\\b`));
  }
  assert.match(schema, /model StellarTransactionIntent/);
  assert.match(schema, /@@unique\(\[userId, idempotencyKey\]\)/);
  assert.match(schema, /unsignedBodyHash\s+String/);
  assert.match(schema, /signedXdr\s+String\?/);
  assert.match(schema, /transactionHash\s+String\?/);
});

test('intent store uses conditional execution claims and audit events', () => {
  const path = 'server/src/modules/stellar/intent-store.ts';
  assert.equal(existsSync(path), true);
  const source = readFileSync(path, 'utf8');
  assert.match(source, /createQuotedIntent/);
  assert.match(source, /claimIntentForExecution/);
  assert.match(source, /recordSubmittedIntent/);
  assert.match(source, /recordTerminalIntent/);
  assert.match(source, /findIntentForUser/);
  assert.match(source, /status:\s*'AWAITING_SIGNATURE'/);
  assert.match(source, /status:\s*'EXECUTING'/);
  assert.match(source, /updateMany/);
  assert.match(source, /auditLogEntry\.create/);
  assert.doesNotMatch(source, /secretKey|mnemonic|password/);
});
