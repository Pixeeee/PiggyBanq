import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
  const iconAssetPath = 'apps/mobile/assets/piggy_icon.png';
  const appIndexPath = 'apps/mobile/app/index.tsx';
  const routePaths = [
    appIndexPath,
    'apps/mobile/app/(auth)/home.tsx',
    'apps/mobile/app/(auth)/import-wallet.tsx',
    'apps/mobile/app/(auth)/create-local-wallet.tsx',
    'apps/mobile/app/(auth)/recovery.tsx',
    'apps/mobile/app/(auth)/unlock-wallet.tsx',
    'apps/mobile/app/(auth)/connect/privy.tsx',
    'apps/mobile/app/(auth)/connect/web3auth.tsx',
    'apps/mobile/app/(tabs)/dashboard.tsx',
    'apps/mobile/src/auth/session.tsx',
    'apps/mobile/src/auth/layout.ts',
    'apps/mobile/src/auth/types.ts',
    'apps/mobile/src/auth/components/AuthButton.tsx',
    'apps/mobile/src/auth/components/AuthCard.tsx',
    'apps/mobile/src/auth/components/AuthShell.tsx',
    'apps/mobile/src/auth/components/HomeLogin.tsx',
    'apps/mobile/src/auth/components/ProviderConnectCard.tsx',
    'apps/mobile/src/auth/components/WalletPreviewCard.tsx',
    'apps/mobile/src/dashboard/DashboardHome.tsx',
    'apps/mobile/src/dashboard/SavingsPlans.tsx',
    'apps/mobile/src/dashboard/PiggyCompanion.tsx',
    'apps/mobile/src/ui/banking.tsx',
    'apps/mobile/src/theme.tsx'
  ];

  assert.equal(existsSync(modulePath), true);
  assert.equal(existsSync(pigAssetPath), true);
  assert.equal(existsSync(iconAssetPath), true);
  for (const routePath of routePaths) {
    assert.equal(existsSync(routePath), true, `${routePath} should exist`);
  }

  const module = readFileSync(modulePath, 'utf8');
  const layout = readFileSync('apps/mobile/app/_layout.tsx', 'utf8');
  const appIndex = readFileSync(appIndexPath, 'utf8');
  const sessionSource = readFileSync('apps/mobile/src/auth/session.tsx', 'utf8');
  const screen = routePaths.map((routePath) => readFileSync(routePath, 'utf8')).join('\n');
  const mobileTheme = readFileSync('apps/mobile/src/theme.tsx', 'utf8');
  const polyfill = readFileSync('apps/mobile/src/polyfills/stellar-sdk-react-native.ts', 'utf8');
  const mobileAppConfig = JSON.parse(readFileSync('apps/mobile/app.json', 'utf8'));
  const mobilePackage = readFileSync('apps/mobile/package.json', 'utf8');
  const mobilePackageJson = JSON.parse(mobilePackage);
  const polyfillImportIndex = layout.indexOf("../src/polyfills/stellar-sdk-react-native");
  const sessionImportIndex = layout.indexOf("../src/auth/session");
  const walletImportIndex = sessionSource.indexOf("../wallet/create-local-wallet");

  assert.doesNotMatch(module, /import\s+\{\s*Keypair\s*\}\s+from ['"]@stellar\/stellar-sdk['"]/);
  assert.doesNotMatch(readFileSync('apps/mobile/src/wallet/local-wallet.ts', 'utf8'), /import\s+\{\s*Keypair\s*\}\s+from ['"]@stellar\/stellar-sdk['"]/);
  assert.notEqual(polyfillImportIndex, -1);
  assert.notEqual(sessionImportIndex, -1);
  assert.equal(polyfillImportIndex < sessionImportIndex, true);
  assert.notEqual(walletImportIndex, -1);
  assert.match(polyfill, /Buffer\s*=/);
  assert.match(polyfill, /crypto\.getRandomValues\s*=/);
  assert.match(polyfill, /eventGlobal\.Event\s*=/);
  assert.match(polyfill, /eventGlobal\.EventTarget\s*=/);
  assert.match(polyfill, /eventGlobal\.MessageEvent\s*=/);
  assert.equal(mobileAppConfig.expo.icon, './assets/piggy_icon_square.png');
  assert.equal(fileHash(pigAssetPath), fileHash('apps/web/public/piggy.gif'));
  assert.equal(fileHash(iconAssetPath), fileHash('apps/web/public/piggy_icon.png'));
  assert.match(module, /expo-secure-store/);
  assert.match(module, /createRandomStellarWalletKeys\(\)/);
  assert.match(module, /SecureStore\.isAvailableAsync/);
  assert.match(module, /SecureStore\.setItemAsync/);
  assert.match(module, /localStorage/);
  assert.match(module, /canUseLocalWebPreview/);
  assert.match(module, /Platform\.OS, __DEV__/);
  assert.match(module, /unlockStoredLocalWallet/);
  assert.match(sessionSource, /AppState\.addEventListener/);
  assert.match(sessionSource, /hasStoredWallet/);
  assert.match(sessionSource, /confirmStoredWalletBackup/);
  assert.doesNotMatch(sessionSource, /loadStoredLocalWallet/);
  assert.doesNotMatch(appIndex, /MobileAuthFlow/);
  assert.doesNotMatch(appIndex, /WalletPanel/);
  assert.match(appIndex, /SplashScreen/);
  assert.match(screen, /I have a wallet/);
  assert.match(screen, /Create wallet/);
  assert.doesNotMatch(screen, /Freighter/);
  assert.equal(existsSync('apps/mobile/app/(auth)/connect/freighter.tsx'), false);
  assert.match(screen, /Keys never leave your device\. Ever\./);
  assert.match(screen, /textDecorationLine: 'underline'/);
  assert.match(layout, /headerShown: false/);
  assert.match(layout, /SafeAreaProvider/);
  assert.match(layout, /MobileThemeProvider/);
  assert.match(mobileTheme, /useColorScheme/);
  assert.match(mobileTheme, /MobileThemeChoice = 'system' \| 'light' \| 'dark'/);
  assert.match(mobileTheme, /mobileThemePalettes/);
  assert.match(mobileTheme, /dark:/);
  assert.match(screen, /ThemeSelector/);
  assert.match(screen, /resolvedTheme/);
  assert.match(screen, /useSafeAreaInsets/);
  assert.match(screen, /useWindowDimensions/);
  assert.match(screen, /createLoginFitLayout/);
  assert.match(screen, /ProviderConnectCard/);
  assert.match(screen, /native connection is not wired yet/);
  assert.match(screen, /dashboard/);
  assert.match(screen, /PiggyBanq password/);
  assert.match(screen, /Save your wallet backup/);
  assert.match(screen, /Unlock PiggyBanq/);
  assert.match(screen, /piggy\.gif/);
  assert.match(screen, /SavingsPlans/);
  assert.match(screen, /Create allocation/);
  assert.match(screen, /Move up/);
  assert.match(screen, /Move down/);
  assert.match(screen, /Delete/);
  assert.match(screen, /flexWrap: 'wrap'/);
  assert.match(screen, /BottomNav/);
  assert.match(screen, /createAndStoreLocalWallet/);
  assert.match(screen, /importAndStoreLocalWallet/);
  assert.match(screen, /createMobilePaymentReview/);
  assert.match(mobilePackage, /"@stellar\/stellar-sdk"/);
  assert.equal(mobilePackageJson.main, 'expo-router/entry');
  assert.equal(mobilePackageJson.dependencies['@expo/metro-runtime'], '~6.1.2');
  assert.equal(mobilePackageJson.dependencies['expo-constants'], '~18.0.14');
  assert.equal(mobilePackageJson.dependencies['expo-linking'], '~8.0.12');
  assert.equal(mobilePackageJson.dependencies['expo-local-authentication'], '~17.0.9');
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

test('mobile import validates Stellar secret keys and derives the matching public key', async () => {
  const imported = await parseImportedSecretKey('SCS6RVYOU6MSNCJBPFRFLRPRXDQWXPRMX5NSCJL5GM5NFSYWXE5VIPHG');

  assert.deepEqual(imported, {
    publicKey: 'GCVGERXCFVEQD3KFZPDMFEUWT553QO3HLHP6XXZX2BR2N7A46EGRBROG',
    secretKey: 'SCS6RVYOU6MSNCJBPFRFLRPRXDQWXPRMX5NSCJL5GM5NFSYWXE5VIPHG'
  });
  await assert.rejects(() => parseImportedSecretKey('not-a-stellar-secret'), /valid Stellar secret key/);
});

function fileHash(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}
