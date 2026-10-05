import { DashboardShell, getDashboardSnapshot } from '../_components/DashboardShell';
import { requireWalletSession } from '../_lib/session';
import { AllocationsManager } from './AllocationsManager';

export default async function AllocationsPage() {
  const authUser = await requireWalletSession();
  const snapshot = await getDashboardSnapshot(authUser);

  return (
    <DashboardShell active="allocations" snapshot={snapshot}>
      <section className="savings-page-title allocation-page-title">
        <span>Allocations</span>
        <h1>Your monthly budget.</h1>
        <p>Organize your monthly budget into simple, focused allocations.</p>
      </section>

      <nav className="banking-plan-tabs" aria-label="Savings planning pages"><a href="/dashboard/goals">Goals</a><a href="/dashboard/allocations" aria-current="page">Budget</a></nav>

      <AllocationsManager />
      <aside className="banking-notice"><strong>Your plan, your pace</strong><p>Budget amounts are planning records. Creating or editing a budget does not move funds from your wallet.</p></aside>
    </DashboardShell>
  );
}
