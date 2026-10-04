import test from 'node:test';
import assert from 'node:assert/strict';

test('planning persists per wallet and rejects invalid edits without losing stored records', async () => {
  const { loadPlanningRecord, savePlanningRecord, validateAllocation } = await import('../apps/mobile/src/dashboard/planning.ts');
  const items = new Map();
  const storage = { getItem: async k => items.get(k) ?? null, setItem: async (k, v) => items.set(k, v) };
  const allocation = { id: 'groceries', name: 'Groceries', amount: '125.50', currency: 'PHP' };
  const record = { allocations: [allocation], goals: [{ id: 'rainyday', name: 'Rainy day', target: '1000.00', saved: '25.50' }] };
  await savePlanningRecord(storage, 'wallet-a', record);
  assert.deepEqual(await loadPlanningRecord(storage, 'wallet-a'), record);
  assert.deepEqual(await loadPlanningRecord(storage, 'wallet-b'), { allocations: [], goals: [] });
  for (const amount of ['-1', 'NaN', 'Infinity', '1.001', '0', '00001']) assert.throws(() => validateAllocation({ ...allocation, amount }));
  await assert.rejects(savePlanningRecord(storage, 'wallet-a', { ...record, allocations: [{ ...allocation, amount: '-1' }] }));
  assert.deepEqual(await loadPlanningRecord(storage, 'wallet-a'), record);
  items.set('piggybanq.planning.wallet-c', '{bad');
  await assert.rejects(loadPlanningRecord(storage, 'wallet-c'), /damaged/);
  assert.equal(items.get('piggybanq.planning.wallet-c'), '{bad');
});
