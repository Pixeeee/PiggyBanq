import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('web exposes a Stellar wallet sign-up flow before dashboard access', () => {
  const componentPath = 'apps/web/app/components/WalletAuthFlow.tsx';

  assert.equal(existsSync(componentPath), true);

  const component = readFileSync(componentPath, 'utf8');
  const authApi = readFileSync('apps/web/app/lib/wallet-auth-api.ts', 'utf8');
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');
  const signup = readFileSync('apps/web/app/(auth)/signup/page.tsx', 'utf8');
  const login = readFileSync('apps/web/app/(auth)/login/page.tsx', 'utf8');

  assert.match(component, /'use client'/);
  assert.match(component, /Create a new wallet/);
  assert.match(component, /PiggyBanq password/);
  assert.match(component, /Save your Secret Recovery Phrase/);
  assert.match(component, /signWalletAuthMessage/);
  assert.match(component, /unlockWalletAccount/);
  assert.match(component, /prepareSecureWalletAccount/);
  assert.match(component, /persistSecureWalletAccount/);
  assert.match(component, /await completeWalletSignup/);
  assert.match(component, /persistSecureWalletAccount\(account\)/);
  assert.doesNotMatch(component, /stellar-auth-language/);
  assert.doesNotMatch(component, />English</);
  assert.match(authApi, /credentials:\s*'include'/);
  assert.match(authApi, /\/api\/auth\/stellar\/challenge/);
  assert.match(signup, /WalletAuthFlow mode="signup"/);
  assert.match(login, /WalletAuthFlow mode="login"/);
  assert.match(dashboard, /requireWalletSession/);
  assert.doesNotMatch(dashboard, /WalletAccessGate/);
});
