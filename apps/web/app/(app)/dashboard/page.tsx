import { KYC_FREE_LIMIT_PHP } from '@piggybanq/types/kyc';

import { AllocationCard, GoalCard, SectionHeading } from './_components/SavingsCards';
import { DashboardShell, getDashboardSnapshot, Icon } from './_components/DashboardShell';
import { allocationCategories, earningPockets, stellarRails, userGoals, weeklySavings } from './_data/savings-dashboard';
import { requireWalletSession } from './_lib/session';
import { OverviewManager } from './OverviewManager';

export default async function DashboardPage() {
  const authUser = await requireWalletSession();
  const snapshot = await getDashboardSnapshot(authUser);

  return (
    <DashboardShell active="overview" snapshot={snapshot}>
      <section className="savings-hero-row">
        <div>
          <p className="savings-kicker">Hey {authUser.displayName},</p>
          <h1>Your savings workspace is organized for this month.</h1>
          <p>
            Overview collects allocations, earning pockets, and goals in one place. Profile settings stay separate.
          </p>
        </div>
        <article className="savings-limit-card">
          <span>KYC-free monthly rail</span>
          <strong>PHP {KYC_FREE_LIMIT_PHP.toLocaleString()}</strong>
          <small>Testnet mode. No custody, no hidden signing.</small>
        </article>
      </section>

      <section className="savings-main-grid">
        <section className="savings-center-column">
          <article className="savings-chart-card">
            <SectionHeading eyebrow="Overview" title="Savings momentum" action="Monthly" />
            <div className="savings-chart" aria-label="Weekly savings chart">
              {weeklySavings.map((week) => (
                <div key={week.label} className="savings-chart-bar">
                  <span style={{ height: `${week.height}%` }} title={week.amount} />
                  <small>{week.label}</small>
                </div>
              ))}
            </div>
          </article>

          <section className="allocation-grid" aria-label="Money allocation summary">
            {allocationCategories.map((category) => (
              <AllocationCard key={category.label} {...category} />
            ))}
          </section>

          <OverviewManager />
        </section>

        <aside className="savings-right-rail" aria-label="Overview details">
          <article className="wallet-mini-card">
            <span>Pockets</span>
            <strong>{earningPockets.length} earning pockets</strong>
            <small>XLM and USDT first, with anchor conversion estimates.</small>
          </article>
          <article className="savings-focus-card">
            <SectionHeading eyebrow="Goals" title="Active budgets" />
            <ul>
              {userGoals.map((goal) => (
                <li key={goal.title}>
                  <span />
                  <div>
                    <strong>{goal.title}</strong>
                    <small>{goal.saved} saved</small>
                  </div>
                  <em>{goal.percent}%</em>
                </li>
              ))}
            </ul>
          </article>
          <article className="savings-security-card">
            <Icon name="shield" />
            <div>
              <span>Self-custodial safety</span>
              <strong>No silent signing. Confirm amount, asset, destination, and fee before every transaction.</strong>
            </div>
          </article>
        </aside>
      </section>

      <section className="savings-bottom-strip" aria-label="Savings rails">
        {stellarRails.map((rail) => <span key={rail}>{rail}</span>)}
      </section>
    </DashboardShell>
  );
}
