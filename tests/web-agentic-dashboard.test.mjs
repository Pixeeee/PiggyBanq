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

test('dashboard uses live Stellar controls while excluded rails stay non-executable', () => {
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/StellarDashboard.tsx', 'utf8');
  const shell = readFileSync('apps/web/app/(app)/dashboard/_components/DashboardShell.tsx', 'utf8');

  assert.match(dashboard, /getStellarSummary/);
  assert.match(dashboard, /getStellarActivity/);
  assert.match(dashboard, /StellarTransactionDialog/);
  assert.match(dashboard, /External rails disabled/);
  assert.doesNotMatch(dashboard, /AgenticCommandCenter|Execute sandbox|Binance x402/);
  assert.match(shell, /Overview/);
  assert.match(shell, /Allocations/);
  assert.match(shell, /label: 'Send'/);
  assert.match(shell, /pockets#swap/);
  assert.match(shell, /Yield Lab/);
});

test('overview follows the live PiggyBanq Stellar dashboard layout', () => {
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/StellarDashboard.tsx', 'utf8');
  const css = readFileSync('apps/web/app/globals.css', 'utf8');

  assert.match(dashboard, /stellar-dashboard-hero/);
  assert.match(dashboard, /stellar-balance-grid/);
  assert.match(dashboard, /stellar-actions-panel/);
  assert.match(dashboard, /stellar-activity-panel/);
  assert.match(dashboard, /No demo values were substituted/);
  assert.match(dashboard, /SIMULATION ONLY/);
  assert.match(css, /Live Stellar dashboard/);
  assert.match(css, /\.stellar-main-grid/);
  assert.match(css, /\.stellar-dialog-backdrop/);
});

test('pockets exposes an honest sell boundary, live swap, and simulated Yield Lab', () => {
  const page = readFileSync('apps/web/app/(app)/dashboard/pockets/page.tsx', 'utf8');
  const operations = readFileSync('apps/web/app/(app)/dashboard/pockets/RailOperations.tsx', 'utf8');
  const pockets = readFileSync('apps/web/app/(app)/dashboard/pockets/PocketsManager.tsx', 'utf8');

  assert.match(page, /RailOperations/);
  assert.match(operations, /hashchange/);
  assert.match(operations, /id="sell"/);
  assert.match(operations, /id="swap"/);
  assert.match(operations, /id="yield-lab"/);
  assert.match(operations, /Stellar Testnet/);
  assert.match(operations, /Fiat selling is not connected/);
  assert.match(operations, /StellarTransactionDialog/);
  assert.doesNotMatch(operations, /CCTP_BRIDGE|Execute sandbox/);
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

test('live overview preserves responsive hierarchy and landing-aligned typography', () => {
  const css = readFileSync('apps/web/app/globals.css', 'utf8');
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/StellarDashboard.tsx', 'utf8');
  const liveStyles = css.slice(css.indexOf('Live Stellar dashboard'));

  assert.notEqual(liveStyles.length, 0);
  assert.match(liveStyles, /font-family:\s*"Poppins", var\(--font-body\)/);
  assert.match(liveStyles, /font-family:\s*"Source Serif 4"/);
  assert.match(liveStyles, /@media\s*\(max-width:\s*1120px\)/);
  assert.match(liveStyles, /@media\s*\(max-width:\s*540px\)/);
  assert.match(dashboard, /aria-busy/);
});
