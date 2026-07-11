import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('secure wallet helper enforces local account security boundaries', () => {
  const helperPath = 'apps/web/app/(app)/dashboard/secure-wallet.ts';

  assert.equal(existsSync(helperPath), true);

  const helper = readFileSync(helperPath, 'utf8');

  assert.match(helper, /validatePasswordStrength/);
  assert.match(helper, /password\.length < 12/);
  assert.match(helper, /A-Z/);
  assert.match(helper, /a-z/);
  assert.match(helper, /[^A-Za-z0-9]/);
  assert.match(helper, /generateRecoveryPhrase/);
  assert.match(helper, /Array\.from\(\{ length: 12 \}/);
  assert.match(helper, /crypto\.getRandomValues/);
  assert.match(helper, /PBKDF2/);
  assert.match(helper, /AES-GCM/);
  assert.match(helper, /encryptedVault/);
  assert.match(helper, /usernameExists/);
  assert.match(helper, /prepareSecureWalletAccount/);
  assert.match(helper, /persistSecureWalletAccount/);
  assert.match(helper, /createSecureWalletAccount/);
  assert.doesNotMatch(helper, /createSecureWalletAccount[\s\S]*persistSecureWalletAccount\(record\)/);
  assert.match(helper, /loginWithWalletAccount/);
  assert.match(helper, /version:\s*2/);
  assert.match(helper, /kdfIterations:\s*PBKDF2_ITERATIONS/);
  assert.match(helper, /STELLAR_BIP44_PATH/);
  assert.match(helper, /mnemonicToSeedWebcrypto/);
  assert.match(helper, /deriveStellarSeedFromMnemonic/);
  assert.match(helper, /slip10DerivePath/);
  assert.doesNotMatch(helper, /passwordVerifier:\s*await sha256Base64\(derivedBytes\)/);
  assert.doesNotMatch(helper, /localStorage\.setItem\([^,]+,\s*JSON\.stringify\([^)]*secretKey/);
});

test('Stellar auth flow requires wallet ownership challenge before dashboard access', () => {
  const walletAuth = readFileSync('server/src/modules/auth/wallet-auth.ts', 'utf8');
  const routes = readFileSync('server/src/modules/auth/routes.ts', 'utf8');
  const flow = readFileSync('apps/web/app/components/WalletAuthFlow.tsx', 'utf8');
  const summary = readFileSync('apps/web/app/(app)/dashboard/DashboardWalletSummary.tsx', 'utf8');

  assert.match(walletAuth, /verifyStellarSignature/);
  assert.match(walletAuth, /Keypair\.fromPublicKey/);
  assert.match(walletAuth, /createNonce/);
  assert.match(walletAuth, /AUTH_PURPOSES/);
  assert.match(walletAuth, /Expiration Time/);
  assert.match(walletAuth, /Signing this message proves ownership of your Stellar wallet/);
  assert.match(routes, /\/api\/auth\/stellar\/challenge/);
  assert.match(routes, /\/api\/auth\/stellar\/signup/);
  assert.match(routes, /\/api\/auth\/stellar\/login/);
  assert.match(routes, /\/api\/auth\/me/);
  assert.match(routes, /\/api\/auth\/logout/);
  assert.match(routes, /reply\.setCookie/);
  assert.match(routes, /httpOnly:\s*true/);
  assert.match(routes, /sha256\(token\)/);
  assert.match(routes, /usedAt:\s*new Date\(\)/);
  assert.match(flow, /Signing one-time Stellar/);
  assert.match(flow, /signWalletAuthMessage/);
  assert.match(summary, /stellarPublicKey/);
  assert.doesNotMatch(summary, /localStorage/);
});
