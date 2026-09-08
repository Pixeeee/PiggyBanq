import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('web exposes a local agentic sandbox and reusable dashboard primitives', () => {
  const paths = [
    'apps/web/app/lib/agentic-sandbox.ts',
    'apps/web/app/components/ui/DashboardPrimitives.tsx',
    'apps/web/app/(app)/dashboard/AgenticCommandCenter.tsx',
    'apps/web/app/(app)/dashboard/pockets/RailOperations.tsx'
  ];
  for (const path of paths) assert.equal(existsSync(path), true, `${path} should exist`);

  const sandbox = readFileSync(paths[0], 'utf8');
  const primitives = readFileSync(paths[1], 'utf8');
  assert.match(sandbox, /piggybanq-agentic-sandbox-v1/);
  assert.match(sandbox, /createSandboxIntentPreview/);
  assert.match(sandbox, /approveSandboxIntent/);
  assert.match(sandbox, /executeSandboxIntent/);
  assert.doesNotMatch(sandbox, /secretKey|mnemonic|accessToken|privateKey/);
  assert.match(primitives, /UiCard/);
  assert.match(primitives, /UiBadge/);
  assert.match(primitives, /UiAlert/);
  assert.match(primitives, /role="status"/);
});

test('dashboard command center separates Stellar, Circle, and Binance responsibilities', () => {
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/PortfolioDashboard.tsx', 'utf8');
  const command = readFileSync('apps/web/app/(app)/dashboard/AgenticCommandCenter.tsx', 'utf8');
  const shell = readFileSync('apps/web/app/(app)/dashboard/_components/DashboardShell.tsx', 'utf8');

  assert.match(dashboard, /AgenticCommandCenter/);
  assert.match(dashboard, /Stellar Yield/);
  assert.match(dashboard, /Circle CCTP/);
  assert.match(dashboard, /Binance x402/);
  assert.match(command, /Pay 5 USDC to weather-api/);
  assert.match(command, /Approve intent/);
  assert.match(command, /Execute sandbox/);
  assert.match(command, /Sandbox receipt/);
  assert.match(shell, /Overview/);
  assert.match(shell, /Allocations/);
  assert.match(shell, /pockets#sell/);
  assert.match(shell, /pockets#swap/);
});

test('overview follows the compact PiggyBanq operations dashboard layout', () => {
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/PortfolioDashboard.tsx', 'utf8');
  const data = readFileSync('apps/web/app/(app)/dashboard/_data/savings-dashboard.ts', 'utf8');
  const css = readFileSync('apps/web/app/globals.css', 'utf8');

  assert.match(dashboard, /operations-header/);
  assert.match(dashboard, /dashboard-kpi-grid/);
  assert.match(dashboard, /savings-lock-panel/);
  assert.match(dashboard, /savings-activity-chart/);
  assert.match(dashboard, /dashboard-quick-actions/);
  assert.match(dashboard, /dashboard-token-rates/);
  assert.match(dashboard, /Weekly savings activity/);
  assert.match(dashboard, /Next maturity/);
  assert.match(dashboard, /Illustrative testnet data/);
  assert.match(data, /dashboardKpis/);
  assert.match(data, /weeklySavingsActivity/);
  assert.match(data, /dashboardTokenRates/);
  assert.match(css, /PiggyBanq compact operations dashboard/);
  assert.match(css, /\.dashboard-primary-grid/);
  assert.match(css, /\.activity-line/);
  assert.match(css, /\.dashboard-secondary-grid/);
});

test('pockets exposes hash-aware sell, swap, bridge, and stake workspaces', () => {
  const page = readFileSync('apps/web/app/(app)/dashboard/pockets/page.tsx', 'utf8');
  const operations = readFileSync('apps/web/app/(app)/dashboard/pockets/RailOperations.tsx', 'utf8');
  const pockets = readFileSync('apps/web/app/(app)/dashboard/pockets/PocketsManager.tsx', 'utf8');

  assert.match(page, /RailOperations/);
  assert.match(operations, /hashchange/);
  assert.match(operations, /id="sell"/);
  assert.match(operations, /id="swap"/);
  assert.match(operations, /id="bridge"/);
  assert.match(operations, /id="stake"/);
  assert.match(operations, /Stellar Testnet/);
  assert.match(operations, /Base Sepolia/);
  assert.match(operations, /Stellar-to-BSC USDC is unavailable/);
  assert.match(pockets, /stellar-testnet-simulation/);
  assert.match(pockets, /Create an XLM or USDC testnet position/);
});

test('dashboard theme inherits the landing palette without touching the hero', () => {
  const css = readFileSync('apps/web/app/globals.css', 'utf8');
  assert.match(css, /PiggyBanq agentic dashboard theme/);
  assert.match(css, /--dash-canvas:\s*#fffaf0/i);
  assert.match(css, /--dash-action:\s*var\(--rose\)/);
  assert.match(css, /\.ui-card/);
  assert.match(css, /\.agentic-command-center/);
  assert.match(css, /\.rail-operation-tabs/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
});
