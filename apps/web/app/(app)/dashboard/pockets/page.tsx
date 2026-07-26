import { DashboardShell, getDashboardSnapshot, Icon } from '../_components/DashboardShell';
import { SectionHeading } from '../_components/SavingsCards';
import { earningPockets } from '../_data/savings-dashboard';
import { requireWalletSession } from '../_lib/session';
import { PocketsManager } from './PocketsManager';

export default async function PocketsPage() {
  const authUser = await requireWalletSession();
  const snapshot = await getDashboardSnapshot(authUser);

  return (
    <DashboardShell active="pockets" snapshot={snapshot}>
      <section className="savings-page-title">
        <span>Pockets</span>
        <h1>Allocate XLM and USDT into earning pockets.</h1>
        <p>Users can view token allocations, PHP estimates, and later choose their preferred display currency.</p>
      </section>

      <section className="pocket-grid">
        {earningPockets.map((pocket) => (
          <article key={pocket.asset} className="pocket-card">
            <div className="pocket-token">{pocket.asset}</div>
            <div>
              <span>{pocket.yieldType}</span>
              <strong>{pocket.allocated}</strong>
              <small>{pocket.converted}</small>
            </div>
            <em>{pocket.status}</em>
          </article>
        ))}
      </section>

      <PocketsManager />

      <section className="savings-main-grid">
        <article className="savings-chart-card">
          <SectionHeading eyebrow="Yield setup" title="Anchor conversion path" />
          <div className="conversion-steps">
            <span>Choose asset</span>
            <span>Check trustline</span>
            <span>Convert display currency</span>
            <span>Confirm yield allocation</span>
          </div>
        </article>

        <article className="savings-security-card">
          <Icon name="shield" />
          <div>
            <span>Transaction safety</span>
            <strong>Yield actions stay disabled until the user confirms amount, asset, destination, and fee.</strong>
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
