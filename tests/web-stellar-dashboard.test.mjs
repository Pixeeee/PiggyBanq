import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync('apps/web/app/(app)/dashboard/StellarDashboard.tsx', 'utf8');
const dialog = readFileSync('apps/web/app/(app)/dashboard/StellarTransactionDialog.tsx', 'utf8');
const pockets = readFileSync('apps/web/app/(app)/dashboard/pockets/page.tsx', 'utf8');

test('dashboard covers live, loading, empty, demo, degraded, and read-only states', () => {
  assert.match(dashboard, /state: 'loading'/);
  assert.match(dashboard, /state: 'error'/);
  assert.match(dashboard, /summary\.status === 'NOT_FOUND'/);
  assert.match(dashboard, /Development demo/);
  assert.match(dashboard, /No demo values were substituted/);
  assert.match(dashboard, /emergencyReadOnly/);
  assert.match(dashboard, /Updated.*toLocaleTimeString/s);
});

test('live mode renders only API balances and keeps demo fixtures separately gated', () => {
  assert.match(dashboard, /isDemo\s*\?\s*\{ state: 'ready', summary: demoSummary/);
  assert.match(dashboard, /formatUnits\(live\.balances\.XLM\.availableUnits\)/);
  assert.match(dashboard, /formatUnits\(live\.balances\.USDC\.availableUnits\)/);
  assert.doesNotMatch(dashboard, /PHP 248,730|\$4,341\.10|4,320\.82 XLM/);
});

test('transaction dialog provides review, local signing, and unresolved submission recovery', () => {
  assert.match(dialog, /role="dialog" aria-modal="true"/);
  assert.match(dialog, /trapFocus/);
  assert.match(dialog, /event\.key === 'Escape'/);
  assert.match(dialog, /Minimum received/);
  assert.match(dialog, /Network fee cap/);
  assert.match(dialog, /signStellarTransaction/);
  assert.match(dialog, /Refresh ledger status/);
  assert.match(dialog, /This is not shown as success/);
});

test('yield is consistently labeled as simulation-only', () => {
  assert.match(dashboard, /SIMULATION ONLY/);
  assert.match(dashboard, /No funds are staked, lent, or transferred/);
  assert.match(pockets, /Simulation only — no funds deposited/);
});

