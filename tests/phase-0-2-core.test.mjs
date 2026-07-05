import test from 'node:test';
import assert from 'node:assert/strict';

import { KYC_FREE_LIMIT_PHP } from '../packages/types/src/kyc.ts';
import {
  applyLedgerEvents,
  createSavingsPocket,
  createPocketLedgerEvent
} from '../packages/types/src/ledger.ts';
import {
  isValidStellarPublicKey,
  maskStellarAddress
} from '../packages/stellar-core/src/address.ts';
import {
  classifyTransactionStatus,
  shouldContinuePolling
} from '../packages/stellar-core/src/polling.ts';
import { createPaymentConfirmation } from '../packages/stellar-core/src/payment-confirmation.ts';
import { requiresTrustline } from '../packages/stellar-core/src/trustline.ts';
import { STELLAR_TESTNET_CONFIG } from '../packages/stellar-core/src/network.ts';

test('uses the configured placeholder KYC-free PHP limit', () => {
  assert.equal(KYC_FREE_LIMIT_PHP, 50_000);
});

test('validates and masks Stellar public keys without revealing full social identity', () => {
  const publicKey = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

  assert.equal(isValidStellarPublicKey(publicKey), true);
  assert.equal(isValidStellarPublicKey('SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'), false);
  assert.equal(maskStellarAddress(publicKey), 'GAAAAA...AAWHF');
});

test('treats pending transactions as incomplete until polling reaches a terminal state', () => {
  assert.equal(classifyTransactionStatus('PENDING'), 'pending');
  assert.equal(classifyTransactionStatus('SUCCESS'), 'success');
  assert.equal(classifyTransactionStatus('FAILED'), 'failed');
  assert.equal(shouldContinuePolling({ status: 'PENDING', attempts: 59, maxAttempts: 60 }), true);
  assert.equal(shouldContinuePolling({ status: 'PENDING', attempts: 60, maxAttempts: 60 }), false);
  assert.equal(shouldContinuePolling({ status: 'SUCCESS', attempts: 3, maxAttempts: 60 }), false);
});

test('builds an explicit confirmation model before a payment can be signed', () => {
  const confirmation = createPaymentConfirmation({
    amount: '125.50',
    assetCode: 'USDC',
    destination: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    estimatedFeeStroops: '100'
  });

  assert.deepEqual(confirmation, {
    amount: '125.50',
    assetCode: 'USDC',
    destination: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    estimatedFeeStroops: '100',
    requiresUserSignature: true,
    network: 'TESTNET'
  });
});

test('requires trustlines for anchored assets and not native XLM', () => {
  assert.equal(requiresTrustline({ assetCode: 'XLM' }), false);
  assert.equal(requiresTrustline({ assetCode: 'native' }), false);
  assert.equal(requiresTrustline({ assetCode: 'USDC', issuer: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' }), true);
});

test('tracks savings pockets through append-only app-layer ledger events', () => {
  const pocket = createSavingsPocket({ id: 'pocket_1', label: 'Emergency Fund', assetCode: 'USDC' });
  const events = [
    createPocketLedgerEvent({ pocketId: pocket.id, amount: '100.00', direction: 'credit' }),
    createPocketLedgerEvent({ pocketId: pocket.id, amount: '25.50', direction: 'debit' })
  ];

  assert.equal(applyLedgerEvents(pocket, events).balance, '74.50');
});

test('pins development Stellar access to testnet endpoints', () => {
  assert.equal(STELLAR_TESTNET_CONFIG.network, 'TESTNET');
  assert.equal(STELLAR_TESTNET_CONFIG.horizonUrl, 'https://horizon-testnet.stellar.org');
  assert.equal(STELLAR_TESTNET_CONFIG.rpcUrl, 'https://soroban-testnet.stellar.org');
});

