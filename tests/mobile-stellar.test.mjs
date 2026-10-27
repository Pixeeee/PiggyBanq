import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../apps/mobile/package.json', import.meta.url));
const { Keypair, TransactionBuilder, Networks, Operation, Asset } = require('@stellar/stellar-sdk');
const mobile = await import('../apps/mobile/src/wallet/stellar-mobile.ts').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
const source = Keypair.random();
const destination = Keypair.random();
const issuer = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

function harness(overrides = {}) {
  assert.equal(typeof mobile.createMobileStellarClient, 'function');
  let timestamp = Date.parse('2026-10-04T12:00:00Z');
  const requests = [];
  const account = publicKey => ({ account_id: publicKey, sequence: '42', subentry_count: 1, num_sponsoring: 0, num_sponsored: 0, balances: [
    { asset_type: 'native', balance: '100.0000000', selling_liabilities: '0.0000000' },
    { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: issuer, balance: '50.0000000', limit: '100.0000000', selling_liabilities: '0.0000000', buying_liabilities: '0.0000000', is_authorized: true }
  ] });
  const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
  const fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    assert.equal(new URL(url).origin, 'https://horizon-testnet.stellar.org');
    const path = new URL(url).pathname;
    if (overrides.fetch) {
      const handled = await overrides.fetch(path, options, reply);
      if (handled) return handled;
    }
    if (path === '/ledgers') return reply({ _embedded: { records: [{ base_fee_in_stroops: 100, base_reserve_in_stroops: 5000000 }] } });
    if (path.endsWith('/payments')) return reply({ _embedded: { records: [] } });
    if (path.startsWith('/accounts/')) return reply(overrides.account?.(path.split('/')[2], account) ?? account(path.split('/')[2]));
    if (path.startsWith('/transactions/')) return reply({ detail: 'Not found' }, 404);
    throw new Error(`Unexpected Horizon path ${path}`);
  };
  const client = mobile.createMobileStellarClient({ fetch, now: () => timestamp, wait: async milliseconds => { timestamp += milliseconds; } });
  return { client, requests, advance: milliseconds => { timestamp += milliseconds; } };
}

const swapPath = { source_asset_type: 'native', source_amount: '1.0000000', destination_asset_type: 'credit_alphanum4', destination_asset_code: 'USDC', destination_asset_issuer: issuer, destination_amount: '2.0000000', path: [] };
const swapInput = { kind: 'SWAP', amount: '1', assetCode: 'XLM', destinationAssetCode: 'USDC', slippageBps: 100 };
function swaps(entries = [swapPath], extra = {}) {
  return harness({ ...extra, fetch: (path, options, reply) => path === '/paths/strict-send' ? reply({ _embedded: { records: entries } }) : extra.fetch?.(path, options, reply) });
}

test('native swap selects a supported quote, binds self destination and exact slippage floor', async () => {
  const { client } = swaps([{ ...swapPath, destination_asset_issuer: destination.publicKey() }, swapPath, { ...swapPath, destination_amount: '3.0000000' }]);
  const review = await client.prepareMobileTransaction(source.publicKey(), swapInput);
  assert.equal(review.kind, 'SWAP');
  assert.equal(review.destination, source.publicKey());
  assert.deepEqual(review.swap, { destinationAssetCode: 'USDC', quotedAmount: '3.0000000', minimumAmount: '2.9700000', slippageBps: 100, path: [] });
  const tx = TransactionBuilder.fromXDR(review.unsignedXdr, Networks.TESTNET);
  assert.equal(tx.operations[0].type, 'pathPaymentStrictSend');
  assert.equal(tx.operations[0].destMin, '2.9700000');
});

test('native swap rejects missing liquidity, foreign path assets, bad slippage and missing trustlines', async () => {
  for (const entries of [[], [{ ...swapPath, path: [{ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: destination.publicKey() }] }], [{ ...swapPath, source_amount: '99' }]]) {
    await assert.rejects(swaps(entries).client.prepareMobileTransaction(source.publicKey(), swapInput), /route/);
  }
  for (const slippageBps of [0, 501, 1.5, NaN]) await assert.rejects(swaps().client.prepareMobileTransaction(source.publicKey(), { ...swapInput, slippageBps }), /slippage/);
  await assert.rejects(swaps([swapPath], { account: (key, account) => ({ ...account(key), balances: account(key).balances.filter(line => line.asset_type === 'native') }) }).client.prepareMobileTransaction(source.publicKey(), swapInput), /trustline/);
});

