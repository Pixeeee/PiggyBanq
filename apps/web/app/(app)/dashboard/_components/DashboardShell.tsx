import type { ReactNode } from 'react';
import { MobileDashboardNavigation } from './MobileDashboardNavigation';

import { DashboardLogoutButton } from '../../../components/DashboardLogoutButton';
import { ThemeToggle } from '../../../components/ThemeToggle';
import type { AuthUser } from '../_lib/session';

export type DashboardSection = 'overview' | 'allocations' | 'pockets' | 'goals' | 'profile' | 'agent';

type DashboardSnapshot = {
  network: string;
  accountLabel: string;
  walletLinked: boolean;
};

const navItems: Array<{ activeId?: DashboardSection; label: string; href: string; icon: IconName }> = [
  { activeId: 'overview', label: 'Home', href: '/dashboard', icon: 'home' },
  { activeId: 'goals', label: 'Save', href: '/dashboard/goals', icon: 'wallet' },
  { label: 'Send', href: '/dashboard#send', icon: 'send' },
  { activeId: 'profile', label: 'You', href: '/dashboard/profile', icon: 'user' }
];
const extraNav = [
  { activeId: 'agent', label: 'Test API payments', href: '/dashboard/agent', icon: 'send' },
  { activeId: 'allocations', label: 'Allocations', href: '/dashboard/allocations', icon: 'pocket' },
  { label: 'Swap', href: '/dashboard/pockets#swap', icon: 'swap' },
  { label: 'Yield Lab', href: '/dashboard/pockets#yield-lab', icon: 'stake' }
] as const;
function isSelected(active: DashboardSection, item: typeof navItems[number]) {
  return active === item.activeId || (active === 'allocations' && item.activeId === 'goals');
}

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
      <section className={`savings-dashboard-app is-${active}`} aria-label="PiggyBanq savings dashboard">
        <aside className="savings-sidebar" aria-label="Savings navigation">
          <a className="savings-brand" href="/dashboard">
            <span><img src="/piggy_icon.png" alt="" /></span>
            PiggyBanq
          </a>

          <nav className="savings-nav" aria-label="Primary savings pages">
            {navItems.map((item) => (
              <a key={item.label} className={isSelected(active, item) ? 'is-active' : undefined} aria-current={isSelected(active, item) ? 'page' : undefined} href={item.href}>
                <Icon name={item.icon} /> {item.label}
              </a>
            ))}
          </nav>
          <nav className="banking-extra-nav" aria-label="More savings tools"><span>Explore</span>{extraNav.map(item => <a key={item.label} href={item.href} aria-current={'activeId' in item && active === item.activeId ? 'page' : undefined}><Icon name={item.icon} />{item.label}</a>)}</nav>

          <div className="savings-sidebar-card">
            <span>NETWORK</span>
            <strong>{snapshot.network}</strong>
            <small>{snapshot.accountLabel}</small>
          </div>
        </aside>

        <section className="savings-workspace">
          <header className="savings-topbar">
            <span>PiggyBanq · Stellar Testnet</span>

            <div className="savings-topbar-actions">
              <ThemeToggle />
              <DashboardLogoutButton />
            </div>
          </header>

          <div className={active === 'overview' ? 'savings-content-frame is-portfolio agentic-dashboard-frame' : 'savings-content-frame agentic-dashboard-frame'}>
            {children}
          </div>
        </section>
      </section>
      <MobileDashboardNavigation moreIcon={<Icon name="grid" />} moreLinks={extraNav.map(item=><a key={item.label} href={item.href}><Icon name={item.icon}/>{item.label}</a>)}>{navItems.map(item => <a key={item.label} href={item.href} className={isSelected(active, item) ? 'is-active' : undefined} aria-current={isSelected(active, item) ? 'page' : undefined}><Icon name={item.icon} /><span>{item.label}</span></a>)}</MobileDashboardNavigation>
    </main>
  );
}

export type IconName =
  | 'home'
  | 'eye'
  | 'eye-off'
  | 'receive'
  | 'refresh'
  | 'close'
  | 'bridge'
  | 'card'
  | 'chevron'
  | 'grid'
  | 'move'
  | 'plus'
  | 'pocket'
  | 'search'
  | 'send'
  | 'shield'
  | 'spark'
  | 'stake'
  | 'swap'
  | 'target'
  | 'token'
  | 'user'
  | 'wallet';

export function Icon({ name }: { name: IconName }) {
  const common = { 'aria-hidden': true as const, width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' };
  const stroke = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'home': return <svg {...common}><path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z" {...stroke} /></svg>;
    case 'eye': return <svg {...common}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" {...stroke} /><circle cx="12" cy="12" r="3" {...stroke} /></svg>;
    case 'eye-off': return <svg {...common}><path d="m3 3 18 18M2 12s4-7 10-7 10 7 10 7M5 16c2 2 4 3 7 3 2 0 4-1 6-3" {...stroke} /></svg>;
    case 'receive': return <svg {...common}><path d="M12 3v17m-6-6 6 6 6-6" {...stroke} /></svg>;
    case 'refresh': return <svg {...common}><path d="M20 8a8 8 0 1 0 1 6M20 3v5h-5" {...stroke} /></svg>;
    case 'close': return <svg {...common}><path d="m6 6 12 12M6 18 18 6" {...stroke} /></svg>;
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
    case 'move':
      return <svg {...common}><path d="M12 3v18M6 9l6-6 6 6M6 15l6 6 6-6" {...stroke} /></svg>;
    case 'token':
      return <svg {...common}><circle cx="12" cy="12" r="8" {...stroke} /><path d="M9 12h6M12 9v6" {...stroke} /></svg>;
    case 'card':
      return <svg {...common}><rect x="3" y="6" width="18" height="12" rx="2" {...stroke} /><path d="M3 10h18M7 15h4" {...stroke} /></svg>;
    case 'spark':
      return <svg {...common}><path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" {...stroke} /></svg>;
    case 'swap':
      return <svg {...common}><path d="M7 7h11l-3-3M17 17H6l3 3" {...stroke} /></svg>;
    case 'bridge':
      return <svg {...common}><path d="M5 17c2-6 12-6 14 0M5 17h14M7 17V9m10 8V9M9 9h6" {...stroke} /></svg>;
    case 'stake':
      return <svg {...common}><path d="M12 3v18M8 7h8M7 12h10M6 17h12" {...stroke} /></svg>;
    case 'send':
      return <svg {...common}><path d="M4 12h14M13 6l6 6-6 6" {...stroke} /><path d="M4 18V6" {...stroke} /></svg>;
    default:
      return null;
  }
}
