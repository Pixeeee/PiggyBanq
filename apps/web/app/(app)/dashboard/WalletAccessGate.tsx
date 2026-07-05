'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import {
  getActiveWalletSession,
  loginWithWalletAccount,
  readAccounts,
  type ActiveWalletSession,
  type WalletAccountRecord
} from './secure-wallet';
import { WalletSetupPanel } from './WalletSetupPanel';

export function WalletAccessGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ActiveWalletSession | null>(null);
  const [accounts, setAccounts] = useState<WalletAccountRecord[]>([]);
  const [status, setStatus] = useState('Create secure wallet or log in with wallet before opening PiggyBanq.');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    setSession(getActiveWalletSession());
    setAccounts(readAccounts());
  }, []);

  if (session) {
    return <>{children}</>;
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get('username') ?? '');
    const password = String(form.get('password') ?? '');
    setIsLoggingIn(true);

    try {
      const nextSession = await loginWithWalletAccount(username, password);
      setSession(nextSession);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Wallet login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <main className="wallet-access-page">
      <section className="wallet-access-layout" aria-labelledby="wallet-access-title">
        <div className="wallet-access-card">
          <p className="dashboard-section-label">00 - WALLET LOGIN</p>
          <h1 id="wallet-access-title">Create secure wallet</h1>
          <p>{status}</p>

          <WalletSetupPanel
            onWalletReady={(account) => {
              setAccounts([account, ...accounts]);
              setStatus('Wallet account created. Log in with wallet using your username and password.');
            }}
          />
        </div>

        <aside className="wallet-access-card wallet-login-panel" aria-labelledby="wallet-login-title">
          <div className="dashboard-card-heading">
            <h2 id="wallet-login-title">Log in with wallet</h2>
            <span className="wallet-state">{accounts.length} USER{accounts.length === 1 ? '' : 'S'}</span>
          </div>
          <form className="feature-form" onSubmit={login}>
            <label>
              Username
              <input autoComplete="username" name="username" />
            </label>
            <label>
              Password
              <input autoComplete="current-password" name="password" type="password" />
            </label>
            <button disabled={isLoggingIn} type="submit">
              {isLoggingIn ? 'Checking...' : 'Log in with wallet'}
            </button>
          </form>

          <div className="community-preview">
            <span>Community is available before profile completion</span>
            <strong>Calamity Relief</strong>
            <p>Read help posts, groups, discussions, global chat, and private chat after wallet login. Profile setup can happen later.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