test('native swap refuses tampered minimum, issuer, source destination, slippage or hidden operations before signing', async () => {
  const { client, requests } = swaps();
  const review = await client.prepareMobileTransaction(source.publicKey(), swapInput);
  for (const altered of [
    { ...review, destination: destination.publicKey() },
    { ...review, issuer: issuer },
    { ...review, swap: { ...review.swap, minimumAmount: '0.0000001' } },
    { ...review, swap: { ...review.swap, slippageBps: 500 } },
    { ...review, swap: { ...review.swap, path: ['USDC'] } }
  ]) await assert.rejects(client.submitMobileTransaction(altered, source.secret()), /match/);
  assert.equal(requests.some(entry => entry.options?.method === 'POST'), false);
});

test('mobile ledger validates public keys and filters balances to the official Testnet issuer', async () => {
  const { client, requests } = harness({ account: (key, account) => {
    const result = account(key);
    result.balances.push({ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: destination.publicKey(), balance: '999.0000000', is_authorized: true });
    return result;
  } });
  await assert.rejects(() => client.fetchMobileLedger('G' + 'A'.repeat(55)), /public key|address/i);
  assert.equal(requests.length, 0);
  const ledger = await client.fetchMobileLedger(source.publicKey());
  assert.equal(ledger.exists, true);
  assert.equal(ledger.xlm, '100.0000000');
  assert.equal(ledger.usdc, '50.0000000');
  assert.equal(ledger.usdcTrustline, true);
});

test('mobile quote rejects invalid destinations, fractional precision, and reserve overspending', async () => {
  const { client } = harness();
  const payment = { kind: 'PAYMENT', destination: destination.publicKey(), amount: '1', assetCode: 'XLM' };
  await assert.rejects(() => client.prepareMobileTransaction(source.publicKey(), { ...payment, destination: 'bad' }), /destination|public key|address/i);
  await assert.rejects(() => client.prepareMobileTransaction(source.publicKey(), { ...payment, amount: '1.00000001' }), /amount|decimal/i);
  await assert.rejects(() => client.prepareMobileTransaction(source.publicKey(), { ...payment, amount: '99' }), /reserve|spendable/i);
  await assert.rejects(() => client.prepareMobileTransaction(source.publicKey(), { ...payment, memo: '💰'.repeat(8) }), /memo/i);
});

test('mobile USDC quote enforces source authorization and recipient trustline capacity', async () => {
  const input = { kind: 'PAYMENT', destination: destination.publicKey(), amount: '1', assetCode: 'USDC' };
  const unauthorized = harness({ account: (key, account) => {
    const result = account(key);
    if (key === source.publicKey()) result.balances[1].is_authorized = false;
    return result;
  } });
  await assert.rejects(() => unauthorized.client.prepareMobileTransaction(source.publicKey(), input), /authorized|trustline/i);
  const noCapacity = harness({ account: (key, account) => {
    const result = account(key);
    if (key === destination.publicKey()) result.balances[1].buying_liabilities = '50.0000000';
    return result;
  } });
  await assert.rejects(() => noCapacity.client.prepareMobileTransaction(source.publicKey(), input), /capacity|limit/i);
});

test('mobile payments reject missing destinations, missing official trustlines, and encumbered USDC', async () => {
  const payment = { kind: 'PAYMENT', destination: destination.publicKey(), amount: '1', assetCode: 'USDC' };
  const missing = harness({ fetch: async (path, options, reply) => path === `/accounts/${destination.publicKey()}` ? reply({}, 404) : undefined });
  await assert.rejects(() => missing.client.prepareMobileTransaction(source.publicKey(), { ...payment, assetCode: 'XLM' }), /destination.*exist/i);
  const noLine = harness({ account: (key, account) => {
    const result = account(key);
    if (key === destination.publicKey()) result.balances[1].asset_issuer = source.publicKey();
    return result;
  } });
  await assert.rejects(() => noLine.client.prepareMobileTransaction(source.publicKey(), payment), /official.*trustline/i);
  const encumbered = harness({ account: (key, account) => {
    const result = account(key);
    if (key === source.publicKey()) result.balances[1].selling_liabilities = '50.0000000';
    return result;
  } });
  await assert.rejects(() => encumbered.client.prepareMobileTransaction(source.publicKey(), payment), /spendable USDC/i);
});

