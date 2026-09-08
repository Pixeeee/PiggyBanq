'use client';

import { useState } from 'react';

import {
  dashboardKpis,
  dashboardQuickActions,
  dashboardTokenRates,
  portfolioTabs,
  portfolioTokens,
  weeklySavingsActivity
} from './_data/savings-dashboard';
import { AgenticCommandCenter } from './AgenticCommandCenter';
import { UiBadge } from '../../components/ui/DashboardPrimitives';
import { DashboardLogoutButton } from '../../components/DashboardLogoutButton';
import { ThemeToggle } from '../../components/ThemeToggle';

const activityPoints = weeklySavingsActivity.map((point) => `${point.x},${point.y}`).join(' ');
const activityArea = `M ${weeklySavingsActivity[0].x} 190 L ${activityPoints.replaceAll(' ', ' L ')} L ${weeklySavingsActivity[weeklySavingsActivity.length - 1].x} 190 Z`;

export function PortfolioDashboard({
  accountLabel,
  displayName
}: {
  accountLabel: string;
  displayName: string;
}) {
  const [balanceVisible, setBalanceVisible] = useState(true);

  return (
    <div className="portfolio-dashboard operations-dashboard" aria-label="Crypto portfolio dashboard">
      <header className="operations-header">
        <div>
          <span>Welcome back, {displayName}</span>
          <h1>Savings overview</h1>
        </div>
        <div className="operations-header-actions">
          <span className="operations-network-status"><i /> Stellar Testnet</span>
          <a className="operations-stake-link" href="/dashboard/pockets#stake">Open Stake</a>
          <span className="operations-wallet-chip" title={accountLabel}>{accountLabel}</span>
          <ThemeToggle />
          <DashboardLogoutButton />
        </div>
      </header>

      <div className="operations-rail-chips" aria-label="PiggyBanq provider responsibilities">
        <span><i className="is-stellar" /> Stellar Yield</span>
        <span><i className="is-circle" /> Circle CCTP · Base route</span>
        <span><i className="is-binance" /> Binance x402 · approval only</span>
        <small>Illustrative testnet data</small>
      </div>

      <section className="dashboard-kpi-grid" aria-label="Savings key metrics">
        {dashboardKpis.map((item) => (
          <article className={`dashboard-kpi-card is-${item.tone}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{balanceVisible ? item.value : '••••••'}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>

      <section className="dashboard-primary-grid">
        <article className="operations-panel savings-lock-panel">
          <header className="operations-panel-heading">
            <div><span>Locked savings</span><h2>Next maturity</h2></div>
            <UiBadge tone="warning">30-day pocket</UiBadge>
          </header>

          <div className="maturity-calendar"><span>Tuesday</span><strong>Oct 08, 2026</strong></div>
          <div className="maturity-countdown" aria-label="12 days 8 hours 24 minutes remaining">
            <div><strong>12</strong><span>Days</span></div>
            <div><strong>08</strong><span>Hours</span></div>
            <div><strong>24</strong><span>Mins</span></div>
          </div>
          <div className="maturity-value">
            <span>Projected at maturity</span>
            <strong>{balanceVisible ? '250.92 USDC' : '••••••'}</strong>
            <small>5.20% simulated APR · yield is not guaranteed</small>
          </div>
          <a href="/dashboard/pockets#stake">Review stake position <span aria-hidden="true">→</span></a>
        </article>

        <article className="operations-panel savings-activity-chart">
          <header className="operations-panel-heading">
            <div><span>Stellar savings</span><h2>Weekly savings activity</h2></div>
            <div className="activity-summary"><strong>PHP 9,500</strong><small>+18.4% this week</small></div>
          </header>

          <div className="activity-chart-wrap">
            <div className="activity-y-axis" aria-hidden="true"><span>2k</span><span>1.5k</span><span>1k</span><span>500</span><span>0</span></div>
            <svg viewBox="0 0 640 210" role="img" aria-labelledby="weekly-activity-title weekly-activity-description">
              <title id="weekly-activity-title">Weekly savings activity line chart</title>
              <desc id="weekly-activity-description">Savings rose from PHP 860 on Monday to a high of PHP 1,880 on Thursday and ended at PHP 1,460 on Sunday.</desc>
              <defs><linearGradient id="activity-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#f57799" stopOpacity="0.3" /><stop offset="100%" stopColor="#f57799" stopOpacity="0" /></linearGradient></defs>
              <g className="activity-grid-lines" aria-hidden="true"><line x1="0" x2="640" y1="30" y2="30" /><line x1="0" x2="640" y1="70" y2="70" /><line x1="0" x2="640" y1="110" y2="110" /><line x1="0" x2="640" y1="150" y2="150" /><line x1="0" x2="640" y1="190" y2="190" /></g>
              <path className="activity-area" d={activityArea} />
              <polyline className="activity-line" points={activityPoints} />
              {weeklySavingsActivity.map((point) => <circle key={point.day} className="activity-point" cx={point.x} cy={point.y} r="5"><title>{point.day}: PHP {point.value.toLocaleString()}</title></circle>)}
            </svg>
          </div>
          <div className="activity-x-axis" aria-hidden="true">{weeklySavingsActivity.map((point) => <span key={point.day}>{point.day}</span>)}</div>
          <footer className="activity-chart-footer"><span><i /> Deposits and pocket allocations</span><small>Testnet ledger model</small></footer>
        </article>
      </section>

      <section className="dashboard-secondary-grid">
        <article className="operations-panel dashboard-quick-actions">
          <header className="operations-panel-heading"><div><span>Move money</span><h2>Quick actions</h2></div><small>Preview before approval</small></header>
          <div>
            {dashboardQuickActions.map((action) => (
              <a href={action.href} key={action.label}><i aria-hidden="true">{action.glyph}</i><span><strong>{action.label}</strong><small>{action.note}</small></span><b aria-hidden="true">→</b></a>
            ))}
          </div>
          <p>No silent signing. Every financial action shows amount, asset, destination, network, and fee first.</p>
        </article>

        <article className="operations-panel dashboard-token-rates">
          <header className="operations-panel-heading"><div><span>Reference prices</span><h2>Token rates</h2></div><UiBadge>Testnet view</UiBadge></header>
          <div className="token-rate-list">
            {dashboardTokenRates.map((token) => (
              <div key={token.symbol}><span className={`token-rate-icon is-${token.tone}`}>{token.symbol.slice(0, 1)}</span><span><strong>{token.symbol}</strong><small>{token.name}</small></span><span><strong>{token.price}</strong><small>{token.change}</small></span></div>
            ))}
          </div>
          <small>Reference values are illustrative and are not executable quotes.</small>
        </article>
      </section>

      <section className="portfolio-summary-panel operations-portfolio-panel" aria-label="All accounts portfolio summary">
        <div className="portfolio-summary-heading">
          <div><span>All accounts</span><strong>Asset positions</strong><small>{accountLabel}</small></div>
          <div className="portfolio-balance-row">
            <strong>{balanceVisible ? '$4,341.10' : '••••••'}</strong>
            <span className="portfolio-change is-positive">Illustrative testnet portfolio</span>
            <button aria-label={balanceVisible ? 'Hide portfolio balance' : 'Show portfolio balance'} className="portfolio-visibility-button" onClick={() => setBalanceVisible((current) => !current)} type="button"><EyeIcon hidden={!balanceVisible} /></button>
          </div>
        </div>

        <nav className="portfolio-tabs" aria-label="Portfolio sections">{portfolioTabs.map((tab) => <button className={tab === 'Tokens' ? 'is-active' : undefined} key={tab} type="button">{tab}</button>)}</nav>
        <div className="portfolio-filter-row" aria-label="Portfolio filters">
          <label><span>Account</span><select defaultValue="all"><option value="all">All accounts</option><option value="main">Main wallet</option><option value="savings">Savings wallet</option></select></label>
          <label className="portfolio-network-filter"><span>Network</span><select defaultValue="all-networks"><option value="all-networks">All networks</option><option value="stellar">Stellar Testnet</option><option value="stable">Stable rails</option></select><i aria-hidden="true"><b /><b /><b /></i></label>
          <label><span>Token view</span><select defaultValue="portfolio"><option value="portfolio">Portfolio value</option><option value="balance">Token balance</option><option value="change">24h change</option></select></label>
          <button className="portfolio-more-button" type="button">More</button>
        </div>

        <div className="portfolio-token-table" role="table" aria-label="Token portfolio table">
          <div className="portfolio-token-header" role="row"><span role="columnheader">Token</span><span role="columnheader">Portfolio %</span><span role="columnheader">Price / 24h change</span><span role="columnheader">Balance</span></div>
          {portfolioTokens.map((token) => (
            <article className="portfolio-token-row" key={token.symbol} role="row">
              <div className="portfolio-token-identity" role="cell"><span className={`portfolio-token-icon is-${token.tone}`}>{token.symbol.slice(0, 1)}</span><div><strong>{token.symbol}</strong><small>{token.name}</small></div></div>
              <span role="cell">{token.portfolioPercent}</span>
              <div className="portfolio-price-cell" role="cell"><strong>{token.price}</strong><small className={token.trend === 'positive' ? 'is-positive' : 'is-negative'}>{token.change24h}</small></div>
              <div className="portfolio-balance-cell" role="cell"><strong>{token.fiatBalance}</strong><small>{token.balance}</small></div>
            </article>
          ))}
        </div>
      </section>

      <section className="operations-agentic-section">
        <header className="operations-section-intro"><span>Agentic controls</span><h2>Prepare, review, then approve.</h2><p>Binance x402 handles payment intents while Stellar remains your savings and yield rail.</p></header>
        <AgenticCommandCenter />
      </section>
    </div>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12s3.3-6 9-6 9 6 9 6-3.3 6-9 6-9-6-9-6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      {hidden ? <path d="M4 20 20 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : null}
    </svg>
  );
}
