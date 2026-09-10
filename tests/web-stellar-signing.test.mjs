import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const signing = readFileSync('apps/web/app/lib/stellar-transactions.ts', 'utf8');
const wallet = readFileSync('apps/web/app/(app)/dashboard/secure-wallet.ts', 'utf8');
const api = readFileSync('apps/web/app/lib/wallet-auth-api.ts', 'utf8');

test('browser independently decodes and verifies every reviewed XDR field', () => {
  assert.match(signing, /TransactionBuilder\.fromXDR\(xdr, Networks\.TESTNET\)/);
  assert.match(signing, /transaction\.operations\.length !== 1/);
  assert.match(signing, /transaction\.source !== quote\.review\.source/);
  assert.match(signing, /transaction\.fee !== quote\.review\.feeStroops/);
  assert.match(signing, /transaction\.timeBounds/);
  assert.match(signing, /minimum received amount/i);
  assert.match(signing, /swap path does not match/i);
});

test('signing unlocks the local vault only for the final action', () => {
  assert.match(signing, /unlockWalletAccount\(input\.username, input\.password\)/);
  assert.match(signing, /Keypair\.fromSecret\(vault\.secretKey\)/);
  assert.match(signing, /transaction\.sign\(signer\)/);
  assert.match(wallet, /AES-GCM/);
});

test('Stellar API payloads send signed XDR but never password or secret material', () => {
  assert.match(api, /Idempotency-Key/);
  assert.match(api, /credentials: 'include'/);
  assert.match(api, /AbortController/);
  assert.match(api, /body: \{ signedXdr \}/);
  const submitFunction = api.slice(api.indexOf('export async function submitStellarTransaction'), api.indexOf('export async function getStellarIntent'));
  assert.doesNotMatch(submitFunction, /password|secretKey|mnemonic|recoveryPhrase/);
});

