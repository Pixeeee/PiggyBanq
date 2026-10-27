import { approveSandboxIntent, createSandboxIntentPreview, executeSandboxIntent, parseAgentCommand } from '@piggybanq/stellar-core/cross-rail';
import type { AgenticIntentPreview, AgenticProviderReceipt } from '@piggybanq/types/agentic';

type State = { intents: AgenticIntentPreview[]; receipts: AgenticProviderReceipt[] };
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> };

export function createMobileAgentStore(storage: Storage, publicKey: string, now = () => new Date()) {
  const key = `piggybanq.agent-sandbox.${publicKey}`;
  let writing = false;
  let closed = false;
  function unlocked() { if (closed) throw new Error('Wallet locked. Reopen the agent after unlocking.'); }
  async function load(): Promise<State> {
    unlocked();
    const raw = await storage.getItem(key);
    unlocked();
    if (raw === null) return { intents: [], receipts: [] };
    try {
      const record = JSON.parse(raw) as State;
      if (!record || !Array.isArray(record.intents) || !Array.isArray(record.receipts) || record.intents.length > 25 || record.receipts.length > 25 ||
          record.intents.some(intent => !intent || intent.mode !== 'SANDBOX' || typeof intent.id !== 'string' || !Number.isFinite(Date.parse(intent.expiresAt)) ||
            !['AWAITING_APPROVAL', 'APPROVED', 'SUCCEEDED', 'FAILED', 'CANCELLED'].includes(intent.status) || !Array.isArray(intent.policyChecks) || intent.policyChecks.some(check => check.passed !== true)) ||
          record.receipts.some(receipt => !receipt || receipt.mode !== 'SANDBOX' || receipt.status !== 'SUCCEEDED' || typeof receipt.externalReference !== 'string')) throw new Error();
      return record;
    } catch { throw new Error('Saved agent history is damaged. It has been preserved; no simulation was executed.'); }
  }
  async function change(action: (state: State) => State) {
    unlocked();
    if (writing) throw new Error('An agent operation is already in progress.');
    writing = true;
    try {
      const state = action(await load());
      unlocked();
      await storage.setItem(key, JSON.stringify(state));
      unlocked();
      return state;
    } finally { writing = false; }
  }
  function find(state: State, id: string) {
    const intent = state.intents.find(item => item.id === id);
    if (!intent) throw new Error('Select a saved agent preview first.');
    if (Date.parse(intent.expiresAt) <= now().getTime()) throw new Error('This quote expired. Create a new preview before approval or execution.');
    return intent;
  }
  return {
    load,
    preview: (command: string) => change(state => {
      if (command.length > 500) throw new Error('Keep the command within 500 characters.');
      const intent = createSandboxIntentPreview(parseAgentCommand(command), { now: now() });
      return { ...state, intents: [intent, ...state.intents].slice(0, 25) };
    }),
    approve: (id: string) => change(state => {
      const intent = approveSandboxIntent(find(state, id), { now: now() });
      return { ...state, intents: state.intents.map(item => item.id === id ? intent : item) };
    }),
    execute: (id: string) => change(state => {
      const result = executeSandboxIntent(find(state, id), { now: now() });
      return { intents: state.intents.map(item => item.id === id ? result.intent : item), receipts: [result.receipt, ...state.receipts].slice(0, 25) };
    }),
    close: () => { closed = true; }
  };
}
