'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { logout } from '../lib/wallet-auth-api';

export function DashboardLogoutButton() {
  const router = useRouter();
  const [isBusy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <button className="dashboard-auth-button" type="button" disabled={isBusy} onClick={handleLogout}>
      {isBusy ? 'Signing out...' : 'Logout'}
    </button>
  );
}
