import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('protected route loading states are visual only and preserve wallet safety', () => {
  const dashboardLoadingPath = 'apps/web/app/(app)/dashboard/loading.tsx';
  const authLoadingPath = 'apps/web/app/(auth)/loading.tsx';

  assert.equal(existsSync(dashboardLoadingPath), true);
  assert.equal(existsSync(authLoadingPath), true);

  const dashboardLoading = readFileSync(dashboardLoadingPath, 'utf8');
  const authLoading = readFileSync(authLoadingPath, 'utf8');
  const dashboardPage = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');

  assert.match(dashboardLoading, /Verifying secure wallet session/);
  assert.match(dashboardLoading, /private keys local/i);
  assert.match(authLoading, /Preparing secure wallet access/);
  assert.match(authLoading, /backend only verifies signed challenges/i);
  assert.match(dashboardPage, /requireWalletSession/);

  const loadingSource = `${dashboardLoading}\n${authLoading}`;
  assert.doesNotMatch(loadingSource, /secretKey|encryptedVault|localStorage|ACTIVE_WALLET_SESSION_KEY/);
});

test('wallet auth keeps the UI busy while the verified dashboard opens', () => {
  const flow = readFileSync('apps/web/app/components/WalletAuthFlow.tsx', 'utf8');

  assert.match(flow, /const \[isNavigating, setNavigating\] = useState\(false\)/);
  assert.match(flow, /const isWorking = isBusy \|\| isNavigating/);
  assert.match(flow, /stellar-auth-transition/);
  assert.match(flow, /router\.prefetch\('\/dashboard'\)/);
  assert.match(flow, /router\.replace\('\/dashboard'\)/);
});
