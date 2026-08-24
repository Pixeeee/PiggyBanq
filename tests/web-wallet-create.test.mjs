import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('web exposes local Stellar wallet sign-up before dashboard access', () => {
  const componentPath = 'apps/web/app/components/WalletAuthFlow.tsx';

  assert.equal(existsSync(componentPath), true);

  const component = readFileSync(componentPath, 'utf8');
  const authApi = readFileSync('apps/web/app/lib/wallet-auth-api.ts', 'utf8');
  const webPackage = JSON.parse(readFileSync('apps/web/package.json', 'utf8'));
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');
  const signup = readFileSync('apps/web/app/(auth)/signup/page.tsx', 'utf8');
  const login = readFileSync('apps/web/app/(auth)/login/page.tsx', 'utf8');

  assert.match(component, /'use client'/);
  assert.match(component, /I have an existing wallet/);
  assert.match(component, /Create a local wallet/);
  assert.match(component, /completeWalletSignup/);
  assert.match(component, /completeWalletLogin/);
  assert.match(component, /Privy identity login/);
  assert.match(component, /Web3Auth identity login/);
  assert.match(component, /provider-icon-privy/);
  assert.match(component, /provider-icon-web3auth/);
  assert.match(component, /choose Google, X, Email, or Phone/);
  assert.match(component, /Choose sign-in method/);
  assert.match(component, /stellar-auth-provider-modal/);
  assert.match(component, /Provider SDK connections are placeholders for this demo/);
  assert.doesNotMatch(component, /Local wallet access is available now/);
  assert.doesNotMatch(component, /Create a local wallet instead/);
  assert.match(component, /Save your Secret Recovery Phrase/);
  assert.equal(webPackage.dependencies['@stellar/freighter-api'], undefined);
  assert.equal(existsSync('apps/web/app/lib/freighter-wallet.ts'), false);
  assert.match(authApi, /credentials:\s*'include'/);
  assert.match(authApi, /\/api\/auth\/stellar\/challenge/);
  assert.match(signup, /WalletAuthFlow mode="signup"/);
  assert.match(login, /WalletAuthFlow mode="login"/);
  assert.match(dashboard, /requireWalletSession/);
  assert.doesNotMatch(dashboard, /WalletAccessGate/);
  assert.doesNotMatch(component, /Freighter|connectFreighterWallet|signFreighterAuthChallenge|@stellar\/freighter-api/);
});
