import test from 'node:test';
import assert from 'node:assert/strict';

import { formatStellarAmount, parseStellarAmount } from '../packages/stellar-core/src/amounts.ts';
import { STELLAR_TESTNET_ASSETS, resolveStellarAsset } from '../packages/stellar-core/src/assets.ts';

test('parses Stellar amounts directly into exact seven-decimal units', () => {
  assert.equal(parseStellarAmount('0.0000001'), 1n);
  assert.equal(parseStellarAmount('25.1234567'), 251234567n);
  assert.equal(parseStellarAmount('9007199254740993.1234567'), 90071992547409931234567n);
  assert.equal(formatStellarAmount(251234567n), '25.1234567');
  assert.equal(formatStellarAmount(250000000n), '25.0000000');
});

test('rejects unsafe or invalid financial amount syntax', () => {
  for (const value of ['0', '0.0000000', '-1', '1e2', '1.00000001', '01', '', ' 1']) {
    assert.throws(() => parseStellarAmount(value), /amount/i, value);
  }
  assert.throws(() => parseStellarAmount('1000', { maxUnits: 9999999999n }), /maximum/i);
  assert.throws(() => formatStellarAmount(-1n), /non-negative/i);
});

test('pins the closed Stellar Testnet asset registry', () => {
  assert.deepEqual(resolveStellarAsset('xlm'), STELLAR_TESTNET_ASSETS.XLM);
  assert.equal(STELLAR_TESTNET_ASSETS.XLM.type, 'native');
  assert.equal(STELLAR_TESTNET_ASSETS.XLM.issuer, null);
  assert.equal(STELLAR_TESTNET_ASSETS.USDC.decimals, 7);
  assert.equal(STELLAR_TESTNET_ASSETS.USDC.issuer, 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
  assert.throws(() => resolveStellarAsset('USDT'), /not enabled/i);
});
