import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fetchMobileLedger, prepareMobileTransaction, submitMobileTransaction, reconcileMobileTransaction } from '../apps/mobile/src/wallet/stellar-mobile.ts';

const require = createRequire(new URL('../apps/mobile/package.json', import.meta.url));
const { Keypair } = require('@stellar/stellar-sdk');

test('live mobile helper: Testnet balances, reviewed XLM signing, confirmation, USDC trustline and XLM to USDC swap', {
  skip: process.env.RUN_MOBILE_STELLAR_TESTNET !== '1', timeout: 240000
}, async () => {
  const source = Keypair.random();
  const destination = Keypair.random();
  async function fund(key) {
    const url = new URL('https://friendbot.stellar.org');
    url.searchParams.set('addr', key.publicKey());
    const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
    assert.equal(response.ok, true, `Testnet Friendbot returned HTTP ${response.status}`);
    await response.text();
  }
  await Promise.all([fund(source), fund(destination)]);
  const before = await fetchMobileLedger(destination.publicKey());
  assert.equal(before.exists, true);
  assert.equal(before.usdcTrustline, false);
  const review = await prepareMobileTransaction(source.publicKey(), { kind: 'PAYMENT', assetCode: 'XLM', destination: destination.publicKey(), amount: '1', memo: 'Mobile release test' });
  let persistedHash = '';
  const result = await submitMobileTransaction(review, source.secret(), async hash => { persistedHash = hash; });
  assert.equal(persistedHash, review.hash);
  assert.equal(result.status, 'SUCCESS', result.message);
  assert.equal((await reconcileMobileTransaction(review.hash)).status, 'SUCCESS');
  const after = await fetchMobileLedger(destination.publicKey());
  assert.equal(Number(after.xlm) - Number(before.xlm), 1);
  assert.ok(after.activity.some(entry => entry.hash === review.hash && entry.successful));
  const trustline = await prepareMobileTransaction(source.publicKey(), { kind: 'TRUSTLINE' });
  assert.equal(trustline.assetCode, 'USDC');
  assert.equal(trustline.issuer, 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
  assert.equal((await submitMobileTransaction(trustline, source.secret())).status, 'SUCCESS');
  assert.equal((await fetchMobileLedger(source.publicKey())).usdcTrustline, true);
  const swap = await prepareMobileTransaction(source.publicKey(), { kind: 'SWAP', amount: '1', assetCode: 'XLM', destinationAssetCode: 'USDC', slippageBps: 100 });
  assert.equal(swap.destination, source.publicKey());
  assert.ok(Number(swap.swap.minimumAmount) > 0);
  const swapResult = await submitMobileTransaction(swap, source.secret());
  assert.equal(swapResult.status, 'SUCCESS', swapResult.message);
  assert.ok(Number((await fetchMobileLedger(source.publicKey())).usdc) >= Number(swap.swap.minimumAmount));
});

test('live mobile recovery: official ingested ledger and follow-up lookup resolve an expired unpublished hash', {
  skip: process.env.RUN_MOBILE_STELLAR_TESTNET !== '1', timeout: 30000
}, async () => {
  const unpublishedHash = Buffer.from(Keypair.random().rawPublicKey()).toString('hex');
  const recovered = await reconcileMobileTransaction(unpublishedHash, '2000-01-01T00:00:00.000Z');
  assert.equal(recovered.hash, unpublishedHash);
  assert.equal(recovered.status, 'FAILED', recovered.message);
});
