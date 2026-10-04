import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImportedSecretKey } from '../apps/mobile/src/wallet/local-wallet.ts';
import { prepareSecureWalletAccount } from '../apps/web/app/(app)/dashboard/secure-wallet.ts';

test('Android imports the same wallet as a web 12-word recovery phrase', async () => {
  globalThis.localStorage = { getItem: () => null };
  const recoveryPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const web = await prepareSecureWalletAccount({ username: 'cross_platform', password: 'RecoveryParity!2026', recoveryPhrase });
  const mobile = await parseImportedSecretKey(recoveryPhrase);
  assert.equal(mobile.publicKey, web.publicKey);
  assert.equal(mobile.secretKey, web.vault.secretKey);
  await assert.rejects(parseImportedSecretKey('abandon '.repeat(12)), /valid/);
});
