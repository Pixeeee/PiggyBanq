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
  assert.match(shell, /label: 'Home'/);
  assert.match(shell, /Allocations/);
  assert.match(shell, /label: 'Send'/);
  assert.match(shell, /pockets#swap/);
  assert.match(shell, /Yield Lab/);
});

test('overview follows the live PiggyBanq Stellar dashboard layout', () => {
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/StellarDashboard.tsx', 'utf8');
  const css = readFileSync('apps/web/app/dashboard-banking.css', 'utf8');

  assert.match(dashboard, /stellar-dashboard-hero/);
  assert.match(dashboard, /stellar-balance-grid/);
  assert.match(dashboard, /stellar-actions-panel/);
  assert.match(dashboard, /stellar-activity-panel/);
  assert.match(dashboard, /No demo values were substituted/);
  assert.match(dashboard, /SIMULATION ONLY/);
  assert.match(css, /Shared Android banking language/);
  assert.match(css, /\.banking-home-grid/);
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

test('dashboard theme matches Android while keeping landing styles separate', () => {
  const css = readFileSync('apps/web/app/dashboard-banking.css', 'utf8');
  const globals = readFileSync('apps/web/app/globals.css', 'utf8');
  assert.match(css, /--dash-canvas:\s*#f6f7fa/i);
  assert.match(css, /--dash-action:\s*#c74461/i);
  assert.match(css, /:root\[data-resolved-theme="dark"\]/);
  assert.match(css, /--dash-canvas:\s*#101b24/i);
  assert.match(globals, /:focus-visible/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
});

test('live overview preserves responsive hierarchy and Android-aligned typography', () => {
  const css = readFileSync('apps/web/app/globals.css', 'utf8');
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/StellarDashboard.tsx', 'utf8');
  const liveStyles = readFileSync('apps/web/app/dashboard-banking.css', 'utf8');

  assert.notEqual(liveStyles.length, 0);
  assert.match(liveStyles, /font-family:\s*var\(--font-body\)/);
  assert.match(liveStyles, /--dash-canvas:\s*#f6f7fa/i);
  assert.match(liveStyles, /@media\s*\(max-width:\s*960px\)/);
  assert.match(liveStyles, /@media\s*\(max-width:\s*600px\)/);
  assert.match(dashboard, /aria-busy/);
});
