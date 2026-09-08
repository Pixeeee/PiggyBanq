import type { AgenticIntentDraft, AgenticIntentPreview } from '@piggybanq/types/agentic';
import {
  approveSandboxIntent,
  createSandboxIntentPreview,
  executeSandboxIntent
} from '@piggybanq/stellar-core/cross-rail';

export function previewSandboxAgentAction(draft: AgenticIntentDraft) {
  return createSandboxIntentPreview(draft);
}

export function approveSandboxAgentAction(intent: AgenticIntentPreview) {
  return approveSandboxIntent(intent);
}

export function executeSandboxAgentAction(intent: AgenticIntentPreview) {
  return executeSandboxIntent(intent);
}
