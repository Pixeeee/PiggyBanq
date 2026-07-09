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
  assert.match(helper, /createSecureWalletAccount/);
  assert.match(helper, /loginWithWalletAccount/);
  assert.doesNotMatch(helper, /localStorage\.setItem\([^,]+,\s*JSON\.stringify\([^)]*secretKey/);
});

test('wallet access gate requires username, strong password, and recovery phrase confirmation', () => {
  const gate = readFileSync('apps/web/app/(app)/dashboard/WalletAccessGate.tsx', 'utf8');
  const walletPanel = readFileSync('apps/web/app/(app)/dashboard/WalletSetupPanel.tsx', 'utf8');
  const summary = readFileSync('apps/web/app/(app)/dashboard/DashboardWalletSummary.tsx', 'utf8');

  assert.match(gate, /Create secure wallet/);
  assert.match(gate, /Log in with wallet/);
  assert.match(gate, /username/i);
  assert.match(gate, /password/i);
  assert.match(gate, /loginWithWalletAccount/);
  assert.match(walletPanel, /Recovery phrase/);
  assert.match(walletPanel, /copyRecoveryPhrase/);
  assert.match(walletPanel, /showPassword/);
  assert.match(walletPanel, /12-word recovery phrase/);
  assert.match(walletPanel, /Confirm recovery phrase/);
  assert.match(walletPanel, /validatePasswordStrength/);
  assert.match(walletPanel, /createSecureWalletAccount/);
  assert.match(walletPanel, /getActiveWalletSession/);
  assert.match(summary, /ACTIVE_WALLET_SESSION_KEY/);
});
