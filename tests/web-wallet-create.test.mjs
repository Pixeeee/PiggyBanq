import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('web exposes Freighter-first Stellar wallet sign-up before dashboard access', () => {
  const componentPath = 'apps/web/app/components/WalletAuthFlow.tsx';

  assert.equal(existsSync(componentPath), true);

  const component = readFileSync(componentPath, 'utf8');
  const freighter = readFileSync('apps/web/app/lib/freighter-wallet.ts', 'utf8');
  const walletSurface = `${component}\n${freighter}`;
  const authApi = readFileSync('apps/web/app/lib/wallet-auth-api.ts', 'utf8');
  const webPackage = JSON.parse(readFileSync('apps/web/package.json', 'utf8'));
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');
  const signup = readFileSync('apps/web/app/(auth)/signup/page.tsx', 'utf8');
  const login = readFileSync('apps/web/app/(auth)/login/page.tsx', 'utf8');

  assert.match(component, /'use client'/);
  assert.match(component, /Continue with Freighter/);
  assert.match(component, /connectFreighterWallet/);
  assert.match(component, /signFreighterAuthChallenge/);
  assert.match(component, /completeWalletSignup/);
  assert.match(component, /completeWalletLogin/);
  assert.match(walletSurface, /Privy identity login/);
  assert.match(walletSurface, /Web3Auth identity login/);
  assert.match(walletSurface, /Google, X, email, or phone/);
  assert.match(walletSurface, /Freighter is still required before Stellar actions/);
  assert.match(component, /I have an existing wallet/);
  assert.match(component, /Create a local wallet instead/);
  assert.match(component, /Save your Secret Recovery Phrase/);
  assert.match(freighter, /@stellar\/freighter-api/);
  assert.match(freighter, /requestAccess/);
  assert.match(freighter, /getNetwork/);
  assert.match(freighter, /signMessage/);
  assert.match(freighter, /TESTNET/);
  assert.equal(webPackage.dependencies['@stellar/freighter-api'], '^4.1.0');
  assert.match(authApi, /credentials:\s*'include'/);
  assert.match(authApi, /\/api\/auth\/stellar\/challenge/);
  assert.match(signup, /WalletAuthFlow mode="signup"/);
  assert.match(login, /WalletAuthFlow mode="login"/);
  assert.match(dashboard, /requireWalletSession/);
  assert.doesNotMatch(dashboard, /WalletAccessGate/);
});