'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StellarAccountSummary, StellarActivityView, StellarCapabilities, StellarOperationType } from '@piggybanq/types/stellar-transactions';

import { DashboardLogoutButton } from '../../components/DashboardLogoutButton';
import { ThemeToggle } from '../../components/ThemeToggle';
import { getStellarActivity, getStellarCapabilities, getStellarSummary } from '../../lib/wallet-auth-api';
import { StellarTransactionDialog } from './StellarTransactionDialog';

type DashboardResource =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; summary: StellarAccountSummary; activity: StellarActivityView[]; capabilities: StellarCapabilities; refreshedAt: string };

const demoSummary: Extract<StellarAccountSummary, { status: 'LIVE' }> = {
  status: 'LIVE', network: 'TESTNET', publicKey: 'GB3JDWCQJCWMJ3IILWIGDTQJJC5567PGVEVXSCVPEQOTDN64VJBDQBYX', sequence: 'DEMO', subentryCount: 1,
  balances: {
    XLM: { assetCode: 'XLM', issuer: null, balanceUnits: '2487300000', buyingLiabilitiesUnits: '0', sellingLiabilitiesUnits: '0', availableUnits: '2487300000', trustline: true, authorized: true, limitUnits: null },
    USDC: { assetCode: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', balanceUnits: '964200000', buyingLiabilitiesUnits: '0', sellingLiabilitiesUnits: '0', availableUnits: '964200000', trustline: true, authorized: true, limitUnits: '100000000000' }
  },
  refreshedAt: new Date(0).toISOString()
};

const demoCapabilities: StellarCapabilities = {
  network: 'TESTNET', mode: 'LIVE_TESTNET', enabledAssets: ['XLM', 'USDC'], operations: ['PAYMENT', 'CHANGE_TRUST', 'PATH_PAYMENT_STRICT_SEND'],
  selfCustody: true, localSigning: true, yield: 'SIMULATION_ONLY', binance: 'DISABLED', cctp: 'DISABLED', mainnet: 'DISABLED', emergencyReadOnly: false
};

function formatUnits(units: string, maxFraction = 4) {
  const value = BigInt(units);
  const whole = value / 10_000_000n;
  const fraction = (value % 10_000_000n).toString().padStart(7, '0').slice(0, maxFraction).replace(/0+$/, '');
  return fraction ? `${whole.toLocaleString()}.${fraction}` : whole.toLocaleString();
}

function shortKey(value: string) {
  return `${value.slice(0, 7)}…${value.slice(-7)}`;
}

export function StellarDashboard({ displayName, username, publicKey, isDemo }: { displayName: string; username: string; publicKey: string; isDemo: boolean }) {
  const [resource, setResource] = useState<DashboardResource>(isDemo
    ? { state: 'ready', summary: demoSummary, activity: [], capabilities: demoCapabilities, refreshedAt: new Date().toISOString() }
    : { state: 'loading' });
  const [action, setAction] = useState<StellarOperationType | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);

  const load = useCallback(async () => {
    if (isDemo) return;
    setResource((current) => current.state === 'ready' ? current : { state: 'loading' });
    try {
      const [summary, activity, capabilities] = await Promise.all([getStellarSummary(), getStellarActivity(20), getStellarCapabilities()]);
      setResource({ state: 'ready', summary, activity: activity.records, capabilities, refreshedAt: activity.refreshedAt });
    } catch (cause) {
      setResource({ state: 'error', message: cause instanceof Error ? cause.message : 'Live Stellar data could not be loaded.' });
    }
  }, [isDemo]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const syncActionHash = () => {
      if (window.location.hash === '#send') setAction('PAYMENT');
    };
    syncActionHash();
    window.addEventListener('hashchange', syncActionHash);
    return () => window.removeEventListener('hashchange', syncActionHash);
  }, []);

  const live = resource.state === 'ready' && resource.summary.status === 'LIVE' ? resource.summary : null;
  const actionsDisabled = isDemo || resource.state !== 'ready' || resource.summary.status !== 'LIVE' || resource.capabilities.emergencyReadOnly;

  return (
    <div className="stellar-dashboard" aria-label="PiggyBanq Stellar Testnet dashboard">
      <header className="stellar-dashboard-hero">
        <div className="stellar-hero-copy">
          <span>Self-custodial savings · Stellar Testnet</span>
          <h1>Your money, <em>clearly in view.</em></h1>
          <p>Welcome back, {displayName}. Live ledger balances stay separate from savings forecasts, so you always know what is real.</p>
        </div>
        <div className="stellar-hero-controls">
          <span className={`stellar-live-pill ${resource.state === 'error' ? 'is-offline' : ''}`}><i /> {isDemo ? 'Demo data' : resource.state === 'error' ? 'Ledger unavailable' : resource.state === 'loading' ? 'Connecting…' : 'Live Testnet'}</span>
          <span className="stellar-wallet-pill" title={publicKey}>{shortKey(publicKey)}</span>
          <ThemeToggle />
          <DashboardLogoutButton />
        </div>
      </header>

      {isDemo ? <div className="stellar-banner is-demo" role="status"><strong>Development demo</strong><span>These sample balances are not read from Stellar and cannot be signed or submitted.</span></div> : null}
      {resource.state === 'error' ? <div className="stellar-banner is-error" role="alert"><strong>Live ledger unavailable</strong><span>{resource.message} No demo values were substituted.</span><button type="button" onClick={() => void load()}>Retry</button></div> : null}
      {resource.state === 'ready' && resource.capabilities.emergencyReadOnly ? <div className="stellar-banner is-warning" role="status"><strong>Read-only mode</strong><span>Balances remain available, but new transactions are paused.</span></div> : null}

      <section className="stellar-balance-grid" aria-label="Live asset balances" aria-busy={resource.state === 'loading'}>
        {resource.state === 'loading' ? <><BalanceSkeleton /><BalanceSkeleton /><BalanceSkeleton /></> : null}
        {live ? <>
          <article className="stellar-balance-card is-primary">
            <div><span>Available XLM</span><b className="stellar-asset-mark is-xlm">X</b></div>
            <strong>{balanceVisible ? formatUnits(live.balances.XLM.availableUnits) : '••••••'} <small>XLM</small></strong>
            <p>{formatUnits(live.balances.XLM.sellingLiabilitiesUnits)} XLM reserved in selling liabilities</p>
          </article>
          <article className="stellar-balance-card">
            <div><span>Available USDC</span><b className="stellar-asset-mark is-usdc">$</b></div>
            <strong>{balanceVisible ? formatUnits(live.balances.USDC.availableUnits) : '••••••'} <small>USDC</small></strong>
            <p>{live.balances.USDC.trustline ? live.balances.USDC.authorized ? 'Official Testnet trustline enabled' : 'Trustline authorization required' : 'Trustline not enabled'}</p>
          </article>
          <article className="stellar-balance-card is-account">
            <div><span>Wallet status</span><button type="button" onClick={() => setBalanceVisible((value) => !value)} aria-label={balanceVisible ? 'Hide balances' : 'Show balances'}>{balanceVisible ? 'Hide' : 'Show'}</button></div>
            <strong>{live.subentryCount} <small>ledger entries</small></strong>
            <p>Sequence {live.sequence}</p>
          </article>
        </> : null}
        {resource.state === 'ready' && resource.summary.status === 'NOT_FOUND' ? <article className="stellar-empty-account"><span>Wallet not funded</span><h2>Activate this account on Testnet.</h2><p>Use Stellar Laboratory or Friendbot to fund your public key, then refresh this page. PiggyBanq will never show a pretend balance here.</p><div><a href="https://laboratory.stellar.org/#account-creator?network=test" target="_blank" rel="noreferrer">Open Stellar Laboratory ↗</a><button type="button" onClick={() => void load()}>Refresh account</button></div></article> : null}
      </section>

      <section className="stellar-main-grid">
        <article className="stellar-panel stellar-actions-panel">
          <header><div><span>Money movement</span><h2>Review, sign, then send.</h2></div><small>Password requested only at signing</small></header>
          <div className="stellar-action-list">
            <button type="button" onClick={() => setAction('PAYMENT')} disabled={actionsDisabled}><i>→</i><span><strong>Send payment</strong><small>XLM or official Testnet USDC</small></span><b>Open</b></button>
            <button type="button" onClick={() => setAction('PATH_PAYMENT_STRICT_SEND')} disabled={actionsDisabled}><i>⇄</i><span><strong>Swap assets</strong><small>Live Stellar strict-send path</small></span><b>Quote</b></button>
            <button type="button" onClick={() => setAction('CHANGE_TRUST')} disabled={actionsDisabled || Boolean(live?.balances.USDC.trustline)}><i>＋</i><span><strong>Enable USDC</strong><small>Official Testnet issuer only</small></span><b>{live?.balances.USDC.trustline ? 'Enabled' : 'Review'}</b></button>
          </div>
          <p className="stellar-custody-note"><span>⌁</span><strong>Keys stay in your browser.</strong> The server prepares unsigned XDR; your locally encrypted PiggyBanq wallet verifies and signs it only after review.</p>
        </article>

        <article className="stellar-panel stellar-yield-panel">
          <header><div><span>Yield Lab</span><h2>A forecast, not a deposit.</h2></div><b>SIMULATION ONLY</b></header>
          <div className="stellar-yield-figure"><span>Illustrative annual rate</span><strong>5.20<small>%</small></strong><p>No funds are staked, lent, or transferred by this card.</p></div>
          <a href="/dashboard/pockets#yield-lab">Explore savings forecasts <span>→</span></a>
        </article>
      </section>

      <section className="stellar-panel stellar-activity-panel">
        <header><div><span>Ledger activity</span><h2>Recent wallet movement</h2></div><div className="stellar-refresh"><small>{resource.state === 'ready' ? `Updated ${new Date(resource.refreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for ledger'}</small><button type="button" onClick={() => void load()} disabled={isDemo || resource.state === 'loading'}>Refresh</button></div></header>
        {resource.state === 'loading' ? <div className="stellar-activity-loading"><i /><i /><i /></div> : null}
        {resource.state === 'ready' && resource.activity.length === 0 ? <div className="stellar-empty-activity"><span>◎</span><strong>{isDemo ? 'No demo activity added' : 'No supported payments yet'}</strong><p>XLM and official Testnet USDC payments will appear here after Horizon confirms them.</p></div> : null}
        {resource.state === 'ready' && resource.activity.length > 0 ? <div className="stellar-activity-table" role="table" aria-label="Recent Stellar activity">
          <div role="row" className="stellar-activity-heading"><span role="columnheader">Movement</span><span role="columnheader">Date</span><span role="columnheader">Amount</span><span role="columnheader">Status</span></div>
          {resource.activity.map((entry) => <a role="row" className="stellar-activity-row" key={entry.id} href={`https://stellar.expert/explorer/testnet/tx/${entry.transactionHash}`} target="_blank" rel="noreferrer">
            <span role="cell"><i className={`is-${entry.direction.toLowerCase()}`}>{entry.direction === 'IN' ? '↓' : entry.direction === 'OUT' ? '↑' : '↔'}</i><b>{entry.direction === 'IN' ? 'Received' : entry.direction === 'OUT' ? 'Sent' : 'Self transfer'}<small>{entry.source && entry.destination ? `${shortKey(entry.source)} → ${shortKey(entry.destination)}` : entry.type}</small></b></span>
            <time role="cell" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</time>
            <strong role="cell">{entry.direction === 'OUT' ? '−' : entry.direction === 'IN' ? '+' : ''}{formatUnits(entry.amountUnits)} {entry.assetCode}</strong>
            <em role="cell" className={entry.successful ? 'is-success' : 'is-failed'}>{entry.successful ? 'Confirmed' : 'Failed'}</em>
          </a>)}
        </div> : null}
      </section>

      <section className="stellar-capability-strip" aria-label="Current PiggyBanq capability boundary">
        <div><i>✓</i><span><strong>Stellar Testnet</strong><small>Live balances, payments, trustlines, swaps</small></span></div>
        <div><i>⌂</i><span><strong>Local custody</strong><small>Encrypted PiggyBanq browser wallet</small></span></div>
        <div className="is-muted"><i>○</i><span><strong>Mainnet disabled</strong><small>Audit and launch review required</small></span></div>
        <div className="is-muted"><i>◇</i><span><strong>External rails disabled</strong><small>No bridge or agentic payment execution</small></span></div>
      </section>

      {action ? <StellarTransactionDialog operation={action} username={username} publicKey={publicKey} onClose={() => setAction(null)} onSettled={() => void load()} /> : null}
    </div>
  );
}

function BalanceSkeleton() {
  return <article className="stellar-balance-card is-loading" aria-hidden="true"><i /><i /><i /></article>;
}
