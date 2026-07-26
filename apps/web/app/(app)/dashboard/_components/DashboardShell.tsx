import type { ReactNode } from 'react';

import { DashboardLogoutButton } from '../../../components/DashboardLogoutButton';
import { ThemeToggle } from '../../../components/ThemeToggle';
import type { AuthUser } from '../_lib/session';

export type DashboardSection = 'overview' | 'allocations' | 'pockets' | 'goals' | 'profile';

type DashboardSnapshot = {
  network: string;
  accountLabel: string;
  walletLinked: boolean;
};

const navItems: Array<{ id: DashboardSection; label: string; href: string; icon: IconName }> = [
  { id: 'overview', label: 'Overview', href: '/dashboard', icon: 'grid' },
  { id: 'allocations', label: 'Allocations', href: '/dashboard/allocations', icon: 'wallet' },
  { id: 'pockets', label: 'Pockets', href: '/dashboard/pockets', icon: 'pocket' },
  { id: 'goals', label: 'Goals', href: '/dashboard/goals', icon: 'target' },
  { id: 'profile', label: 'Profile', href: '/dashboard/profile', icon: 'user' }
];

export async function getDashboardSnapshot(user: AuthUser): Promise<DashboardSnapshot> {
  const stellarPublicKey = user.stellarPublicKey ?? '';

  return {
    network: 'TESTNET',
    accountLabel: stellarPublicKey ? `${stellarPublicKey.slice(0, 6)}...${stellarPublicKey.slice(-6)}` : 'No wallet linked',
    walletLinked: Boolean(stellarPublicKey)
  };
}

export function DashboardShell({
  active,
  children,
  snapshot
}: {
  active: DashboardSection;
  children: ReactNode;
  snapshot: DashboardSnapshot;
}) {
  return (
    <main className="savings-dashboard-shell">
      <section className="savings-dashboard-app" aria-label="PiggyBanq savings dashboard">
        <aside className="savings-sidebar" aria-label="Savings navigation">
          <a className="savings-brand" href="/dashboard">
            <span><img src="/piggy_icon.png" alt="" /></span>
            PiggyBanq
          </a>

          <nav className="savings-nav" aria-label="Primary savings pages">
            {navItems.map((item) => (
              <a key={item.id} className={active === item.id ? 'is-active' : undefined} href={item.href}>
                <Icon name={item.icon} /> {item.label}
              </a>
            ))}
          </nav>

          <div className="savings-sidebar-card">
            <span>NETWORK</span>
            <strong>{snapshot.network}</strong>
            <small>{snapshot.accountLabel}</small>
          </div>
        </aside>

        <section className="savings-workspace">
          <header className="savings-topbar">
            <label className="savings-search">
              <Icon name="search" />
              <span className="sr-only">Search savings categories</span>
              <input placeholder="Search food, bills, pockets..." />
            </label>

            <div className="savings-topbar-actions">
              <span className="savings-live"><i /> Live</span>
              <ThemeToggle />
              <DashboardLogoutButton />
            </div>
          </header>

          {children}
        </section>
      </section>
    </main>
  );
}

export type IconName = 'grid' | 'wallet' | 'pocket' | 'target' | 'shield' | 'search' | 'chevron' | 'user' | 'plus';

export function Icon({ name }: { name: IconName }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' };
  const stroke = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'grid':
      return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1.5" {...stroke} /><rect x="14" y="4" width="6" height="6" rx="1.5" {...stroke} /><rect x="4" y="14" width="6" height="6" rx="1.5" {...stroke} /><rect x="14" y="14" width="6" height="6" rx="1.5" {...stroke} /></svg>;
    case 'wallet':
      return <svg {...common}><path d="M4 7h15a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1Z" {...stroke} /><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" {...stroke} /></svg>;
    case 'pocket':
      return <svg {...common}><path d="M5 6h14v12H5z" {...stroke} /><path d="M5 7l7 6 7-6" {...stroke} /></svg>;
    case 'target':
      return <svg {...common}><circle cx="12" cy="12" r="8" {...stroke} /><circle cx="12" cy="12" r="3" {...stroke} /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" {...stroke} /></svg>;
    case 'shield':
      return <svg {...common}><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z" {...stroke} /><path d="m9 12 2 2 4-5" {...stroke} /></svg>;
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="7" {...stroke} /><path d="m16.5 16.5 3.5 3.5" {...stroke} /></svg>;
    case 'chevron':
      return <svg {...common}><path d="m7 10 5 5 5-5" {...stroke} /></svg>;
    case 'user':
      return <svg {...common}><circle cx="12" cy="8" r="4" {...stroke} /><path d="M5 21a7 7 0 0 1 14 0" {...stroke} /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" {...stroke} /></svg>;
    default:
      return null;
  }
}
