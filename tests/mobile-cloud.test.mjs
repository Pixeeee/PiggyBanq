import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../apps/mobile/package.json', import.meta.url));
const { Keypair, Networks } = require('@stellar/stellar-sdk');
const { createMobileCloudClient, cloudAmount, validateCloudChallenge, MOBILE_API_URL, WEB_APP_URL } = await import('../apps/mobile/src/dashboard/cloud-api.ts');

const key = Keypair.random();
const wallet = { publicKey: key.publicKey(), secretKey: key.secret() };
const now = Date.now();
function challenge(purpose = 'LOGIN') {
  const expiresAt = new Date(now + 300000).toISOString();
  return {
    challengeId: 'challenge-123', publicKey: wallet.publicKey, expiresAt, purpose, username: 'native_saver',
    message: `${new URL(WEB_APP_URL).host} wants you to sign in with your Stellar account:\n${wallet.publicKey}\n\nSigning this message proves ownership of your Stellar wallet. This action will not create a blockchain transaction or charge a fee.\n\nURI: ${WEB_APP_URL}\nVersion: 1\nStellar Network: TESTNET\nNetwork Passphrase: ${Networks.TESTNET}\nNonce: ${'a'.repeat(32)}\nIssued At: ${new Date(now).toISOString()}\nExpiration Time: ${expiresAt}\nPurpose: ${purpose === 'LOGIN' ? 'Login authentication' : 'Sign-up authentication'}\nApplication: PiggyBanq`
  };
}
function fixture({ registered = true, failPath, otherWallet = false, holdPath } = {}) {
  const calls = [];
  let release;
  const profile = { id: 'user-1', stellarPublicKey: wallet.publicKey, username: 'native_saver', displayName: 'Native saver', bio: '', currency: 'PHP', visibility: 'PRIVATE' };
  const client = createMobileCloudClient({ now: () => now, fetch: async (url, init) => {
    const path = url.slice(MOBILE_API_URL.length);
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ path, ...init, body });
    if (path === holdPath) await new Promise(resolve => { release = resolve; });
    if (path === failPath) return { ok: false, status: 401, json: async () => ({ error: { message: 'Session expired.' } }) };
    let data = {};
    if (path.endsWith('/status')) data = { registered };
    if (path.endsWith('/challenge')) data = challenge(body.purpose);
    if (path.endsWith('/signup') || path.endsWith('/login')) {
      assert.equal(key.verify(Buffer.from(challenge(registered ? 'LOGIN' : 'SIGN_UP').message), Buffer.from(body.signature, 'base64')), true);
      data = { user: profile };
    }
    if (path === '/api/auth/me') data = { user: otherWallet ? { ...profile, stellarPublicKey: Keypair.random().publicKey() } : profile };
    if (path === '/profile/me') data = { profile };
    if (path === '/budget/plans') data = { plans: [] };
    if (path === '/savings/pockets') data = { pockets: [] };
    return { ok: true, status: 200, json: async () => data };
  } });
  return { client, calls, release: () => release?.() };
}

test('native cloud auth signs the same web challenge locally and keeps secrets out of requests', async () => {
  for (const registered of [true, false]) {
    const { client, calls } = fixture({ registered });
    await assert.rejects(client.snapshot(), /Connect/);
    const proof = await client.prepareLogin(wallet.publicKey, 'native_saver');
    assert.equal(proof.purpose, registered ? 'LOGIN' : 'SIGN_UP');
    await client.approveLogin(proof, wallet, () => true);
    assert.equal((await client.snapshot()).profile.stellarPublicKey, wallet.publicKey);
    await client.allocation({ category: 'Rent', amount: '10.25', currency: 'PHP' });
    await client.snapshot();
    await client.updateProfile({ displayName: 'Saver', bio: 'Native', currency: 'USD', visibility: 'PRIVATE' });
    await client.close();
    assert.ok(calls.every(call => call.credentials === 'include'));
    assert.ok(calls.some(call => call.path === '/api/auth/logout'));
    assert.equal(JSON.stringify(calls).includes(wallet.secretKey), false);
    await assert.rejects(client.snapshot(), /locked/);
  }
});

test('native auth rejects tampered domain, network, wallet, purpose, duplicate fields and expiry before signing', async () => {
  const valid = challenge();
  validateCloudChallenge(valid, wallet.publicKey, now);
  for (const invalid of [
    { ...valid, message: valid.message.replace(new URL(WEB_APP_URL).host, 'evil.example') },
    { ...valid, message: valid.message.replace('Stellar Network: TESTNET', 'Stellar Network: PUBLIC') },
    { ...valid, message: valid.message + '\nURI: https://evil.example' },
    { ...valid, purpose: 'SIGN_UP' },
    { ...valid, publicKey: Keypair.random().publicKey() },
    { ...valid, expiresAt: new Date(now - 1).toISOString() }
  ]) assert.throws(() => validateCloudChallenge(invalid, wallet.publicKey, now), /challenge/);
  const { client, calls } = fixture();
  await assert.rejects(client.approveLogin(valid, wallet, () => false), /Unlock/);
  assert.equal(calls.length, 0);
});

