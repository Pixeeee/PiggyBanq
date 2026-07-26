import { DashboardShell, getDashboardSnapshot } from '../_components/DashboardShell';
import { requireWalletSession } from '../_lib/session';
import { ProfileForm } from './ProfileForm';

export default async function ProfilePage() {
  const authUser = await requireWalletSession();
  const snapshot = await getDashboardSnapshot(authUser);

  return (
    <DashboardShell active="profile" snapshot={snapshot}>
      <section className="savings-page-title">
        <span>Profile</span>
        <h1>Update your profile and dashboard theme.</h1>
        <p>Profile controls are separate from overview so money planning stays focused.</p>
      </section>

      <section className="savings-main-grid">
        <ProfileForm user={authUser} />
        <aside className="wallet-mini-card">
          <span>Privacy</span>
          <strong>Wallet address only when needed</strong>
          <small>Your session is verified by the backend. Private keys remain local.</small>
        </aside>
      </section>
    </DashboardShell>
  );
}