test('mobile signer rejects tampered reviews, expiry, and mismatched secret before persistence or submission', async () => {
  const { client, requests, advance } = harness();
  const review = await client.prepareMobileTransaction(source.publicKey(), { kind: 'PAYMENT', destination: destination.publicKey(), amount: '1', assetCode: 'XLM', memo: 'Mobile test' });
  const requestCount = requests.length;
  let persisted = false;
  const save = async () => { persisted = true; };
  for (const altered of [
    { ...review, amount: '2.0000000' }, { ...review, feeStroops: '1000000' }, { ...review, memo: 'Changed' },
    { ...review, destination: source.publicKey() }, { ...review, issuer }, { ...review, hash: 'f'.repeat(64) },
    { ...review, expiresAt: '2099-01-01T00:00:00Z' }, { ...review, kind: 'TRUSTLINE' }
  ]) {
    await assert.rejects(() => client.submitMobileTransaction(altered, source.secret(), save), /review|match|expiry|expiration|fee|issuer|transaction/i);
  }
  await assert.rejects(() => client.submitMobileTransaction(review, destination.secret(), save), /signer|wallet|source/i);
  advance(121000);
  await assert.rejects(() => client.submitMobileTransaction(review, source.secret(), save), /expired/i);
  assert.equal(persisted, false);
  assert.equal(requests.length, requestCount);
});

test('mobile review rejects hidden extra operations and fee-bump envelopes even with matching body hashes', async () => {
  const { client } = harness();
  const review = await client.prepareMobileTransaction(source.publicKey(), { kind: 'PAYMENT', destination: destination.publicKey(), amount: '1', assetCode: 'XLM' });
  const transaction = TransactionBuilder.fromXDR(review.unsignedXdr, Networks.TESTNET);
  const extra = TransactionBuilder.cloneFrom(transaction).addOperation(Operation.payment({ destination: source.publicKey(), asset: Asset.native(), amount: '99' })).build();
  await assert.rejects(() => client.submitMobileTransaction({ ...review, unsignedXdr: extra.toXDR(), hash: Buffer.from(extra.hash()).toString('hex'), feeStroops: extra.fee }, source.secret()), /review|match/i);
  const feeBump = TransactionBuilder.buildFeeBumpTransaction(source, '100', transaction, Networks.TESTNET);
  await assert.rejects(() => client.submitMobileTransaction({ ...review, unsignedXdr: feeBump.toXDR(), hash: Buffer.from(feeBump.hash()).toString('hex'), feeStroops: feeBump.fee }, source.secret()), /review|match/i);
});

test('mobile local signing persists the hash before submitting and verifies the signature on a confirmed result', async () => {
  let persisted = false;
  let expectedHash = '';
  const { client } = harness({ fetch: async (path, options, reply) => {
    if (path !== '/transactions') return;
    assert.equal(persisted, true);
    const xdr = new URLSearchParams(options.body).get('tx');
    const transaction = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    assert.equal(transaction.source, source.publicKey());
    assert.ok(transaction.signatures.some(signature => source.verify(transaction.hash(), signature.signature)));
    return reply({ hash: expectedHash, successful: true, ledger: 123 });
  } });
  const review = await client.prepareMobileTransaction(source.publicKey(), { kind: 'PAYMENT', destination: destination.publicKey(), amount: '1', assetCode: 'XLM' });
  expectedHash = review.hash;
  const result = await client.submitMobileTransaction(review, source.secret(), async hash => { assert.equal(hash, review.hash); persisted = true; });
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.hash, review.hash);
});

test('mobile persistence failure prevents any transaction submission', async () => {
  const { client, requests } = harness();
  const review = await client.prepareMobileTransaction(source.publicKey(), { kind: 'TRUSTLINE' });
  await assert.rejects(() => client.submitMobileTransaction(review, source.secret(), async () => { throw new Error('Storage failed'); }), /Storage failed/);
  assert.equal(requests.some(request => new URL(request.url).pathname === '/transactions'), false);
});

test('mobile submission transport uncertainty reconciles the same hash rather than declaring failure', async () => {
  let lookupCount = 0;
  let expectedHash = '';
  const { client } = harness({ fetch: async (path, options, reply) => {
    if (path === '/transactions') throw new Error('Connection reset after sending');
    if (path.startsWith('/transactions/')) {
      assert.equal(path, `/transactions/${expectedHash}`);
      lookupCount += 1;
      if (lookupCount < 3) return reply({}, 404);
      return reply({ hash: expectedHash, successful: true, ledger: 456 });
    }
  } });
  const review = await client.prepareMobileTransaction(source.publicKey(), { kind: 'TRUSTLINE' });
  expectedHash = review.hash;
  const result = await client.submitMobileTransaction(review, source.secret());
  assert.equal(result.status, 'SUCCESS');
  assert.equal(lookupCount, 3);
});

