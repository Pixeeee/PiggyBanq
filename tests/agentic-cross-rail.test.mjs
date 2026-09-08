import test from 'node:test';
import assert from 'node:assert/strict';

import {
  approveSandboxIntent,
  createSandboxIntentPreview,
  executeSandboxIntent,
  parseAgentCommand
} from '../packages/stellar-core/src/cross-rail.ts';

const NOW = new Date('2026-09-08T02:00:00.000Z');

test('parses the narrow agent command vocabulary', () => {
  assert.deepEqual(parseAgentCommand('Pay 8 USDC to weather-api'), {
    actionType: 'X402_PAYMENT', amount: '8', assetCode: 'USDC', recipient: 'weather-api'
  });
  assert.deepEqual(parseAgentCommand('Swap 25 XLM to USDC'), {
    actionType: 'STELLAR_SWAP', amount: '25', assetCode: 'XLM', outputAssetCode: 'USDC'
  });
  assert.deepEqual(parseAgentCommand('Bridge 12 USDC to Base'), {
    actionType: 'CCTP_BRIDGE', amount: '12', assetCode: 'USDC', destinationNetwork: 'BASE_SEPOLIA'
  });
  assert.throws(() => parseAgentCommand('Trade BTC futures'), /Try “Pay 5 USDC/);
});

test('enforces the local x402 payment policy cap', () => {
  assert.throws(
    () => createSandboxIntentPreview(
      { actionType: 'X402_PAYMENT', amount: '20.01', assetCode: 'USDC', recipient: 'data-service' },
      { now: NOW, id: 'intent_over_cap' }
    ),
    (error) => error?.code === 'POLICY_REJECTED'
  );
});

test('creates an approval-gated Stellar to Base CCTP preview', () => {
  const preview = createSandboxIntentPreview(
    { actionType: 'CCTP_BRIDGE', amount: '12', assetCode: 'USDC', destinationNetwork: 'BASE_SEPOLIA' },
    { now: NOW, id: 'intent_bridge' }
  );

  assert.equal(preview.provider, 'CIRCLE_CCTP');
  assert.equal(preview.sourceNetwork, 'STELLAR_TESTNET');
  assert.equal(preview.destinationNetwork, 'BASE_SEPOLIA');
  assert.equal(preview.sourceDomain, 27);
  assert.equal(preview.destinationDomain, 6);
  assert.equal(preview.status, 'AWAITING_APPROVAL');
  assert.deepEqual(preview.stages, ['BURN_USDC', 'WAIT_FOR_ATTESTATION', 'MINT_USDC']);
});

test('rejects Stellar to BSC USDC because CCTP does not support that route', () => {
  assert.throws(
    () => createSandboxIntentPreview(
      { actionType: 'CCTP_BRIDGE', amount: '10', assetCode: 'USDC', destinationNetwork: 'BSC_TESTNET' },
      { now: NOW, id: 'intent_bsc' }
    ),
    (error) => error?.code === 'UNSUPPORTED_ROUTE'
  );
});

test('requires approval, rejects expired quotes, and creates a sandbox receipt', () => {
  const preview = createSandboxIntentPreview(
    { actionType: 'STELLAR_SWAP', amount: '25', assetCode: 'XLM', outputAssetCode: 'USDC' },
    { now: NOW, id: 'intent_swap' }
  );

  assert.throws(() => executeSandboxIntent(preview, { now: NOW }), (error) => error?.code === 'APPROVAL_REQUIRED');
  assert.throws(
    () => approveSandboxIntent(preview, { now: new Date('2026-09-08T02:06:00.000Z') }),
    (error) => error?.code === 'QUOTE_EXPIRED'
  );

  const approved = approveSandboxIntent(preview, { now: new Date('2026-09-08T02:01:00.000Z') });
  const executed = executeSandboxIntent(approved, { now: new Date('2026-09-08T02:01:02.000Z') });
  assert.equal(executed.intent.status, 'SUCCEEDED');
  assert.equal(executed.receipt.mode, 'SANDBOX');
  assert.match(executed.receipt.externalReference, /^sandbox_/);
});
