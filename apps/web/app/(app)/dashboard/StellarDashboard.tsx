'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StellarAccountSummary, StellarActivityView, StellarCapabilities, StellarOperationType } from '@piggybanq/types/stellar-transactions';

import { DashboardLogoutButton } from '../../components/DashboardLogoutButton';
import { ThemeToggle } from '../../components/ThemeToggle';
import { getStellarActivity, getStellarCapabilities, getStellarSummary } from '../../lib/wallet-auth-api';
import { StellarTransactionDialog } from './StellarTransactionDialog';
import { Icon } from './_components/DashboardShell';
import { ActivityOverview } from './_components/ActivityOverview';
import { PiggyCompanion } from './_components/PiggyCompanion';
import { PlanningPreview } from './_components/PlanningPreview';
import { TestnetFunding } from './_components/TestnetFunding';
import { ReceiveAddress } from './_components/ReceiveAddress';
import { formatLedgerUnits as formatUnits } from './_components/ledger-format';

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

function shortKey(value: string) {
  return `${value.slice(0, 7)}…${value.slice(-7)}`;
}

export function StellarDashboard({ displayName, username, publicKey, isDemo }: { displayName: string; username: string; publicKey: string; isDemo: boolean }) {
  const [resource, setResource] = useState<DashboardResource>(isDemo
    ? { state: 'ready', summary: demoSummary, activity: [], capabilities: demoCapabilities, refreshedAt: new Date().toISOString() }
    : { state: 'loading' });
  const [action, setAction] = useState<StellarOperationType | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [asset, setAsset] = useState<'XLM' | 'USDC'>('XLM');
  const [receiveVisible, setReceiveVisible] = useState(false);

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

  const closeAction = () => {
    setAction(null);
    if (window.location.hash === '#send') window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  const live = resource.state === 'ready' && resource.summary.status === 'LIVE' ? resource.summary : null;
  const actionsDisabled = isDemo || resource.state !== 'ready' || resource.summary.status !== 'LIVE' || resource.capabilities.emergencyReadOnly;

  return (
    <div className="stellar-dashboard clean-dashboard" aria-label="PiggyBanq Stellar Testnet dashboard">
      <header className="stellar-dashboard-hero">
        <div className="banking-greeting"><span>Your everyday, a little brighter</span><h1>Welcome back, {(displayName || username || 'Saver').replace(/_/g, ' ')}</h1><p>Here’s where your money stands today.</p></div>
        <div className="banking-header-actions"><span className="banking-network-status" role="status">{isDemo ? 'Demo data' : resource.state === 'error' ? 'Ledger unavailable' : resource.state === 'loading' ? 'Connecting…' : 'Live Testnet'}</span><ThemeToggle /><DashboardLogoutButton /><a href="/dashboard/profile" className="banking-icon-button" aria-label="Open profile and security"><Icon name="user" /></a></div>
      </header>

      {isDemo ? <div className="stellar-banner is-demo" role="status"><strong>Development demo</strong><span>These sample balances are not read from Stellar and cannot be signed or submitted.</span></div> : null}
      {resource.state === 'error' ? <div className="stellar-banner is-error" role="alert"><strong>Live ledger unavailable</strong><span>{resource.message} No demo values were substituted.</span><button type="button" onClick={() => void load()}>Retry</button></div> : null}
      {resource.state === 'ready' && resource.capabilities.emergencyReadOnly ? <div className="stellar-banner is-warning" role="status"><strong>Read-only mode</strong><span>Balances remain available, but new transactions are paused.</span></div> : null}

      <section className="banking-home-grid">
        <div className="banking-wallet-column">
          <section className="stellar-balance-grid" aria-label="Live asset balances" aria-busy={resource.state === 'loading'}>
            <article className="banking-balance-card">
              <header><div><span>Your wallet balance</span><small>STELLAR TESTNET</small></div><button type="button" className="banking-icon-button" onClick={() => setBalanceVisible(value => !value)} aria-label={balanceVisible ? 'Hide balances' : 'Show balances'}><Icon name={balanceVisible ? 'eye' : 'eye-off'} /></button></header>
              <strong aria-live="polite">{balanceVisible ? formatUnits(live?.balances[asset].balanceUnits) : '••••••'} <small>{asset}</small></strong>
              <p>Test assets · No monetary value</p>
              <div className="banking-asset-selector" aria-label="Balance asset">{(['XLM', 'USDC'] as const).map(value => <button type="button" key={value} aria-pressed={asset === value} onClick={() => setAsset(value)}>{value}</button>)}</div>
              {live ? <small className="banking-available">{balanceVisible ? `Balance less liabilities ${formatUnits(live.balances[asset].availableUnits)} ${asset}` : 'Available balance hidden'}{asset === 'XLM' ? ' · Reserve and fees apply' : !live.balances.USDC.trustline ? ' · Trustline not enabled' : !live.balances.USDC.authorized ? ' · Authorization required' : ''}</small> : <small className="banking-available">{resource.state === 'loading' ? 'Connecting to the live ledger…' : 'Balance unavailable'}</small>}
            </article>
          </section>
          {resource.state === 'ready' && resource.summary.status === 'NOT_FOUND' ? <div className="banking-notice" role="status"><strong>Wallet not funded</strong><p>Fund this public address on Stellar Testnet, then refresh your wallet.</p><a href="https://laboratory.stellar.org/#account-creator?network=test" target="_blank" rel="noreferrer">Open Stellar Laboratory ↗</a></div> : null}
          <nav className="banking-quick-actions" aria-label="Wallet quick actions">
            <button type="button" onClick={() => setAction('PAYMENT')} disabled={actionsDisabled}><i><Icon name="send" /></i><span>Send</span></button>
            <button type="button" onClick={() => setReceiveVisible(true)} disabled={!publicKey}><i><Icon name="receive" /></i><span>Receive</span></button>
            <a href="/dashboard/goals"><i><Icon name="wallet" /></i><span>Save</span></a>
            <button type="button" onClick={() => void load()} disabled={isDemo || resource.state === 'loading'} aria-label="Refresh live ledger"><i><Icon name="refresh" /></i><span>Refresh</span></button>
          </nav>
          <TestnetFunding disabled={isDemo || !publicKey} onRefresh={load} />
        </div>
        <ActivityOverview activity={resource.state === 'ready' ? resource.activity : []} asset={asset} ready={resource.state === 'ready'} hidden={!balanceVisible} />
      </section>
      <div className="clean-secondary-grid"><PlanningPreview isDemo={isDemo} /><div className="clean-sidekick"><PiggyCompanion /><div className="banking-custody"><Icon name="shield" /><div><strong>Keys stay in your browser.</strong><p>Every transaction is reviewed and signed on this device.</p></div></div></div></div>

      <section className="stellar-panel stellar-activity-panel">
        <header><div><span>Ledger activity</span><h2>Recent activity</h2></div><div className="stellar-refresh"><small>{resource.state === 'ready' ? `Updated ${new Date(resource.refreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for ledger'}</small><button type="button" onClick={() => void load()} disabled={isDemo || resource.state === 'loading'}>Refresh</button></div></header>
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

      <details className="banking-more-tools"><summary>More wallet tools</summary><section className="stellar-actions-panel"><div className="banking-tool-actions"><button type="button" onClick={() => setAction('PATH_PAYMENT_STRICT_SEND')} disabled={actionsDisabled}><Icon name="swap" />Swap assets</button><button type="button" onClick={() => setAction('CHANGE_TRUST')} disabled={actionsDisabled || Boolean(live?.balances.USDC.trustline)}><Icon name="plus" />{live?.balances.USDC.trustline ? 'USDC enabled' : 'Enable USDC'}</button></div><a href="/dashboard/pockets#yield-lab">Yield Lab · SIMULATION ONLY</a><p>No funds are staked, lent, or transferred by forecasts.</p><small>Mainnet disabled · External rails disabled</small></section></details>
      <footer className="banking-footer">{shortKey(publicKey)} · Stellar Testnet · Keys stay on your device</footer>
      {receiveVisible ? <ReceiveAddress publicKey={publicKey} onClose={() => setReceiveVisible(false)} /> : null}

      {action ? <StellarTransactionDialog operation={action} username={username} publicKey={publicKey} onClose={closeAction} onSettled={() => void load()} /> : null}
    </div>
  );
}
