'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { clearLocalDemoSession, logout } from '../lib/wallet-auth-api';

export function DashboardLogoutButton() {
  const router = useRouter();
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    setBusy(true);
    setError('');
    try {
      await logout();
      await clearLocalDemoSession().catch(() => undefined);
      localStorage.removeItem('piggybanq.activeWalletSession');
      router.replace('/login');
      router.refresh();
    } catch {
      setError('Sign out failed. Your session is still active. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <button className="dashboard-auth-button" type="button" disabled={isBusy} onClick={handleLogout}>
      {isBusy ? 'Signing out...' : 'Logout'}
    </button>
    {error ? <span role="alert">{error}</span> : null}
    </>
  );
}
