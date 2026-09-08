'use client';

import { useEffect, useState } from 'react';
import type { AgenticIntentPreview, AgenticProviderReceipt } from '@piggybanq/types/agentic';
import { parseAgentCommand } from '@piggybanq/stellar-core/cross-rail';

import { UiAlert, UiBadge, UiButton, UiCard } from '../../components/ui/DashboardPrimitives';
import {
  approveAgenticIntent,
  executeAgenticIntent,
  listAgenticIntents,
  previewAgenticIntent
} from '../../lib/agentic-sandbox';

const examples = ['Pay 5 USDC to weather-api', 'Swap 25 XLM to USDC', 'Bridge 10 USDC to Base'];

export function AgenticCommandCenter() {
  const [command, setCommand] = useState(examples[0]);
  const [intent, setIntent] = useState<AgenticIntentPreview | null>(null);
  const [receipt, setReceipt] = useState<AgenticProviderReceipt | null>(null);
  const [message, setMessage] = useState('Describe one approved payment, swap, or bridge action.');
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<AgenticIntentPreview[]>([]);

  useEffect(() => setRecent(listAgenticIntents().intents.slice(0, 4)), []);

  function preview() {
    setBusy(true);
    setReceipt(null);
    try {
      const next = previewAgenticIntent(parseAgentCommand(command));
      setIntent(next);
      setMessage('Preview ready. Review every field before approving.');
      setRecent(listAgenticIntents().intents.slice(0, 4));
    } catch (error) {
      setIntent(null);
      setMessage(error instanceof Error ? error.message : 'Unable to understand this command.');
    } finally {
      setBusy(false);
    }
  }

  function approve() {
    if (!intent) return;
    try {
      const next = approveAgenticIntent(intent);
      setIntent(next);
      setMessage('Intent approved. Sandbox execution is now available.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Approval failed.');
    }
  }

  function execute() {
    if (!intent) return;
    setBusy(true);
    try {
      const result = executeAgenticIntent(intent);
      setIntent(result.intent);
      setReceipt(result.receipt);
      setRecent(listAgenticIntents().intents.slice(0, 4));
      setMessage('Sandbox execution completed. No real funds moved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Execution failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="agentic-command-center" aria-labelledby="agentic-title">
      <UiCard className="agentic-command-card">
        <div className="agentic-section-heading">
          <div><UiBadge tone="rose">Agentic sandbox</UiBadge><h2 id="agentic-title">Ask PiggyBanq to move with intent.</h2></div>
          <UiBadge>Approval required</UiBadge>
        </div>
        <p>Natural-language convenience with deterministic limits. The agent prepares; you approve.</p>
        <label className="agentic-command-input">
          <span>Command</span>
          <div><input value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') preview(); }} /><UiButton type="button" onClick={preview} disabled={busy}>{busy ? 'Working…' : 'Preview intent'}</UiButton></div>
        </label>
        <div className="agentic-examples" aria-label="Command examples">
          {examples.map((example) => <button key={example} type="button" onClick={() => setCommand(example)}>{example}</button>)}
        </div>
        <UiAlert title="Current state">{message}</UiAlert>
      </UiCard>

      <UiCard className="agentic-preview-card">
        {intent ? (
          <>
            <div className="agentic-section-heading"><div><UiBadge tone={intent.status === 'SUCCEEDED' ? 'success' : 'warning'}>{intent.status.replaceAll('_', ' ')}</UiBadge><h3>{formatAction(intent.actionType)}</h3></div><span>{intent.mode}</span></div>
            <dl className="agentic-review-grid">
              <div><dt>Amount</dt><dd>{intent.amount} {intent.assetCode}</dd></div>
              <div><dt>Estimated result</dt><dd>{intent.estimatedOutput} {intent.outputAssetCode}</dd></div>
              <div><dt>Route</dt><dd>{networkLabel(intent.sourceNetwork)} → {networkLabel(intent.destinationNetwork)}</dd></div>
              <div><dt>Fee</dt><dd>{intent.fee} {intent.assetCode}</dd></div>
            </dl>
            <ul className="agentic-policy-list">{intent.policyChecks.map((check) => <li key={check.label}><span>✓</span>{check.label}</li>)}</ul>
            <div className="agentic-review-actions">
              <UiButton type="button" onClick={approve} disabled={intent.status !== 'AWAITING_APPROVAL'}>Approve intent</UiButton>
              <UiButton variant="outline" type="button" onClick={execute} disabled={intent.status !== 'APPROVED' || busy}>Execute sandbox</UiButton>
            </div>
            {receipt ? <UiAlert title="Sandbox receipt" tone="success">{receipt.externalReference} · {receipt.network} · no real funds moved</UiAlert> : null}
          </>
        ) : (
          <div className="agentic-empty"><span>⌁</span><h3>Your preview appears here.</h3><p>Quotes expire after five minutes and cannot execute before approval.</p></div>
        )}
      </UiCard>

      {recent.length ? <div className="agentic-recent" aria-label="Recent sandbox activity">{recent.map((item) => <div key={item.id}><span>{formatAction(item.actionType)}</span><strong>{item.amount} {item.assetCode}</strong><UiBadge tone={item.status === 'SUCCEEDED' ? 'success' : 'neutral'}>{item.status.replaceAll('_', ' ')}</UiBadge></div>)}</div> : null}
    </section>
  );
}

function formatAction(value: string) {
  return value.toLowerCase().split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
}

function networkLabel(value: string) {
  return value.replaceAll('_', ' ').replace('STELLAR', 'Stellar').replace('BASE', 'Base').replace('BINANCE', 'Binance');
}
