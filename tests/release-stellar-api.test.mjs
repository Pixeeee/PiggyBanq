import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const require = createRequire(new URL('../server/package.json', import.meta.url));
const { Account, Asset, Keypair, Memo, Networks, Operation, TransactionBuilder } = require('@stellar/stellar-sdk');
const base = process.env.RELEASE_API_URL ?? 'http://127.0.0.1:4000';
const origin = process.env.RELEASE_WEB_ORIGIN ?? 'http://127.0.0.1:3010';

test('live API release: funded wallets, reviewed local signing, confirmed payment, durable idempotency and ownership', {
  skip: process.env.RUN_DATABASE_STELLAR_TESTS !== '1', timeout: 240000
}, async () => {
  async function request(path, { method = 'GET', body, cookie = '', idempotencyKey, timeout = 30000 } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { origin, ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout)
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '' };
  }

  async function signup(key, suffix) {
    const publicKey = key.publicKey();
    const challenge = await request('/api/auth/stellar/challenge', { method: 'POST', body: { publicKey, purpose: 'SIGN_UP', network: 'TESTNET' } });
    assert.equal(challenge.status, 200, JSON.stringify(challenge.data));
    const response = await request('/api/auth/stellar/signup', {
      method: 'POST', body: { publicKey, username: `live_${Date.now().toString(36)}_${suffix}`, challengeId: challenge.data.challengeId, signature: Buffer.from(key.sign(Buffer.from(challenge.data.message))).toString('base64') }
    });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    assert.ok(response.cookie);
    return response.cookie;
  }

  async function fund(key) {
    const url = new URL('https://friendbot.stellar.org');
    url.searchParams.set('addr', key.publicKey());
    const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
    assert.equal(response.ok, true, `Testnet Friendbot returned HTTP ${response.status}`);
    await response.text();
  }

  async function summary(cookie) {
    const response = await request('/api/stellar/me/summary', { cookie });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    assert.equal(response.data.network, 'TESTNET');
    return response.data;
  }

  const source = Keypair.random();
  const destination = Keypair.random();
  const sourceCookie = await signup(source, 'a');
  const destinationCookie = await signup(destination, 'b');
  try {
    const capabilities = await request('/api/stellar/capabilities', { cookie: sourceCookie });
    assert.equal(capabilities.status, 200);
    assert.equal(capabilities.data.network, 'TESTNET');
    assert.equal(capabilities.data.emergencyReadOnly, false);
    await Promise.all([fund(source), fund(destination)]);
    const before = await summary(destinationCookie);
    assert.equal(before.status, 'LIVE');

    const payment = { operationType: 'PAYMENT', destination: destination.publicKey(), assetCode: 'XLM', amount: '1.0000000', memo: 'Release API test' };
    const idempotencyKey = randomUUID();
    const quoted = await request('/api/stellar/intents/quote', { method: 'POST', body: payment, cookie: sourceCookie, idempotencyKey });
    assert.equal(quoted.status, 201, JSON.stringify(quoted.data));
    const intent = quoted.data;
    assert.equal(intent.status, 'AWAITING_SIGNATURE');
    assert.equal(intent.network, 'STELLAR_TESTNET');
    assert.equal(intent.review.amountUnits, '10000000');
    assert.equal(intent.review.destination, destination.publicKey());
    assert.equal(intent.review.assetCode, 'XLM');
    assert.equal(intent.review.memo, 'Release API test');

    const transaction = TransactionBuilder.fromXDR(intent.unsignedXdr, Networks.TESTNET);
    assert.equal(transaction.source, source.publicKey());
    assert.equal(transaction.operations.length, 1);
    assert.equal(transaction.operations[0].type, 'payment');
    assert.equal(transaction.operations[0].destination, destination.publicKey());
    assert.equal(transaction.operations[0].amount, '1.0000000');
    assert.equal(transaction.operations[0].asset.isNative(), true);
    assert.equal(transaction.fee, intent.review.feeStroops);
    assert.ok(BigInt(transaction.fee) > 0n && BigInt(transaction.fee) <= 100000n);
    assert.equal(Buffer.from(transaction.memo.value).toString('utf8'), 'Release API test');
    assert.equal(Number(transaction.timeBounds.maxTime), Math.floor(Date.parse(intent.expiresAt) / 1000));
    assert.ok(Number(transaction.timeBounds.maxTime) > Date.now() / 1000);
    assert.equal(transaction.signatures.length, 0);

    const replay = await request('/api/stellar/intents/quote', { method: 'POST', body: payment, cookie: sourceCookie, idempotencyKey });
    assert.equal(replay.status, 201);
    assert.equal(replay.data.id, intent.id);
    assert.equal(replay.data.unsignedXdr, intent.unsignedXdr);
    const conflict = await request('/api/stellar/intents/quote', { method: 'POST', body: { ...payment, amount: '2' }, cookie: sourceCookie, idempotencyKey });
    assert.equal(conflict.status, 409);
    assert.equal((await request(`/api/stellar/intents/${intent.id}`, { cookie: destinationCookie })).status, 404);
    assert.equal((await request(`/api/stellar/intents/${intent.id}`)).status, 401);

    const altered = new TransactionBuilder(new Account(source.publicKey(), (BigInt(transaction.sequence) - 1n).toString()), { fee: transaction.fee, networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.payment({ destination: destination.publicKey(), asset: Asset.native(), amount: '2.0000000' }))
      .addMemo(Memo.text('Release API test')).setTimeout(60).build();
    altered.sign(source);
    const tampered = await request(`/api/stellar/intents/${intent.id}/submit`, { method: 'POST', body: { signedXdr: altered.toXDR() }, cookie: sourceCookie });
    assert.equal(tampered.status, 400, JSON.stringify(tampered.data));
    assert.equal(tampered.data.error.code, 'INVALID_TRANSACTION');
    assert.equal((await request(`/api/stellar/intents/${intent.id}`, { cookie: sourceCookie })).data.status, 'AWAITING_SIGNATURE');

    transaction.sign(source);
    assert.ok(transaction.signatures.some(signature => source.verify(transaction.hash(), signature.signature)));
    const signedXdr = transaction.toXDR();
    const wrongOwner = await request(`/api/stellar/intents/${intent.id}/submit`, { method: 'POST', body: { signedXdr }, cookie: destinationCookie });
    assert.equal(wrongOwner.status, 404);
    const submitted = await request(`/api/stellar/intents/${intent.id}/submit`, { method: 'POST', body: { signedXdr }, cookie: sourceCookie, timeout: 90000 });
    assert.equal(submitted.status, 200, JSON.stringify(submitted.data));
    let confirmed = submitted.data;
    for (let attempt = 0; attempt < 60 && ['SUBMITTED', 'UNKNOWN', 'EXECUTING'].includes(confirmed.status); attempt += 1) {
      await delay(1000);
      const polled = await request(`/api/stellar/intents/${intent.id}`, { cookie: sourceCookie });
      assert.equal(polled.status, 200, JSON.stringify(polled.data));
      confirmed = polled.data;
    }
    assert.equal(confirmed.status, 'SUCCEEDED', JSON.stringify(confirmed.error));
    assert.equal(confirmed.transactionHash, Buffer.from(transaction.hash()).toString('hex'));

    const repeatSubmit = await request(`/api/stellar/intents/${intent.id}/submit`, { method: 'POST', body: { signedXdr }, cookie: sourceCookie });
    assert.equal(repeatSubmit.status, 200);
    assert.equal(repeatSubmit.data.status, 'SUCCEEDED');
    assert.equal(repeatSubmit.data.transactionHash, confirmed.transactionHash);
    const after = await summary(destinationCookie);
    assert.equal(BigInt(after.balances.XLM.balanceUnits) - BigInt(before.balances.XLM.balanceUnits), 10000000n);
    const activity = await request('/api/stellar/me/activity?limit=20', { cookie: destinationCookie });
    assert.equal(activity.status, 200, JSON.stringify(activity.data));
    assert.ok(activity.data.records.some(record => record.transactionHash === confirmed.transactionHash && record.direction === 'IN' && record.amountUnits === '10000000' && record.successful));
    const persisted = await request(`/api/stellar/intents/${intent.id}`, { cookie: sourceCookie });
    assert.equal(persisted.data.status, 'SUCCEEDED');
    assert.equal(persisted.data.transactionHash, confirmed.transactionHash);
  } finally {
    await Promise.allSettled([request('/api/auth/logout', { method: 'POST', cookie: sourceCookie }), request('/api/auth/logout', { method: 'POST', cookie: destinationCookie })]);
  }
});
