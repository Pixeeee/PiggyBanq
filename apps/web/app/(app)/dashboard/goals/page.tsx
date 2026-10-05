import { DashboardShell, getDashboardSnapshot } from '../_components/DashboardShell';
import { requireWalletSession } from '../_lib/session';
import { GoalsManager } from './GoalsManager';

export default async function GoalsPage() {
  const authUser = await requireWalletSession();
  const snapshot = await getDashboardSnapshot(authUser);

  return (
    <DashboardShell active="goals" snapshot={snapshot}>
      <section className="savings-page-title">
        <span>Goals</span>
        <h1>Your savings plans.</h1>
        <p>Create a plan for bills, a trip, or something you love.</p>
      </section>

      <nav className="banking-plan-tabs" aria-label="Savings planning pages"><a href="/dashboard/goals" aria-current="page">Goals</a><a href="/dashboard/allocations">Budget</a></nav>

      <section className="savings-main-grid">
        <section className="savings-center-column">
          <GoalsManager />

        </section>

        <aside className="wallet-mini-card">
          <span>Goal rules</span>
          <strong>Reserve first, spend later</strong>
          <small>Goal entries are app-layer planning records until a user confirms a real Stellar transaction.</small>
        </aside>
      </section>
    </DashboardShell>
  );
}
