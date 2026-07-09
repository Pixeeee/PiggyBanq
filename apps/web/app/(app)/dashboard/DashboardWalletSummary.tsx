'use client';

import { useEffect, useState } from 'react';

import { ACTIVE_WALLET_SESSION_KEY, type ActiveWalletSession } from './secure-wallet';

export function DashboardWalletSummary({ kycFreeLimitPhp }: { kycFreeLimitPhp: number }) {
  const [wallet, setWallet] = useState<ActiveWalletSession | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_WALLET_SESSION_KEY);

    if (!stored) {
      return;
    }

    try {
      setWallet(JSON.parse(stored) as ActiveWalletSession);
    } catch {
      localStorage.removeItem(ACTIVE_WALLET_SESSION_KEY);
    }
  }, []);

  return (
    <section className="dashboard-metrics" aria-label="Wallet overview">
      <article className="dashboard-card metric-card metric-card-primary">
        <div className="metric-heading">
          <p>TESTNET BALANCE</p>
          <button type="button" aria-label="Testnet balance status">
            <span className="metric-action-dot" aria-hidden="true" />
          </button>
        </div>
        <strong>{wallet ? 'Wallet linked' : 'No wallet linked'}</strong>
        <span>{wallet ? 'Live balance pending Horizon sync' : 'Log in with a local wallet to unlock the wallet workspace.'}</span>
        <dl>
          <div>
            <dt>Network</dt>
            <dd>TESTNET</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>{wallet ? maskPublicKey(wallet.publicKey) : 'No account linked'}</dd>
          </div>
        </dl>
      </article>

      <article className="dashboard-card metric-card">
        <div className="metric-heading">
          <p>KYC-FREE LIMIT</p>
          <button type="button" aria-label="KYC-free status">
            <span className="metric-action-diamond" aria-hidden="true" />
          </button>
        </div>
        <strong>PHP {kycFreeLimitPhp.toLocaleString()}.00</strong>
        <span>Placeholder monthly transaction limit</span>
        <dl>
          <div>
            <dt>Status</dt>
            <dd><span className="mini-badge">KYC-FREE</span></dd>
          </div>
          <div>
            <dt>Reset</dt>
            <dd>Monthly</dd>
          </div>
        </dl>
      </article>

      <article className="dashboard-card metric-card">
        <div className="metric-heading">
          <p>SAVINGS POCKETS</p>
          <button type="button" aria-label="Savings pockets">
            <span className="metric-action-plus" aria-hidden="true" />
          </button>
        </div>
        <strong>0</strong>
        <span>Create pockets for goals, bills, and emergency savings.</span>
        <dl>
          <div>
            <dt>Total Saved</dt>
            <dd>PHP 0.00</dd>
          </div>
          <div>
            <dt>Total Goals</dt>
            <dd>PHP 0.00</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}

function maskPublicKey(value: string) {
  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}
