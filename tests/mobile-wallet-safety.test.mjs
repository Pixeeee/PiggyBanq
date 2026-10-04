import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../server/package.json', import.meta.url));
const { register } = await import(require.resolve('tsx/esm/api')); register();
const { createWalletRepository, canUseLocalWebPreview, shouldLockWalletForAppState } = await import('../apps/mobile/src/wallet/wallet-vault.ts');
const { Keypair } = require('@stellar/stellar-sdk');
const password = 'Mobile!Password2026';
function fixture(initial = null) {
  let value = initial;
  const repository = createWalletRepository({
    read: async () => value, write: async next => { value = next; }, kind: 'secure-store'
  }, {
    create: async () => { const key = Keypair.random(); return { publicKey: key.publicKey(), secretKey: key.secret() }; },
    parse: async secret => { const key = Keypair.fromSecret(secret); return { publicKey: key.publicKey(), secretKey: key.secret() }; }
  }, async () => crypto.getRandomValues(new Uint8Array(16)));
  return { repository, stored: () => value };
}
test('plaintext preview is limited to development web on exact loopback hosts', () => {
  assert.equal(canUseLocalWebPreview('web', true, 'localhost'), true);
  assert.equal(canUseLocalWebPreview('web', true, '127.0.0.1'), true);
  for (const [platform, development, host] of [['android', true, 'localhost'], ['ios', true, 'localhost'], ['web', false, 'localhost'], ['web', true, 'production.example'], ['web', true, 'localhost.evil.example'], ['web', true, '']]) {
    assert.equal(canUseLocalWebPreview(platform, development, host), false);
  }
});
test('background always locks; only our own temporary inactive device-auth dialog is exempt', () => {
  assert.equal(shouldLockWalletForAppState('active', false), false);
  assert.equal(shouldLockWalletForAppState('inactive', false), true);
  assert.equal(shouldLockWalletForAppState('inactive', true), false);
  assert.equal(shouldLockWalletForAppState('background', false), true);
  assert.equal(shouldLockWalletForAppState('background', true), true);
});
test('native wallet persists salted password credentials and backup across fresh repository', async () => {
  const first = fixture();
  const wallet = await first.repository.create(password, 'saver');
  assert.equal(first.stored().includes(password), false);
  assert.equal(wallet.backupConfirmed, false);
  assert.deepEqual(await first.repository.inspect(), { hasStoredWallet: true, legacyWalletNeedsPassword: false });
  await assert.rejects(first.repository.unlock('Wrong!Password2026'), /incorrect/);
  await first.repository.confirmBackup(wallet.publicKey);
  const restarted = fixture(first.stored());
  assert.equal((await restarted.repository.unlock(password)).backupConfirmed, true);
  assert.equal((await restarted.repository.unlock(password)).publicKey, wallet.publicKey);
});
test('create/import cannot overwrite existing wallet, including corrupt storage', async () => {
  const first = fixture(); await first.repository.create(password, 'saver');
  const before = first.stored();
  await assert.rejects(first.repository.create(password, 'another'), /already/);
  await assert.rejects(first.repository.import('not a key', password, 'another'), /already/);
  assert.equal(first.stored(), before);
  const corrupt = fixture('{broken');
  await assert.rejects(corrupt.repository.inspect(), /damaged/);
  await assert.rejects(corrupt.repository.create(password, 'saver'), /already/);
  assert.equal(corrupt.stored(), '{broken');
});
test('legacy migration preserves existing keys and cannot replace a protected password', async () => {
  const key = Keypair.random();
  const first = fixture(JSON.stringify({ publicKey: key.publicKey(), secretKey: key.secret(), createdAt: '2026-01-01T00:00:00.000Z', storageKind: 'secure-store' }));
  assert.equal((await first.repository.inspect()).legacyWalletNeedsPassword, true);
  await assert.rejects(first.repository.unlock(password), /password/);
  const migrated = await first.repository.protectLegacy(password, 'saver');
  assert.equal(migrated.secretKey, key.secret());
  assert.equal(migrated.createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal((await first.repository.unlock(password)).publicKey, key.publicKey());
  await assert.rejects(first.repository.protectLegacy('Another!Password2026', 'saver'), /already/);
});
test('concurrent setup cannot race and replace another newly created wallet', async () => {
  const first = fixture();
  const results = await Promise.allSettled([first.repository.create(password, 'saver'), first.repository.create(password, 'another')]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await first.repository.unlock(password)).publicKey, results.find(result => result.status === 'fulfilled').value.publicKey);
});
test('invalid key pair or weak password fails without writing', async () => {
  const first = fixture();
  await assert.rejects(first.repository.create('short', 'saver'), /12/);
  await assert.rejects(first.repository.import('invalid', password, 'saver'));
  assert.equal(first.stored(), null);
  const key = Keypair.random();
  const mismatch = fixture(JSON.stringify({ publicKey: Keypair.random().publicKey(), secretKey: key.secret(), createdAt: new Date().toISOString() }));
  await assert.rejects(mismatch.repository.inspect(), /damaged/);
});
