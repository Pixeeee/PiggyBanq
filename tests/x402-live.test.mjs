import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../server/package.json', import.meta.url));

test('x402 Testnet: encrypted local vault, explicit approval, real settlement and repeatable verified receipt', {
  skip: process.env.RUN_X402_TESTNET_E2E !== '1', timeout: 180_000
}, async () => {
  const { register } = await import(require.resolve('tsx/esm/api'));
  register();
  const wallet = await import('../apps/web/app/(app)/dashboard/secure-wallet.ts');
  const { signX402Payment } = await import('../apps/web/app/lib/x402-payment.ts');
  const { Keypair, rpc } = require('@stellar/stellar-sdk');
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.localStorage;
  const origin = 'http://127.0.0.1:3010';
  const api = process.env.RELEASE_API_URL ?? 'http://127.0.0.1:4000';
  const data = new Map();
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) };
  globalThis.window = { location: { origin, protocol: 'http:' } };
  let cookie = '';
  let userId;
  globalThis.fetch = async (input, options = {}) => {
    const url = String(input);
    if (url.startsWith(origin + '/backend/')) {
      const headers = new Headers(options.headers);
      headers.set('cookie', cookie);
      headers.set('origin', origin);
      return originalFetch(api + url.slice((origin + '/backend').length), { ...options, headers });
    }
    return originalFetch(input, options);
  };
  const request = async (path, method = 'GET', body, headers = {}) => {
    const response = await originalFetch(api + path, { method, headers: { origin, cookie,
      ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(90_000) });
    return { response, body: await response.json() };
  };
  try {
    const username = `x402_${Date.now().toString(36)}`;
    const password = 'DisposableLocal!402';
    const account = await wallet.prepareSecureWalletAccount({ username, password, recoveryPhrase: wallet.generateRecoveryPhrase() });
    wallet.persistSecureWalletAccount(account);
    const payer = Keypair.fromSecret(account.vault.secretKey);
    const funded = await originalFetch(`https://friendbot.stellar.org/?addr=${payer.publicKey()}`, { signal: AbortSignal.timeout(30_000) });
    assert.equal(funded.ok, true, 'disposable Testnet payer funding');
    const challenge = await request('/api/auth/stellar/challenge', 'POST', { publicKey: payer.publicKey(), purpose: 'SIGN_UP', network: 'TESTNET' });
    assert.equal(challenge.response.status, 200);
    const signup = await request('/api/auth/stellar/signup', 'POST', { publicKey: payer.publicKey(), username,
      challengeId: challenge.body.challengeId, signature: Buffer.from(payer.sign(Buffer.from(challenge.body.message))).toString('base64') });
    assert.equal(signup.response.status, 200);
    userId = signup.body.user.id;
    cookie = signup.response.headers.get('set-cookie').split(';')[0];
    const idempotency = crypto.randomUUID();
    const quote = await request('/api/x402/intents', 'POST', undefined, { 'idempotency-key': idempotency });
    assert.equal(quote.response.status, 201, JSON.stringify(quote.body));
    const intent = quote.body.intent;
    assert.equal(intent.payer, payer.publicKey());
    const repeated = await request('/api/x402/intents', 'POST', undefined, { 'idempotency-key': idempotency });
    assert.equal(repeated.body.intent.id, intent.id);
    const resource = `/api/x402/test/insight/${intent.id}`;
    const paywall = await request(resource);
    assert.equal(paywall.response.status, 402);
    assert.deepEqual(JSON.parse(Buffer.from(paywall.response.headers.get('payment-required'), 'base64').toString()).accepts, [intent.requirements]);
    const unsigned = Buffer.from(JSON.stringify({ x402Version: 2, accepted: intent.requirements, payload: { transaction: 'not-signed' } })).toString('base64');
    assert.equal((await request(resource, 'GET', undefined, { 'PAYMENT-SIGNATURE': unsigned })).response.status, 409);
    const approval = await request(`/api/x402/intents/${intent.id}/approve`, 'POST');
    assert.equal(approval.response.status, 200, JSON.stringify(approval.body));
    assert.equal(approval.body.intent.status, 'APPROVED');
    const payload = await signX402Payment({ username, password, intent: approval.body.intent });
    assert.equal(JSON.stringify(payload).includes(account.vault.secretKey), false);
    assert.equal(JSON.stringify(payload).includes(password), false);
    let paid = await request(resource, 'GET', undefined, { 'PAYMENT-SIGNATURE': Buffer.from(JSON.stringify(payload)).toString('base64') });
    if (paid.response.status === 202) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const refreshed = await request(`/api/x402/intents/${intent.id}`);
      assert.equal(refreshed.body.intent.status, 'SUCCEEDED', JSON.stringify(refreshed.body));
      paid = await request(resource);
    }
    assert.equal(paid.response.status, 200, JSON.stringify(paid.body));
    const receipt = paid.body.intent.receipt;
    assert.equal(receipt.verified, true);
    assert.equal(receipt.success, true);
    assert.equal(receipt.network, 'stellar:testnet');
    assert.equal(receipt.amount, '1000');
    assert.equal(receipt.payer, payer.publicKey());
    assert.ok(receipt.ledger > 0);
    assert.ok(paid.response.headers.get('payment-response'));
    assert.equal(paid.body.insight.testOnly, true);
    const ledger = await new rpc.Server('https://soroban-testnet.stellar.org').getTransaction(receipt.transaction);
    assert.equal(ledger.status, 'SUCCESS');
    const recovered = await request(resource);
    assert.equal(recovered.body.intent.receipt.transaction, receipt.transaction);
    console.log(`Verified real Stellar Testnet x402 payment: ${receipt.transaction}, ledger ${receipt.ledger}`);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    globalThis.localStorage = originalStorage;
    if (userId) {
      process.loadEnvFile(new URL('../server/.env', import.meta.url));
      const { PrismaClient } = require('@prisma/client');
      const db = new PrismaClient();
      try { await db.user.delete({ where: { id: userId } }); }
      finally { await db.$disconnect(); }
    }
  }
});
