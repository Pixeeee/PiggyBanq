import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { StellarHorizonAdapter } from '../server/src/modules/stellar/horizon-adapter.ts';
import { loadStellarConfig } from '../server/src/config.ts';

const serverRequire = createRequire(new URL('../server/package.json', import.meta.url));
const { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } = serverRequire('@stellar/stellar-sdk');

const source = Keypair.random().publicKey();
const destination = Keypair.random().publicKey();
const usdcIssuer = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

function config() {
  return loadStellarConfig({
    NODE_ENV: 'test',
    STELLAR_NETWORK: 'TESTNET',
    STELLAR_HORIZON_URL: 'https://horizon-testnet.stellar.org',
    STELLAR_FRIENDBOT_URL: 'https://friendbot.stellar.org',
    AUTH_ALLOWED_ORIGINS: 'http://127.0.0.1:3010'
  });
}

function callBuilder(records) {
  return {
    forAccount() { return this; },
    order() { return this; },
    limit() { return this; },
    transaction() { return this; },
    async call() { return { records }; }
  };
}

test('configuration is fail-closed to Stellar Testnet', () => {
  assert.equal(config().network, 'TESTNET');
  assert.throws(() => loadStellarConfig({ STELLAR_NETWORK: 'PUBLIC' }), /Testnet/);
  assert.throws(() => loadStellarConfig({ STELLAR_NETWORK: 'TESTNET', STELLAR_QUOTE_TTL_SECONDS: '0' }), /STELLAR_QUOTE_TTL_SECONDS/);
});

test('normalizes native and official Testnet USDC balances and liabilities', async () => {
  const fakeServer = {
    async loadAccount() {
      return {
        accountId: () => source,
        sequenceNumber: () => '123',
        subentry_count: 1,
        num_sponsoring: 0,
        num_sponsored: 0,
        balances: [
          { asset_type: 'native', balance: '21.5000000', buying_liabilities: '1.0000000', selling_liabilities: '2.2500000' },
          { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: usdcIssuer, balance: '8.0000000', limit: '1000.0000000', buying_liabilities: '0.5000000', selling_liabilities: '1.2500000', is_authorized: true, is_authorized_to_maintain_liabilities: false, is_clawback_enabled: false }
        ]
      };
    }
  };
  const adapter = new StellarHorizonAdapter(config(), { server: fakeServer });
  const summary = await adapter.loadAccountSummary(source);

  assert.equal(summary.status, 'LIVE');
  assert.equal(summary.balances.XLM.balanceUnits, '215000000');
  assert.equal(summary.balances.XLM.sellingLiabilitiesUnits, '22500000');
  assert.equal(summary.balances.USDC.balanceUnits, '80000000');
  assert.equal(summary.balances.USDC.trustline, true);
  assert.equal(summary.balances.USDC.authorized, true);
});

test('reports a missing account and absent USDC trustline honestly', async () => {
  const missing = new StellarHorizonAdapter(config(), { server: { loadAccount: async () => { throw { response: { status: 404 } }; } } });
  assert.equal((await missing.loadAccountSummary(source)).status, 'NOT_FOUND');

  const noTrust = new StellarHorizonAdapter(config(), { server: { loadAccount: async () => ({ accountId: () => source, sequenceNumber: () => '1', subentry_count: 0, num_sponsoring: 0, num_sponsored: 0, balances: [{ asset_type: 'native', balance: '10.0000000', buying_liabilities: '0.0000000', selling_liabilities: '0.0000000' }] }) } });
  assert.equal((await noTrust.loadAccountSummary(source)).balances.USDC.trustline, false);
});

test('normalizes recent payment activity', async () => {
  const fakeServer = { payments: () => callBuilder([{ id: '9', type: 'payment', created_at: '2026-09-10T01:00:00Z', transaction_hash: 'a'.repeat(64), from: source, to: destination, amount: '2.5000000', asset_type: 'native', transaction_successful: true }]) };
  const adapter = new StellarHorizonAdapter(config(), { server: fakeServer });
  const [activity] = await adapter.loadActivity(source, 10);
  assert.equal(activity.direction, 'OUT');
  assert.equal(activity.assetCode, 'XLM');
  assert.equal(activity.amountUnits, '25000000');
});

test('quotes the best strict-send path and returns null when no path exists', async () => {
  const paths = [{ source_amount: '5.0000000', source_asset_type: 'native', destination_amount: '4.7500000', destination_asset_type: 'credit_alphanum4', destination_asset_code: 'USDC', destination_asset_issuer: usdcIssuer, path: [] }];
  const fakeServer = { strictSendPaths: () => callBuilder(paths) };
  const adapter = new StellarHorizonAdapter(config(), { server: fakeServer });
  const quote = await adapter.quoteStrictSend({ sendAssetCode: 'XLM', sendAmount: '5.0000000', destinationAssetCode: 'USDC' });
  assert.equal(quote.destinationAmountUnits, '47500000');
  assert.deepEqual(quote.path, []);

  const noPath = new StellarHorizonAdapter(config(), { server: { strictSendPaths: () => callBuilder([]) } });
  assert.equal(await noPath.quoteStrictSend({ sendAssetCode: 'XLM', sendAmount: '5.0000000', destinationAssetCode: 'USDC' }), null);
});

test('builds bounded Testnet payment XDR with memo and time bounds', async () => {
  const fakeServer = {
    async loadAccount() { return new Account(source, '123'); },
    async feeStats() { return { fee_charged: { p90: '150' } }; }
  };
  const now = new Date('2026-09-10T01:00:00Z');
  const adapter = new StellarHorizonAdapter(config(), { server: fakeServer, now: () => now });
  const built = await adapter.buildPayment({ source, destination, assetCode: 'XLM', amount: '1.2500000', memo: 'savings' });
  const transaction = TransactionBuilder.fromXDR(built.unsignedXdr, Networks.TESTNET);
  assert.equal(transaction.operations.length, 1);
  assert.equal(transaction.operations[0].type, 'payment');
  assert.equal(transaction.memo.value.toString(), 'savings');
  assert.equal(built.feeStroops, '150');
  assert.equal(built.expiresAt.toISOString(), '2026-09-10T01:05:00.000Z');
});

test('submits and reconciles with distinct succeeded, failed, and unknown states', async () => {
  const signed = new TransactionBuilder(new Account(source, '123'), { fee: '100', networkPassphrase: Networks.TESTNET, timebounds: { minTime: 0, maxTime: 2000000000 } }).addOperation(Operation.payment({ destination, asset: Asset.native(), amount: '1.0000000' })).build();
  const hash = signed.hash().toString('hex');
  const successAdapter = new StellarHorizonAdapter(config(), { server: { submitTransaction: async () => ({ hash, successful: true, ledger: 99 }) } });
  assert.equal((await successAdapter.submit(signed.toXDR())).status, 'SUCCEEDED');

  const missingLookup = new StellarHorizonAdapter(config(), { server: { transactions: () => ({ transaction: () => ({ call: async () => { throw { response: { status: 404 } }; } }) }) } });
  assert.equal((await missingLookup.reconcile(hash)).status, 'UNKNOWN');

  const failedLookup = new StellarHorizonAdapter(config(), { server: { transactions: () => ({ transaction: () => ({ call: async () => ({ hash, successful: false, result_xdr: 'redacted' }) }) }) } });
  assert.equal((await failedLookup.reconcile(hash)).status, 'FAILED');
});
