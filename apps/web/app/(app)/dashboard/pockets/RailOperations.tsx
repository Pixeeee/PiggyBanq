'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { UiAlert, UiBadge, UiButton, UiCard, UiTabs } from '../../../components/ui/DashboardPrimitives';
import { StellarTransactionDialog } from '../StellarTransactionDialog';

type RailTab = 'sell' | 'swap' | 'yield-lab';
const tabs: Array<{ id: RailTab; label: string; note: string }> = [
  { id: 'sell', label: 'Sell', note: 'Not connected' },
  { id: 'swap', label: 'Swap', note: 'Live Testnet path' },
  { id: 'yield-lab', label: 'Yield Lab', note: 'Simulation only' }
];

export function RailOperations({ children, username, publicKey, isDemo }: { children: ReactNode; username: string; publicKey: string; isDemo: boolean }) {
  const [active, setActive] = useState<RailTab>('yield-lab');
  const [swapOpen, setSwapOpen] = useState(false);

  useEffect(() => {
    const syncHash = () => {
      const requested = window.location.hash.slice(1);
      const hash = (requested === 'stake' ? 'yield-lab' : requested) as RailTab;
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

      <div id="sell" role="tabpanel" hidden={active !== 'sell'}><UnavailableSell /></div>
      <div id="swap" role="tabpanel" hidden={active !== 'swap'}>
        <UiCard className="rail-operation-card honest-rail-card">
          <div className="rail-operation-heading"><div><UiBadge tone="rose">Stellar Testnet</UiBadge><h2>Swap XLM and USDC</h2><p>PiggyBanq requests a live strict-send path from Horizon, then shows the path, minimum received, fee, and expiry before local signing.</p></div><span className="rail-provider-mark">XLM</span></div>
          <UiAlert title="Self-custodial execution">Your password and secret key stay in this browser. A missing path or unavailable ledger is never shown as a successful swap.</UiAlert>
          <UiButton type="button" onClick={() => setSwapOpen(true)} disabled={isDemo}>Open live swap review</UiButton>
          {isDemo ? <small>Live actions are disabled in the development demo.</small> : null}
        </UiCard>
      </div>
      <div id="yield-lab" role="tabpanel" hidden={active !== 'yield-lab'}>{children}</div>
      {swapOpen ? <StellarTransactionDialog operation="PATH_PAYMENT_STRICT_SEND" username={username} publicKey={publicKey} onClose={() => setSwapOpen(false)} onSettled={() => undefined} /> : null}
    </section>
  );
}

function UnavailableSell() {
  return (
    <UiCard className="rail-operation-card honest-rail-card">
      <div className="rail-operation-heading"><div><UiBadge tone="warning">Unavailable</UiBadge><h2>Fiat selling is not connected.</h2><p>A real sell or cash-out requires a licensed Stellar anchor, current compliance review, and a production settlement partner.</p></div><span className="rail-provider-mark">PHP</span></div>
      <UiAlert title="No simulated payout" tone="warning">PiggyBanq will not generate a fake success receipt. Your XLM and USDC remain untouched.</UiAlert>
    </UiCard>
  );
}
