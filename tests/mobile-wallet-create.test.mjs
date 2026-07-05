import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('Expo app exposes secure local Stellar testnet wallet creation', () => {
  const modulePath = 'apps/mobile/src/wallet/create-local-wallet.ts';

  assert.equal(existsSync(modulePath), true);

  const module = readFileSync(modulePath, 'utf8');
  const screen = readFileSync('apps/mobile/app/index.tsx', 'utf8');
  const mobilePackage = readFileSync('apps/mobile/package.json', 'utf8');

  assert.match(module, /@stellar\/stellar-sdk/);
  assert.match(module, /expo-secure-store/);
  assert.match(module, /Keypair\.random\(\)/);
  assert.match(module, /SecureStore\.setItemAsync/);
  assert.match(module, /secretKey/);
  assert.match(screen, /Create testnet wallet/);
  assert.match(screen, /createAndStoreLocalWallet/);
  assert.match(mobilePackage, /"@stellar\/stellar-sdk"/);
});
