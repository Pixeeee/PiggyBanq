import test from 'node:test';
import assert from 'node:assert/strict';
const path = new URL('../apps/web/app/(app)/dashboard/_components/ledger-format.ts', import.meta.url);
test('web banking balances preserve the same meaningful precision as Android', async () => {
  const { formatLedgerUnits } = await import(path);
  assert.equal(formatLedgerUnits('1'), '0.0000001');
  assert.equal(formatLedgerUnits('99999999000'), '9,999.9999');
  assert.equal(formatLedgerUnits('100000000000'), '10,000.00');
  assert.equal(formatLedgerUnits('0'), '0.00');
  assert.equal(formatLedgerUnits(undefined), '—');
});
