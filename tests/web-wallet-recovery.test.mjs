import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '../apps/web/node_modules/@stellar/stellar-sdk/lib/esm/index.js';
import * as wallet from '../apps/web/app/(app)/dashboard/secure-wallet.ts';

// Public BIP39 test vectors, never funded accounts.
const phrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const otherPhrase = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
const input = { username: 'test_saver', password: 'Replacement!Password9', recoveryPhrase: phrase };

beforeEach(() => {
  const data = new Map();
  globalThis.localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key)
  };
});

test('recovery proves ownership and persists only after matching server identity', async () => {
  const original = await wallet.prepareSecureWalletAccount(input);
  const recovered = await wallet.recoverSecureWalletAccount(input, async (account) => {
    assert.equal(wallet.readAccounts().length, 0);
    assert.equal(account.publicKey, original.publicKey);
    const message = 'PiggyBanq one-time test recovery ownership challenge';
    assert.equal(Keypair.fromPublicKey(account.publicKey).verify(
      Buffer.from(message), Buffer.from(wallet.signWalletAuthMessage(account.vault.secretKey, message), 'base64')
    ), true);
    return { username: input.username, stellarPublicKey: account.publicKey };
  });
  assert.equal(recovered.publicKey, original.publicKey);
  const stored = localStorage.getItem(wallet.WALLET_ACCOUNTS_KEY);
  assert.equal(stored.includes(phrase), false);
  assert.equal(stored.includes(recovered.vault.secretKey), false);
  assert.equal((await wallet.unlockWalletAccount(input.username, input.password)).vault.publicKey, original.publicKey);
});

test('recovery rotates forgotten local password for the same wallet without duplicates', async () => {
  const original = await wallet.prepareSecureWalletAccount({ ...input, password: 'Original!Password9' });
  wallet.persistSecureWalletAccount(original);
  await wallet.recoverSecureWalletAccount(input, async (account) => ({ username: input.username, stellarPublicKey: account.publicKey }));
  assert.equal(wallet.readAccounts().length, 1);
  assert.equal((await wallet.unlockWalletAccount(input.username, input.password)).account.publicKey, original.publicKey);
  await assert.rejects(wallet.unlockWalletAccount(input.username, 'Original!Password9'), /incorrect/);
});

test('server rejection and identity mismatch leave encrypted accounts untouched', async () => {
  const original = await wallet.prepareSecureWalletAccount(input);
  wallet.persistSecureWalletAccount(original);
  const before = localStorage.getItem(wallet.WALLET_ACCOUNTS_KEY);
  await assert.rejects(wallet.recoverSecureWalletAccount(input, async () => { throw new Error('Server unavailable'); }), /Server unavailable/);
  await assert.rejects(wallet.recoverSecureWalletAccount(input, async (account) => ({ username: 'somebody_else', stellarPublicKey: account.publicKey })), /identity/);
  await assert.rejects(wallet.recoverSecureWalletAccount(input, async () => ({ username: input.username, stellarPublicKey: Keypair.random().publicKey() })), /identity/);
  assert.equal(localStorage.getItem(wallet.WALLET_ACCOUNTS_KEY), before);
});

test('recovery cannot overwrite a different local wallet under the same username', async () => {
  wallet.persistSecureWalletAccount(await wallet.prepareSecureWalletAccount({ ...input, recoveryPhrase: otherPhrase }));
  const before = localStorage.getItem(wallet.WALLET_ACCOUNTS_KEY);
  let authenticated = false;
  await assert.rejects(wallet.recoverSecureWalletAccount(input, async () => { authenticated = true; }), /different wallet/);
  assert.equal(authenticated, false);
  assert.equal(localStorage.getItem(wallet.WALLET_ACCOUNTS_KEY), before);
});

test('invalid recovery phrase never calls authentication or writes storage', async () => {
  let authenticated = false;
  await assert.rejects(wallet.recoverSecureWalletAccount({ ...input, recoveryPhrase: 'invalid phrase' }, async () => { authenticated = true; }), /invalid/);
  assert.equal(authenticated, false);
  assert.equal(wallet.readAccounts().length, 0);
});
