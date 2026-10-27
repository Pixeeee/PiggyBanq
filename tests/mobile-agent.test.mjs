import test from 'node:test';
import assert from 'node:assert/strict';
import { createMobileAgentStore } from '../apps/mobile/src/dashboard/agent-store.ts';

function fixture() {
  const records = new Map();
  let fail = false;
  let time = Date.now();
  const storage = { getItem: async key => records.get(key) ?? null, setItem: async (key, value) => { if (fail) throw new Error('Storage unavailable'); records.set(key, value); } };
  return { records, storage, store: createMobileAgentStore(storage, 'wallet-a', () => new Date(time)), now: () => new Date(time), advance: ms => { time += ms; }, fail: () => { fail = true; } };
}

test('native agent uses the web policies and persists explicit preview, approval and sandbox receipts per wallet', async () => {
  const f = fixture();
  for (const command of ['Pay 5 USDC to weather-api', 'Swap 25 XLM to USDC', 'Bridge 10 USDC to Base']) {
    const preview = (await f.store.preview(command)).intents[0];
    assert.equal(preview.mode, 'SANDBOX');
    await assert.rejects(f.store.execute(preview.id), /approve/i);
    await f.store.approve(preview.id);
    const completed = await f.store.execute(preview.id);
    assert.equal(completed.intents[0].status, 'SUCCEEDED');
    assert.equal(completed.receipts[0].mode, 'SANDBOX');
    assert.equal(completed.receipts[0].intentId, preview.id);
    await assert.rejects(f.store.execute(preview.id), /approve/i);
  }
  assert.equal((await createMobileAgentStore(f.storage, 'wallet-a').load()).receipts.length, 3);
  assert.deepEqual(await createMobileAgentStore(f.storage, 'wallet-b').load(), { intents: [], receipts: [] });
});

test('native agent rejects policy violations and expired approved intents without changing history', async () => {
  const f = fixture();
  await assert.rejects(f.store.preview('Pay 21 USDC to weather-api'), /limited|20/);
  await assert.rejects(f.store.preview('send all my money'), /not supported/);
  assert.equal(f.records.size, 0);
  const intent = (await f.store.preview('Swap 25 XLM to USDC')).intents[0];
  await f.store.approve(intent.id);
  const saved = f.records.get('piggybanq.agent-sandbox.wallet-a');
  f.advance(300001);
  await assert.rejects(f.store.execute(intent.id), /expired/);
  assert.equal(f.records.get('piggybanq.agent-sandbox.wallet-a'), saved);
});

test('storage failure, concurrent actions and wallet lock cannot create an acknowledged agent receipt', async () => {
  const f = fixture();
  const intent = (await f.store.preview('Pay 5 USDC to weather-api')).intents[0];
  const attempts = await Promise.allSettled([f.store.approve(intent.id), f.store.approve(intent.id)]);
  assert.equal(attempts.filter(item => item.status === 'rejected').length, 1);
  f.fail();
  await assert.rejects(f.store.execute(intent.id), /Storage unavailable/);
  assert.equal((await f.store.load()).receipts.length, 0);
  f.store.close();
  await assert.rejects(f.store.execute(intent.id), /locked/);
});

test('damaged native agent history is preserved and blocks all modifications', async () => {
  const f = fixture();
  f.records.set('piggybanq.agent-sandbox.wallet-a', '{broken');
  await assert.rejects(f.store.load(), /damaged/);
  await assert.rejects(f.store.preview('Pay 5 USDC to weather-api'), /damaged/);
  assert.equal(f.records.get('piggybanq.agent-sandbox.wallet-a'), '{broken');
});