test('mobile reconciliation preserves an unresolved hash through timeout and only fails for confirmed ledger rejection', async () => {
  const hash = 'a'.repeat(64);
  const uncertain = harness();
  const unknown = await uncertain.client.reconcileMobileTransaction(hash);
  assert.equal(unknown.status, 'UNKNOWN');
  assert.equal(unknown.hash, hash);
  assert.ok(uncertain.requests.length > 1);
  const rejected = harness({ fetch: async (path, options, reply) => path.startsWith('/transactions/') ? reply({ hash, successful: false, ledger: 789 }) : undefined });
  assert.equal((await rejected.client.reconcileMobileTransaction(hash)).status, 'FAILED');
});

test('mobile submission distinguishes a definite rejection from ambiguous duplicate sequence errors', async () => {
  for (const [code, expected] of [['tx_failed', 'FAILED'], ['tx_bad_seq', 'UNKNOWN']]) {
    const { client } = harness({ fetch: async (path, options, reply) => path === '/transactions' ? reply({ extras: { result_codes: { transaction: code, operations: ['op_underfunded'] } } }, 400) : undefined });
    const review = await client.prepareMobileTransaction(source.publicKey(), { kind: 'TRUSTLINE' });
    assert.equal((await client.submitMobileTransaction(review, source.secret())).status, expected);
  }
});

test('mobile expired crash-before-submit is released only after ingested ledger expiry and a follow-up 404', async () => {
  const hash = 'b'.repeat(64);
  const order = [];
  const { client } = harness({ fetch: async (path, options, reply) => {
    order.push(path);
    if (path === '/ledgers') return reply({ _embedded: { records: [{ closed_at: '2026-10-04T12:02:00Z' }] } });
    if (path.startsWith('/transactions/')) return reply({}, 404);
  } });
  const expired = await client.reconcileMobileTransaction(hash, '2026-10-04T12:01:30.000Z');
  assert.equal(expired.status, 'FAILED');
  assert.equal(expired.hash, hash);
  assert.deepEqual(order, [`/transactions/${hash}`, '/ledgers', `/transactions/${hash}`]);
});

test('mobile ledger lag and outage never turn an expired local timestamp into definite failure', async () => {
  const hash = 'c'.repeat(64);
  for (const mode of ['lag', 'outage']) {
    const { client, advance } = harness({ fetch: async (path, options, reply) => {
      if (path === '/ledgers') {
        if (mode === 'outage') throw new Error('Ledger unavailable');
        return reply({ _embedded: { records: [{ closed_at: '2026-10-04T12:01:29Z' }] } });
      }
      if (path.startsWith('/transactions/')) return reply({}, 404);
    } });
    advance(600000);
    assert.equal((await client.reconcileMobileTransaction(hash, '2026-10-04T12:01:30.000Z')).status, 'UNKNOWN', mode);
  }
});

test('mobile expiry proof still accepts a transaction found after the ledger query', async () => {
  const hash = 'd'.repeat(64);
  let ingestedLedgerRead = false;
  const { client } = harness({ fetch: async (path, options, reply) => {
    if (path === '/ledgers') {
      ingestedLedgerRead = true;
      return reply({ _embedded: { records: [{ closed_at: '2026-10-04T12:02:00Z' }] } });
    }
    if (path.startsWith('/transactions/')) return ingestedLedgerRead ? reply({ hash, successful: true, ledger: 123 }) : reply({}, 404);
  } });
  assert.equal((await client.reconcileMobileTransaction(hash, '2026-10-04T12:01:30.000Z')).status, 'SUCCESS');
});

test('mobile expiry proof requires a definite follow-up 404 and rejects invalid expiry input', async () => {
  const hash = 'e'.repeat(64);
  let ledgerRead = false;
  const { client } = harness({ fetch: async (path, options, reply) => {
    if (path === '/ledgers') {
      ledgerRead = true;
      return reply({ _embedded: { records: [{ closed_at: '2026-10-04T12:02:00Z' }] } });
    }
    if (path.startsWith('/transactions/')) {
      if (ledgerRead) throw new Error('Lookup unavailable');
      return reply({}, 404);
    }
  } });
  assert.equal((await client.reconcileMobileTransaction(hash, '2026-10-04T12:01:30.000Z')).status, 'UNKNOWN');
  for (const expiry of ['invalid', '2026-02-30T12:01:30.000Z', '2026-10-04T12:01:30.500Z']) {
    await assert.rejects(() => client.reconcileMobileTransaction(hash, expiry), /expiry|expiration/i);
  }
});
