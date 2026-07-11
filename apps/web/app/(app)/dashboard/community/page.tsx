import { DashboardLogoutButton } from '../../../components/DashboardLogoutButton';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { requireWalletSession } from '../_lib/session';
import { CommunityDashboard } from './CommunityDashboard';

export default async function DashboardCommunityPage() {
  const authUser = await requireWalletSession();

  return (
    <div className="dashboard-community-page">
      <header className="community-page-topbar" aria-label="Community workspace status">
        <a className="community-back-link" href="/dashboard">Dashboard</a>
        <div>
          <span>TESTNET</span>
          <strong>{authUser.displayName}</strong>
        </div>
        <ThemeToggle />
        <DashboardLogoutButton />
      </header>

      <main className="community-page-main">
        <CommunityDashboard />
      </main>
    </div>
  );
}
