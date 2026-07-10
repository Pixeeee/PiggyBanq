import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('Expo app exposes secure local Stellar testnet wallet creation', () => {
  const modulePath = 'apps/mobile/src/wallet/create-local-wallet.ts';

  assert.equal(existsSync(modulePath), true);

  const module = readFileSync(modulePath, 'utf8');
  const screen = readFileSync('apps/mobile/app/index.tsx', 'utf8');
  const mobilePackage = readFileSync('apps/mobile/package.json', 'utf8');
  const mobilePackageJson = JSON.parse(mobilePackage);

  assert.match(module, /@stellar\/stellar-sdk/);
  assert.match(module, /expo-secure-store/);
  assert.match(module, /Keypair\.random\(\)/);
  assert.match(module, /SecureStore\.setItemAsync/);
  assert.match(module, /secretKey/);
  assert.match(screen, /Create testnet wallet/);
  assert.match(screen, /createAndStoreLocalWallet/);
  assert.match(mobilePackage, /"@stellar\/stellar-sdk"/);
  assert.equal(mobilePackageJson.main, 'expo-router/entry');
  assert.equal(mobilePackageJson.dependencies['@expo/metro-runtime'], '~6.1.2');
  assert.equal(mobilePackageJson.dependencies['expo-constants'], '~18.0.13');
  assert.equal(mobilePackageJson.dependencies['expo-linking'], '~8.0.12');
  assert.equal(mobilePackageJson.dependencies['expo-local-authentication'], '~17.0.8');
  assert.equal(mobilePackageJson.dependencies['expo-router'], '~6.0.24');
  assert.equal(mobilePackageJson.dependencies['expo-secure-store'], '~15.0.8');
  assert.equal(mobilePackageJson.dependencies.react, '19.1.0');
  assert.equal(mobilePackageJson.dependencies['react-dom'], '19.1.0');
  assert.equal(mobilePackageJson.dependencies['react-native'], '0.81.5');
  assert.equal(mobilePackageJson.dependencies['react-native-web'], '~0.21.0');
  assert.equal(mobilePackageJson.dependencies['react-native-safe-area-context'], '~5.6.0');
  assert.equal(mobilePackageJson.dependencies['react-native-screens'], '~4.16.0');
  assert.equal(mobilePackageJson.devDependencies['@types/react'], '~19.1.10');
  assert.equal(mobilePackageJson.devDependencies['@types/react-dom'], '~19.1.0');
});
