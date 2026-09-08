'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { AgenticIntentDraft, AgenticIntentPreview, AgenticProviderReceipt } from '@piggybanq/types/agentic';

import { UiAlert, UiBadge, UiButton, UiCard, UiTabs } from '../../../components/ui/DashboardPrimitives';
import { approveAgenticIntent, executeAgenticIntent, previewAgenticIntent } from '../../../lib/agentic-sandbox';

type RailTab = 'sell' | 'swap' | 'bridge' | 'stake';
const tabs: Array<{ id: RailTab; label: string; note: string }> = [
  { id: 'sell', label: 'Sell', note: 'Testnet off-ramp' },
  { id: 'swap', label: 'Swap', note: 'Stellar path quote' },
  { id: 'bridge', label: 'Bridge', note: 'Stellar → Base' },
  { id: 'stake', label: 'Stake', note: 'Yield simulation' }
];

export function RailOperations({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<RailTab>('stake');

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.slice(1) as RailTab;
      if (tabs.some((tab) => tab.id === hash)) setActive(hash);
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  function chooseTab(tab: RailTab) {
    setActive(tab);
    window.history.pushState(null, '', `#${tab}`);
  }

  return (
    <section className="rail-operations-shell">
      <UiTabs label="Savings rail operations">
        {tabs.map((tab) => (
          <button key={tab.id} role="tab" aria-selected={active === tab.id} className={active === tab.id ? 'is-active' : ''} onClick={() => chooseTab(tab.id)} type="button">
            <strong>{tab.label}</strong><span>{tab.note}</span>
          </button>
        ))}
      </UiTabs>

      <div id="sell" role="tabpanel" hidden={active !== 'sell'}><IntentWorkbench type="sell" /></div>
      <div id="swap" role="tabpanel" hidden={active !== 'swap'}><IntentWorkbench type="swap" /></div>
      <div id="bridge" role="tabpanel" hidden={active !== 'bridge'}><IntentWorkbench type="bridge" /></div>
      <div id="stake" role="tabpanel" hidden={active !== 'stake'}>{children}</div>
    </section>
  );
}

function IntentWorkbench({ type }: { type: 'sell' | 'swap' | 'bridge' }) {
  const [amount, setAmount] = useState(type === 'bridge' ? '10.00' : '25.00');
  const [asset, setAsset] = useState<'XLM' | 'USDC'>(type === 'bridge' ? 'USDC' : 'XLM');
  const [destination, setDestination] = useState('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
  const [intent, setIntent] = useState<AgenticIntentPreview | null>(null);
  const [receipt, setReceipt] = useState<AgenticProviderReceipt | null>(null);
  const [message, setMessage] = useState('Enter an amount to prepare a five-minute testnet quote.');

  function makeDraft(): AgenticIntentDraft {
    if (type === 'sell') return { actionType: 'STELLAR_SELL', amount, assetCode: asset, outputAssetCode: 'PHP' };
    if (type === 'bridge') {
      if (!/^0x[a-fA-F0-9]{40}$/.test(destination)) throw new Error('Enter a valid Base Sepolia 0x destination address.');
      return { actionType: 'CCTP_BRIDGE', amount, assetCode: 'USDC', destinationNetwork: 'BASE_SEPOLIA', destinationAddress: destination };
    }
    return { actionType: 'STELLAR_SWAP', amount, assetCode: asset, outputAssetCode: asset === 'XLM' ? 'USDC' : 'XLM' };
  }

  function preview() {
    setReceipt(null);
    try {
      const next = previewAgenticIntent(makeDraft());
      setIntent(next);
      setMessage('Quote ready. Verify the route and minimum received.');
    } catch (error) {
      setIntent(null);
      setMessage(error instanceof Error ? error.message : 'Unable to create quote.');
    }
  }

  function approveAndExecute() {
    if (!intent) return;
    try {
      const approved = approveAgenticIntent(intent);
      const result = executeAgenticIntent(approved);
      setIntent(result.intent);
      setReceipt(result.receipt);
      setMessage('Sandbox receipt created. No real funds moved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sandbox execution failed.');
    }
  }

  const title = type === 'sell' ? 'Prepare a testnet sell' : type === 'swap' ? 'Swap on Stellar Testnet' : 'Bridge native USDC to Base Sepolia';
  const description = type === 'sell'
    ? 'Preview a PHP off-ramp intent. A licensed anchor is not connected, so payout stays simulated.'
    : type === 'swap'
      ? 'Preview an XLM/USDC Stellar path quote with slippage and a user-signature checkpoint.'
      : 'Circle CCTP route: Stellar Testnet domain 27 → Base Sepolia domain 6.';

  return (
    <UiCard className="rail-operation-card">
      <div className="rail-operation-heading"><div><UiBadge tone="rose">{type === 'bridge' ? 'CCTP testnet' : 'Stellar Testnet'}</UiBadge><h2>{title}</h2><p>{description}</p></div><span className="rail-provider-mark">{type === 'bridge' ? 'Circle' : 'Stellar'}</span></div>
      <div className="rail-operation-form">
        <label><span>Amount</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        {type !== 'bridge' ? <label><span>Asset</span><select value={asset} onChange={(event) => setAsset(event.target.value as 'XLM' | 'USDC')}><option>XLM</option><option>USDC</option></select></label> : <label><span>Asset</span><input value="USDC" disabled /></label>}
        {type === 'bridge' ? <label className="rail-address-field"><span>Base Sepolia destination</span><input value={destination} onChange={(event) => setDestination(event.target.value)} /></label> : null}
        <UiButton type="button" onClick={preview}>Preview quote</UiButton>
      </div>
      <UiAlert title="Sandbox status" tone={receipt ? 'success' : 'neutral'}>{message}</UiAlert>
      {type === 'bridge' ? <UiAlert title="Route constraint" tone="warning">Stellar-to-BSC USDC is unavailable through Circle CCTP. PiggyBanq only offers the verified Stellar-to-Base route.</UiAlert> : null}
      {intent ? <div className="rail-quote-review">
        <dl><div><dt>You provide</dt><dd>{intent.amount} {intent.assetCode}</dd></div><div><dt>Estimated output</dt><dd>{intent.estimatedOutput} {intent.outputAssetCode}</dd></div><div><dt>Minimum received</dt><dd>{intent.minimumReceived} {intent.outputAssetCode}</dd></div><div><dt>Slippage</dt><dd>{intent.slippageBps / 100}%</dd></div><div><dt>Network fee</dt><dd>{intent.fee} {intent.assetCode}</dd></div><div><dt>Execution</dt><dd>{intent.mode}</dd></div></dl>
        <div className="rail-stage-list">{intent.stages.map((stage, index) => <span key={stage}><i>{index + 1}</i>{stage.replaceAll('_', ' ')}</span>)}</div>
        <UiButton type="button" onClick={approveAndExecute} disabled={intent.status === 'SUCCEEDED'}>{intent.status === 'SUCCEEDED' ? 'Sandbox complete' : 'Approve and run sandbox'}</UiButton>
      </div> : null}
      {receipt ? <UiAlert title="Receipt" tone="success">{receipt.externalReference} · {receipt.stages.length} verified sandbox stages</UiAlert> : null}
    </UiCard>
  );
}
