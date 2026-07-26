import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('dashboard requires server-verified Stellar session before showing app tools', () => {
  const flowPath = 'apps/web/app/components/WalletAuthFlow.tsx';

  assert.equal(existsSync(flowPath), true);

  const flow = readFileSync(flowPath, 'utf8');
  const session = readFileSync('apps/web/app/(app)/dashboard/_lib/session.ts', 'utf8');
  const routes = readFileSync('server/src/modules/auth/routes.ts', 'utf8');

  assert.match(flow, /'use client'/);
  assert.match(flow, /Continue with Freighter/);
  assert.match(flow, /Freighter is still required before Stellar actions/);
  assert.match(flow, /I have an existing wallet/);
  assert.match(flow, /signFreighterAuthChallenge/);
  assert.match(session, /cookies\(\)/);
  assert.match(session, /\/api\/auth\/me/);
  assert.match(session, /redirect\('\/login'\)/);
  assert.match(routes, /reply\.setCookie/);
});

test('dashboard focuses on savings allocations without community workspace links', () => {
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');
  const shell = readFileSync('apps/web/app/(app)/dashboard/_components/DashboardShell.tsx', 'utf8');
  const data = readFileSync('apps/web/app/(app)/dashboard/_data/savings-dashboard.ts', 'utf8');
  const allocations = readFileSync('apps/web/app/(app)/dashboard/allocations/page.tsx', 'utf8');
  const pockets = readFileSync('apps/web/app/(app)/dashboard/pockets/page.tsx', 'utf8');
  const goals = readFileSync('apps/web/app/(app)/dashboard/goals/page.tsx', 'utf8');
  const profile = readFileSync('apps/web/app/(app)/dashboard/profile/page.tsx', 'utf8');
  const profileForm = readFileSync('apps/web/app/(app)/dashboard/profile/ProfileForm.tsx', 'utf8');
  const overviewManager = readFileSync('apps/web/app/(app)/dashboard/OverviewManager.tsx', 'utf8');
  const allocationManager = readFileSync('apps/web/app/(app)/dashboard/allocations/AllocationsManager.tsx', 'utf8');
  const pocketsManager = readFileSync('apps/web/app/(app)/dashboard/pockets/PocketsManager.tsx', 'utf8');
  const goalsManager = readFileSync('apps/web/app/(app)/dashboard/goals/GoalsManager.tsx', 'utf8');
  const walletApi = readFileSync('apps/web/app/lib/wallet-auth-api.ts', 'utf8');
  const savingsRoutes = readFileSync('server/src/modules/savings/routes.ts', 'utf8');
  const css = readFileSync('apps/web/app/globals.css', 'utf8');

  assert.match(dashboard, /requireWalletSession/);
  assert.match(shell, /\/dashboard\/allocations/);
  assert.match(shell, /\/dashboard\/pockets/);
  assert.match(shell, /\/dashboard\/goals/);
  assert.match(shell, /\/dashboard\/profile/);
  assert.match(data, /Food/);
  assert.match(data, /Bills/);
  assert.match(data, /Emergency/);
  assert.match(data, /XLM Savings/);
  assert.match(data, /dailyAssetFlows/);
  assert.match(data, /earningPockets/);
  assert.match(data, /userGoals/);
  assert.match(dashboard, /Your savings workspace is organized for this month/);
  assert.match(shell, /savings-dashboard-shell/);
  assert.match(shell, /savings-dashboard-app/);
  assert.match(dashboard, /No silent signing/);
  assert.match(dashboard, /Confirm amount, asset, destination, and fee/);
  assert.match(data, /XLM and USDT savings first/);
  assert.match(allocations, /Daily inflow and outflow/);
  assert.match(pockets, /Allocate XLM and USDT into earning pockets/);
  assert.match(goals, /Create budgets for bills and things you want to buy/);
  assert.match(profile, /Update your profile and dashboard theme/);
  assert.match(dashboard, /OverviewManager/);
  assert.match(overviewManager, /getBudgetPlans/);
  assert.match(overviewManager, /getSavingsPockets/);
  assert.match(allocations, /AllocationsManager/);
  assert.match(pockets, /PocketsManager/);
  assert.match(goals, /GoalsManager/);
  assert.match(allocationManager, /createBudgetAllocation/);
  assert.match(goalsManager, /createBudgetAllocation/);
  assert.match(pocketsManager, /createSavingsPocket/);
  assert.match(pocketsManager, /createSavingsPocketEvent/);
  assert.match(pocketsManager, /previewLockedEarning/);
  assert.match(pocketsManager, /PiggyBanq Earning Pockets currently run on Stellar Testnet/);
  assert.match(profileForm, /getProfile/);
  assert.match(profileForm, /updateProfile/);
  assert.match(walletApi, /getSavingsPockets/);
  assert.match(walletApi, /createSavingsPocket/);
  assert.match(walletApi, /createSavingsPocketEvent/);
  assert.match(walletApi, /withdrawSavingsPocket/);
  assert.match(walletApi, /markSavingsPocketMatured/);
  assert.match(savingsRoutes, /prisma\.savingsPocket\.create/);
  assert.match(savingsRoutes, /prisma\.ledgerEvent\.create/);
  assert.match(savingsRoutes, /\/savings\/pockets\/:id\/events/);
  assert.match(savingsRoutes, /\/savings\/pockets\/earning-preview/);
  assert.match(savingsRoutes, /POCKET_NOT_MATURED/);
  assert.match(css, /\.savings-dashboard-shell/);
  assert.match(css, /\.savings-dashboard-app/);
  assert.match(css, /\.flow-chart/);
  assert.match(css, /\.pocket-card/);
  assert.match(css, /\.live-manager-card/);
  assert.match(css, /\.manager-table/);
  assert.match(css, /\.manager-disclaimer/);
  assert.match(css, /\.profile-form-card/);
  assert.match(css, /#ddb9ea/i);
  assert.doesNotMatch(shell, /\/dashboard\/community/);
  assert.doesNotMatch(dashboard, /DashboardFeaturePanels/);
  assert.doesNotMatch(dashboard, /CommunityDashboard/);
  assert.doesNotMatch(dashboard, /relief|pledge|Global chat|Private chat/i);
});

test('dashboard reflects the authenticated wallet in savings workspace', () => {
  const shell = readFileSync('apps/web/app/(app)/dashboard/_components/DashboardShell.tsx', 'utf8');

  assert.match(shell, /stellarPublicKey/);
  assert.match(shell, /accountLabel/);
  assert.match(shell, /No wallet linked/);
  assert.match(shell, /NETWORK/);
  assert.doesNotMatch(shell, /localStorage/);
});

test('theme control exposes an explicit light dark system dropdown', () => {
  const themeToggle = readFileSync('apps/web/app/components/ThemeToggle.tsx', 'utf8');
  const css = readFileSync('apps/web/app/globals.css', 'utf8');

  assert.match(themeToggle, /select/);
  assert.match(themeToggle, /option value="system"/);
  assert.match(themeToggle, /option value="light"/);
  assert.match(themeToggle, /option value="dark"/);
  assert.match(themeToggle, /matchMedia/);
  assert.match(css, /:root\[data-resolved-theme="dark"\]/);
  assert.match(css, /\.theme-select/);
});
