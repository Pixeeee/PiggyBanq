import test from 'node:test';
import assert from 'node:assert/strict';
import { createRandomStellarWalletKeys, parseImportedSecretKey } from '../apps/mobile/src/wallet/local-wallet.ts';
import { prepareSecureWalletAccount } from '../apps/web/app/(app)/dashboard/secure-wallet.ts';
import { createWalletRepository } from '../apps/mobile/src/wallet/wallet-vault.ts';

test('Android imports the same wallet as a web 12-word recovery phrase', async () => {
  globalThis.localStorage = { getItem: () => null };
  const recoveryPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const web = await prepareSecureWalletAccount({ username: 'cross_platform', password: 'RecoveryParity!2026', recoveryPhrase });
  const mobile = await parseImportedSecretKey(recoveryPhrase);
  assert.equal(mobile.publicKey, web.publicKey);
  assert.equal(mobile.secretKey, web.vault.secretKey);
  await assert.rejects(parseImportedSecretKey('abandon '.repeat(12)), /valid/);
});

test('new native wallets can be restored on web with the same twelve-word phrase', async () => {
  globalThis.localStorage = { getItem: () => null };
  const native = await createRandomStellarWalletKeys();
  assert.equal(native.recoveryPhrase.split(' ').length, 12);
  const restored = await prepareSecureWalletAccount({ username: 'native_restore', password: 'RecoveryParity!2026', recoveryPhrase: native.recoveryPhrase });
  assert.equal(restored.publicKey, native.publicKey);
  assert.equal(restored.vault.secretKey, native.secretKey);
});

test('native recovery phrase survives protected reload; a mismatched phrase preserves and rejects the record', async () => {
  let saved = null;
  const repository = createWalletRepository({ read: async () => saved, write: async value => { saved = value; }, kind: 'secure-store' }, {
    create: createRandomStellarWalletKeys, parse: parseImportedSecretKey
  }, async () => crypto.getRandomValues(new Uint8Array(16)));
  const created = await repository.create('NativeRecovery!2026', 'native_phrase');
  await repository.confirmBackup(created.publicKey);
  const unlocked = await repository.unlock('NativeRecovery!2026');
  assert.equal(unlocked.recoveryPhrase, created.recoveryPhrase);
  assert.equal(unlocked.backupConfirmed, true);
  const other = await createRandomStellarWalletKeys();
  saved = JSON.stringify({ ...unlocked, recoveryPhrase: other.recoveryPhrase });
  const damaged = saved;
  await assert.rejects(repository.unlock('NativeRecovery!2026'), /damaged/);
  assert.equal(saved, damaged);
});
