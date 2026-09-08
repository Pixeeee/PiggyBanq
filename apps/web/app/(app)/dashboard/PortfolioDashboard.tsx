'use client';

import { useState } from 'react';

import { portfolioActions, portfolioTabs, portfolioTokens } from './_data/savings-dashboard';
import { AgenticCommandCenter } from './AgenticCommandCenter';
import { UiBadge, UiCard, UiProgress } from '../../components/ui/DashboardPrimitives';

export function PortfolioDashboard({
  accountLabel,
  displayName
}: {
  accountLabel: string;
  displayName: string;
}) {
  const [balanceVisible, setBalanceVisible] = useState(true);

  return (
    <div className="portfolio-dashboard" aria-label="Crypto portfolio dashboard">
      <header className="portfolio-page-header agentic-portfolio-header">
        <div>
          <UiBadge tone="rose">Stellar Testnet · local sandbox</UiBadge>
          <span>Welcome back, {displayName}</span>
          <h1>Your money, routed with permission.</h1>
        </div>
        <p>Save and model yield on Stellar. Bridge native USDC to Base. Authorize Binance x402 payments without handing the agent your Stellar keys.</p>
      </header>

      <section className="rail-status-grid" aria-label="Provider rail status">
        <UiCard><div><span className="rail-orb is-stellar">✦</span><UiBadge tone="success">Ready</UiBadge></div><strong>Stellar Yield</strong><p>Savings, XLM/USDC swaps, and sourced yield simulation.</p><UiProgress value={72} label="Goal allocation" /></UiCard>
        <UiCard><div><span className="rail-orb is-circle">◎</span><UiBadge tone="warning">Testnet</UiBadge></div><strong>Circle CCTP</strong><p>Native USDC route from Stellar domain 27 to Base domain 6.</p><small>BSC USDC route unavailable</small></UiCard>
        <UiCard><div><span className="rail-orb is-binance">B</span><UiBadge>Sandbox</UiBadge></div><strong>Binance x402</strong><p>Agentic payments with a 20 USDC cap and explicit approval.</p><small>No external withdrawals</small></UiCard>
      </section>

      <section className="portfolio-action-row" aria-label="Portfolio actions">
        {portfolioActions.map((action) => (
          <button key={action} type="button">
            <ActionGlyph label={action} />
            {action}
          </button>
        ))}
      </section>

      <section className="portfolio-summary-panel" aria-label="All accounts portfolio summary">
        <div className="portfolio-summary-heading">
          <div>
            <span>All accounts</span>
            <strong>{accountLabel}</strong>
          </div>
          <button
            aria-label={balanceVisible ? 'Hide portfolio balance' : 'Show portfolio balance'}
            className="portfolio-visibility-button"
            onClick={() => setBalanceVisible((current) => !current)}
            type="button"
          >
            <EyeIcon hidden={!balanceVisible} />
          </button>
        </div>

        <div className="portfolio-balance-row">
          <strong>{balanceVisible ? '$4,341.10' : '••••••'}</strong>
          <span className="portfolio-change is-positive">Illustrative testnet portfolio</span>
        </div>

        <nav className="portfolio-tabs" aria-label="Portfolio sections">
          {portfolioTabs.map((tab) => (
            <button className={tab === 'Tokens' ? 'is-active' : undefined} key={tab} type="button">{tab}</button>
          ))}
        </nav>

        <div className="portfolio-filter-row" aria-label="Portfolio filters">
          <label>
            <span>Account</span>
            <select defaultValue="all">
              <option value="all">All accounts</option>
              <option value="main">Main wallet</option>
              <option value="savings">Savings wallet</option>
            </select>
          </label>
          <label className="portfolio-network-filter">
            <span>Network</span>
            <select defaultValue="all-networks">
              <option value="all-networks">All networks</option>
              <option value="stellar">Stellar Testnet</option>
              <option value="stable">Stable rails</option>
            </select>
            <i aria-hidden="true"><b /> <b /> <b /></i>
          </label>
          <label>
            <span>Token view</span>
            <select defaultValue="portfolio">
              <option value="portfolio">Portfolio value</option>
              <option value="balance">Token balance</option>
              <option value="change">24h change</option>
            </select>
          </label>
          <button className="portfolio-more-button" type="button">More</button>
        </div>

        <div className="portfolio-token-table" role="table" aria-label="Token portfolio table">
          <div className="portfolio-token-header" role="row">
            <span role="columnheader">Token</span>
            <span role="columnheader">Portfolio %</span>
            <span role="columnheader">Price / 24h change</span>
            <span role="columnheader">Balance</span>
          </div>

          {portfolioTokens.map((token) => (
            <article className="portfolio-token-row" key={token.symbol} role="row">
              <div className="portfolio-token-identity" role="cell">
                <span className={`portfolio-token-icon is-${token.tone}`}>{token.symbol.slice(0, 1)}</span>
                <div>
                  <strong>{token.symbol}</strong>
                  <small>{token.name}</small>
                </div>
              </div>
              <span role="cell">{token.portfolioPercent}</span>
              <div className="portfolio-price-cell" role="cell">
                <strong>{token.price}</strong>
                <small className={token.trend === 'positive' ? 'is-positive' : 'is-negative'}>{token.change24h}</small>
              </div>
              <div className="portfolio-balance-cell" role="cell">
                <strong>{token.fiatBalance}</strong>
                <small>{token.balance}</small>
              </div>
            </article>
          ))}
        </div>

        <aside className="portfolio-safety-note">
          No silent signing. Review amount, asset, destination, network, and fee before any wallet prompt.
        </aside>
      </section>

      <AgenticCommandCenter />
    </div>
  );
}

function ActionGlyph({ label }: { label: string }) {
  return <span aria-hidden="true">{label.slice(0, 1)}</span>;
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
