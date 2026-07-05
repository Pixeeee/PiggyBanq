import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('dashboard requires wallet creation or wallet login before showing app tools', () => {
  const gatePath = 'apps/web/app/(app)/dashboard/WalletAccessGate.tsx';

  assert.equal(existsSync(gatePath), true);

  const gate = readFileSync(gatePath, 'utf8');
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');
  const walletPanel = readFileSync('apps/web/app/(app)/dashboard/WalletSetupPanel.tsx', 'utf8');

  assert.match(gate, /'use client'/);
  assert.match(gate, /getActiveWalletSession/);
  assert.match(gate, /Create secure wallet/);
  assert.match(gate, /Log in with wallet/);
  assert.match(gate, /WalletSetupPanel/);
  assert.match(walletPanel, /onWalletReady/);
  assert.match(dashboard, /WalletAccessGate/);
});

test('dashboard includes profile, budget, and social community tools backed by local user state', () => {
  const toolsPath = 'apps/web/app/(app)/dashboard/DashboardFeaturePanels.tsx';

  assert.equal(existsSync(toolsPath), true);

  const tools = readFileSync(toolsPath, 'utf8');
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');

  assert.match(tools, /'use client'/);
  assert.match(tools, /piggybanq\.profile/);
  assert.match(tools, /Edit profile/);
  assert.match(tools, /Budget allocation/);
  assert.match(tools, /Food/);
  assert.match(tools, /Water bill/);
  assert.match(tools, /Calamity help post/);
  assert.match(tools, /Upload photo/);
  assert.match(tools, /Donation pledge/);
  assert.match(tools, /Groups/);
  assert.match(tools, /Discussions/);
  assert.match(tools, /Global chat/);
  assert.match(tools, /Private chat/);
  assert.match(tools, /Community is available before profile completion/);
  assert.match(tools, /feature-tabs/);
  assert.match(tools, /feature-jump/);
  assert.match(tools, /Open feature/);
  assert.match(tools, /localStorage\.setItem/);
  assert.match(dashboard, /DashboardFeaturePanels/);
});

test('dashboard reflects the local wallet login in client-side overview cards', () => {
  const summaryPath = 'apps/web/app/(app)/dashboard/DashboardWalletSummary.tsx';

  assert.equal(existsSync(summaryPath), true);

  const summary = readFileSync(summaryPath, 'utf8');
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');

  assert.match(summary, /'use client'/);
  assert.match(summary, /ACTIVE_WALLET_SESSION_KEY/);
  assert.match(summary, /Wallet linked/);
  assert.match(summary, /maskPublicKey/);
  assert.match(summary, /Live balance pending Horizon sync/);
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