test('native session rejects a different wallet and blocks protected requests after expiry', async () => {
  const wrong = fixture({ otherWallet: true });
  await assert.rejects(wrong.client.approveLogin(challenge(), wallet, () => true), /different wallet/);
  await assert.rejects(wrong.client.snapshot(), /Connect/);
  const expired = fixture({ failPath: '/profile/me' });
  await expired.client.approveLogin(challenge(), wallet, () => true);
  await assert.rejects(expired.client.snapshot(), /expired/);
  await assert.rejects(expired.client.allocation({ category: 'Food', amount: '10', currency: 'PHP' }), /Connect/);
});

test('wallet lock discards an in-flight auth response even when transport ignores abort', async () => {
  const pending = fixture({ holdPath: '/api/auth/stellar/login' });
  const completion = pending.client.approveLogin(challenge(), wallet, () => true);
  while (!pending.calls.some(call => call.path.endsWith('/login'))) await new Promise(resolve => setImmediate(resolve));
  await pending.client.close(); pending.release();
  await assert.rejects(completion, /locked|interrupted/);
});

test('cloud amount conversion preserves exact cents without floating-point loss', () => {
  assert.equal(cloudAmount('9007199254740993'), '90071992547409.93');
  assert.equal(cloudAmount('25'), '0.25');
  assert.equal(cloudAmount('-125'), '-1.25');
  for (const value of ['NaN', '1.25', '', '1e5']) assert.throws(() => cloudAmount(value), /invalid/);
});

test('a mutation needs a verified refresh before another write, preventing blind duplicate retries', async () => {
  const { client, calls } = fixture();
  await client.approveLogin(challenge(), wallet, () => true);
  await client.allocation({ category: 'Food', amount: '10', currency: 'PHP' });
  await assert.rejects(client.allocation({ category: 'Food', amount: '10', currency: 'PHP' }), /Refresh/);
  assert.equal(calls.filter(call => call.path === '/budget/allocations').length, 1);
  await client.snapshot();
  await client.allocation({ category: 'Rent', amount: '15', currency: 'PHP' });
});

test('reconnect waits for native cookie cleanup from the previous locked session', async () => {
  const previous = fixture({ holdPath: '/api/auth/logout' });
  await previous.client.approveLogin(challenge(), wallet, () => true);
  const closing = previous.client.close();
  const next = fixture();
  const connecting = next.client.prepareLogin(wallet.publicKey, 'native_saver');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(next.calls.length, 0);
  previous.release();
  await closing;
  assert.equal((await connecting).purpose, 'LOGIN');
});

test('live mobile client shares web account, allocations and profile through the deployed API', { skip: process.env.RUN_MOBILE_CLOUD_LIVE !== '1', timeout: 120000 }, async () => {
  let cookie = '';
  const fetchWithCookieJar = async (url, init) => {
    const response = await fetch(url, { ...init, headers: { ...init.headers, ...(cookie ? { Cookie: cookie } : {}) } });
    const next = response.headers.get('set-cookie');
    if (next) cookie = next.split(';')[0];
    return response;
  };
  const client = createMobileCloudClient({ fetch: fetchWithCookieJar });
  const nativeKey = Keypair.random();
  const nativeWallet = { publicKey: nativeKey.publicKey(), secretKey: nativeKey.secret() };
  try {
    const proof = await client.prepareLogin(nativeWallet.publicKey, `native_${Date.now().toString(36)}`);
    await client.approveLogin(proof, nativeWallet, () => true);
    await client.allocation({ category: 'Native cloud parity', amount: '12.50', currency: 'PHP' });
    await client.snapshot();
    await client.updateProfile({ displayName: 'Native cloud verified', bio: 'Parity test fixture', currency: 'PHP', visibility: 'PRIVATE' });
    const native = await client.snapshot();
    const category = native.plans.flatMap(plan => plan.categories).find(item => item.name === 'Native cloud parity');
    assert.equal(category.amountMinor, '1250');
    const web = await fetch(`${WEB_APP_URL}/backend/budget/plans`, { headers: { Cookie: cookie } });
    assert.equal(web.status, 200);
    assert.ok((await web.json()).plans.flatMap(plan => plan.categories).some(item => item.id === category.id));
    const webProfile = await fetch(`${WEB_APP_URL}/backend/profile/me`, { headers: { Cookie: cookie } });
    assert.equal((await webProfile.json()).profile.displayName, 'Native cloud verified');
    await client.allocation({ category: 'Native edited parity', amount: '15.75', currency: 'USD' }, category.id);
    assert.equal((await client.snapshot()).plans.flatMap(plan => plan.categories).find(item => item.id === category.id).amountMinor, '1575');
    await client.deleteAllocation(category.id);
    assert.equal((await client.snapshot()).plans.flatMap(plan => plan.categories).some(item => item.id === category.id), false);
  } finally { await client.close(); }
});
