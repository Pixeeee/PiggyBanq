import test from 'node:test';
import assert from 'node:assert/strict';
const path = new URL('../apps/mobile/src/dashboard/presentation.ts', import.meta.url);
test('banking balances keep meaningful Stellar precision and never invent unavailable data', async () => {
  const { formatLedgerBalance } = await import(path);
  assert.equal(formatLedgerBalance('9999.9999000'), '9,999.9999');
  assert.equal(formatLedgerBalance('0.0000001'), '0.0000001');
  assert.equal(formatLedgerBalance('10000.0000000'), '10,000.00');
  assert.equal(formatLedgerBalance(undefined), '—');
  assert.equal(formatLedgerBalance('unavailable'), '—');
});
test('local savings progress caps overshooting goals while preserving exact remaining cents', async () => {
  const { getGoalProgress } = await import(path);
  assert.deepEqual(getGoalProgress({target:'100.00',saved:'25.50'}),{percent:25.5,remaining:'74.50'});
  assert.deepEqual(getGoalProgress({target:'100.00',saved:'125.50'}),{percent:100,remaining:'0.00'});
  assert.deepEqual(getGoalProgress({target:'0.03',saved:'0.01'}),{percent:33.33,remaining:'0.02'});
});
