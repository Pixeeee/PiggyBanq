'use client';

import type { AgenticIntentDraft, AgenticIntentPreview, AgenticProviderReceipt } from '@piggybanq/types/agentic';
import {
  approveSandboxIntent,
  createSandboxIntentPreview,
  executeSandboxIntent
} from '@piggybanq/stellar-core/cross-rail';

const STORAGE_KEY = 'piggybanq-agentic-sandbox-v1';

type SandboxState = {
  intents: AgenticIntentPreview[];
  receipts: AgenticProviderReceipt[];
};

export function previewAgenticIntent(draft: AgenticIntentDraft) {
  const intent = createSandboxIntentPreview(draft);
  const state = readState();
  writeState({ ...state, intents: [intent, ...state.intents].slice(0, 25) });
  return intent;
}

export function approveAgenticIntent(intent: AgenticIntentPreview) {
  const approved = approveSandboxIntent(intent);
  replaceIntent(approved);
  return approved;
}

export function executeAgenticIntent(intent: AgenticIntentPreview) {
  const result = executeSandboxIntent(intent);
  const state = readState();
  writeState({
    intents: [result.intent, ...state.intents.filter((item) => item.id !== intent.id)].slice(0, 25),
    receipts: [result.receipt, ...state.receipts].slice(0, 25)
  });
  return result;
}

export function listAgenticIntents() {
  return readState();
}

function replaceIntent(intent: AgenticIntentPreview) {
  const state = readState();
  writeState({ ...state, intents: [intent, ...state.intents.filter((item) => item.id !== intent.id)].slice(0, 25) });
}

function readState(): SandboxState {
  if (typeof window === 'undefined') return { intents: [], receipts: [] };
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { intents: [], receipts: [] };
    const parsed = JSON.parse(stored) as Partial<SandboxState>;
    return {
      intents: Array.isArray(parsed.intents) ? parsed.intents.slice(0, 25) : [],
      receipts: Array.isArray(parsed.receipts) ? parsed.receipts.slice(0, 25) : []
    };
  } catch {
    return { intents: [], receipts: [] };
  }
}

function writeState(state: SandboxState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('piggybanq-agentic-update'));
}
