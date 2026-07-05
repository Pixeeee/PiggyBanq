import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('dashboard exposes a real client-side Stellar testnet wallet creation flow', () => {
  const componentPath = 'apps/web/app/(app)/dashboard/WalletSetupPanel.tsx';

  assert.equal(existsSync(componentPath), true);

  const component = readFileSync(componentPath, 'utf8');
  const helper = readFileSync('apps/web/app/(app)/dashboard/secure-wallet.ts', 'utf8');
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');
  const gate = readFileSync('apps/web/app/(app)/dashboard/WalletAccessGate.tsx', 'utf8');
  const webPackage = readFileSync('apps/web/package.json', 'utf8');

  assert.match(component, /'use client'/);
  assert.match(component, /generateRecoveryPhrase/);
  assert.match(component, /Create secure wallet/);
  assert.match(component, /Recovery phrase/);
  assert.match(component, /Confirm recovery phrase/);
  assert.match(component, /validatePasswordStrength/);
  assert.match(component, /onWalletReady/);
  assert.match(helper, /@stellar\/stellar-sdk/);
  assert.match(helper, /encryptedVault/);
  assert.match(gate, /WalletSetupPanel/);
  assert.match(dashboard, /WalletAccessGate/);
  assert.match(webPackage, /"@stellar\/stellar-sdk"/);
  assert.match(webPackage, /"@scure\/bip39"/);
});
