import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  canActivateWallet,
  createMobilePaymentReview,
  getWalletActivationStatus,
  parseImportedSecretKey
} from '../apps/mobile/src/wallet/local-wallet.ts';

test('Expo app exposes secure local Stellar testnet wallet creation', () => {
  const modulePath = 'apps/mobile/src/wallet/create-local-wallet.ts';
  const pigAssetPath = 'apps/mobile/assets/piggy.gif';

  assert.equal(existsSync(modulePath), true);
  assert.equal(existsSync(pigAssetPath), true);

  const module = readFileSync(modulePath, 'utf8');
  const screen = readFileSync('apps/mobile/app/index.tsx', 'utf8');
  const mobilePackage = readFileSync('apps/mobile/package.json', 'utf8');
  const mobilePackageJson = JSON.parse(mobilePackage);

  assert.match(module, /@stellar\/stellar-sdk/);
  assert.match(module, /expo-secure-store/);
  assert.match(module, /Keypair\.random\(\)/);
  assert.match(module, /SecureStore\.isAvailableAsync/);
  assert.match(module, /SecureStore\.setItemAsync/);
  assert.match(module, /localStorage/);
  assert.match(module, /web preview fallback/);
  assert.match(module, /secretKey/);
  assert.match(screen, /MobileWalletEntry/);
  assert.match(screen, /Stellar self-custodial wallet/);
  assert.match(screen, /Create a new wallet/);
  assert.match(screen, /I have an existing wallet/);
  assert.match(screen, /piggy\.gif/);
  assert.match(screen, /Create testnet wallet/);
  assert.match(screen, /Import existing wallet/);
  assert.match(screen, /Import Stellar secret key/);
  assert.match(screen, /Back up secret key/);
  assert.match(screen, /Savings workspace/);
  assert.match(screen, /Transaction review/);
  assert.match(screen, /BottomNav/);
  assert.match(screen, /createAndStoreLocalWallet/);
  assert.match(screen, /importAndStoreLocalWallet/);
  assert.match(screen, /createMobilePaymentReview/);
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

test('mobile wallet activation requires wallet, SecureStore, and backup confirmation', () => {
  assert.equal(getWalletActivationStatus({
    publicKey: '',
    mnemonicBackedUp: false,
    storedInSecureStore: false
  }), 'needs_wallet');

  assert.equal(getWalletActivationStatus({
    publicKey: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    mnemonicBackedUp: false,
    storedInSecureStore: true
  }), 'needs_backup');

  assert.equal(getWalletActivationStatus({
    publicKey: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    mnemonicBackedUp: true,
    storedInSecureStore: false
  }), 'needs_secure_store');

  assert.equal(canActivateWallet({
    publicKey: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    mnemonicBackedUp: true,
    storedInSecureStore: true
  }), true);
});

test('mobile payment review exposes confirmation, trustline, and polling safety copy', () => {
  const review = createMobilePaymentReview({
    amount: '25.00',
    assetCode: 'USDC',
    destination: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    estimatedFeeStroops: '100'
  });

  assert.deepEqual(review.confirmation, {
    amount: '25.00',
    assetCode: 'USDC',
    destination: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    estimatedFeeStroops: '100',
    requiresUserSignature: true,
    network: 'TESTNET'
  });
  assert.equal(review.requiresTrustline, true);
  assert.equal(review.networkLabel, 'TESTNET');
  assert.match(review.pollingCopy, /PENDING is not success/);
});

test('mobile import validates Stellar secret keys and derives the matching public key', () => {
  const imported = parseImportedSecretKey('SCS6RVYOU6MSNCJBPFRFLRPRXDQWXPRMX5NSCJL5GM5NFSYWXE5VIPHG');

  assert.deepEqual(imported, {
    publicKey: 'GCVGERXCFVEQD3KFZPDMFEUWT553QO3HLHP6XXZX2BR2N7A46EGRBROG',
    secretKey: 'SCS6RVYOU6MSNCJBPFRFLRPRXDQWXPRMX5NSCJL5GM5NFSYWXE5VIPHG'
  });
  assert.throws(() => parseImportedSecretKey('not-a-stellar-secret'), /valid Stellar secret key/);
});