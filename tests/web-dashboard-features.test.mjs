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
  assert.match(flow, /Create a new wallet/);
  assert.match(flow, /I have an existing wallet/);
  assert.match(flow, /Unlock PiggyBanq/);
  assert.match(flow, /signWalletAuthMessage/);
  assert.match(session, /cookies\(\)/);
  assert.match(session, /\/api\/auth\/me/);
  assert.match(session, /redirect\('\/login'\)/);
  assert.match(routes, /reply\.setCookie/);
});

test('community dashboard includes profile, budget, and social tools backed by authenticated API state', () => {
  const toolsPath = 'apps/web/app/(app)/dashboard/community/CommunityDashboard.tsx';
  const communityPagePath = 'apps/web/app/(app)/dashboard/community/page.tsx';

  assert.equal(existsSync(toolsPath), true);
  assert.equal(existsSync(communityPagePath), true);

  const tools = readFileSync(toolsPath, 'utf8');
  const communityPage = readFileSync(communityPagePath, 'utf8');
  const api = readFileSync('apps/web/app/lib/wallet-auth-api.ts', 'utf8');
  const socialRoutes = readFileSync('server/src/modules/social/routes.ts', 'utf8');
  const profileRoutes = readFileSync('server/src/modules/profile/routes.ts', 'utf8');
  const budgetRoutes = readFileSync('server/src/modules/budget/routes.ts', 'utf8');
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');

  assert.match(tools, /'use client'/);
  assert.match(tools, /getCommunity/);
  assert.match(tools, /getProfile/);
  assert.match(tools, /getBudgetPlans/);
  assert.match(tools, /createReliefPost/);
  assert.match(tools, /createReliefPledge/);
  assert.match(tools, /createDiscussionPost/);
  assert.match(tools, /createChatMessage/);
  assert.match(tools, /Edit profile/);
  assert.match(tools, /Budget allocation/);
  assert.match(tools, /Food/);
  assert.match(tools, /Water bill/);
  assert.match(tools, /Publish help post/);
  assert.match(tools, /Photo/);
  assert.match(tools, /Pledge/);
  assert.match(tools, /Groups/);
  assert.match(tools, /Post discussion/);
  assert.match(tools, /Global chat/);
  assert.match(tools, /Private chat/);
  assert.match(tools, /Stellar-authenticated session/);
  assert.doesNotMatch(tools, /feature-tabs/);
  assert.doesNotMatch(tools, /feature-jump/);
  assert.doesNotMatch(tools, /Open feature/);
  assert.doesNotMatch(tools, /localStorage/);
  assert.match(api, /\/social\/community/);
  assert.match(api, /\/profile\/me/);
  assert.match(api, /\/budget\/allocations/);
  assert.match(socialRoutes, /requireAuthUser/);
  assert.match(socialRoutes, /reliefPost\.create/);
  assert.match(socialRoutes, /chatMessage\.create/);
  assert.match(socialRoutes, /pledge\.create/);
  assert.match(profileRoutes, /requireAuthUser/);
  assert.match(budgetRoutes, /requireAuthUser/);
  assert.match(dashboard, /DashboardFeaturePanels/);
  assert.match(dashboard, /\/dashboard\/community/);
  assert.match(communityPage, /requireWalletSession/);
  assert.match(communityPage, /CommunityDashboard/);
});

test('dashboard reflects the authenticated wallet in overview cards', () => {
  const summaryPath = 'apps/web/app/(app)/dashboard/DashboardWalletSummary.tsx';

  assert.equal(existsSync(summaryPath), true);

  const summary = readFileSync(summaryPath, 'utf8');
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');

  assert.match(summary, /stellarPublicKey/);
  assert.match(summary, /Wallet verified/);
  assert.match(summary, /maskWallet/);
  assert.match(summary, /Stellar ownership verified/);
  assert.doesNotMatch(summary, /localStorage/);
  assert.match(dashboard, /DashboardWalletSummary/);
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
