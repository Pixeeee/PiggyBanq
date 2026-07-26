import { DashboardShell, getDashboardSnapshot } from '../_components/DashboardShell';
import { GoalCard } from '../_components/SavingsCards';
import { userGoals } from '../_data/savings-dashboard';
import { requireWalletSession } from '../_lib/session';
import { GoalsManager } from './GoalsManager';

export default async function GoalsPage() {
  const authUser = await requireWalletSession();
  const snapshot = await getDashboardSnapshot(authUser);

  return (
    <DashboardShell active="goals" snapshot={snapshot}>
      <section className="savings-page-title">
        <span>Goals</span>
        <h1>Create budgets for bills and things you want to buy.</h1>
        <p>Add planned money for a specific bill, product, or savings target, then track progress by allocation.</p>
      </section>

      <section className="savings-main-grid">
        <section className="savings-center-column">
          <GoalsManager />

          <section className="goal-grid" aria-label="Current goals">
            {userGoals.map((goal) => <GoalCard key={goal.title} {...goal} />)}
          </section>
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
