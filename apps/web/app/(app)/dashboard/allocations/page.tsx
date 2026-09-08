import { DashboardShell, getDashboardSnapshot } from '../_components/DashboardShell';
import { AllocationCard, SectionHeading } from '../_components/SavingsCards';
import { allocationCategories, dailyAssetFlows, dailyFlowBars } from '../_data/savings-dashboard';
import { requireWalletSession } from '../_lib/session';
import { AllocationsManager } from './AllocationsManager';
import { UiBadge, UiCard, UiProgress } from '../../../components/ui/DashboardPrimitives';

export default async function AllocationsPage() {
  const authUser = await requireWalletSession();
  const snapshot = await getDashboardSnapshot(authUser);

  return (
    <DashboardShell active="allocations" snapshot={snapshot}>
      <section className="savings-page-title allocation-page-title">
        <UiBadge tone="rose">Permissioned planning</UiBadge>
        <span>Allocations</span>
        <h1>Give every peso and token a purpose.</h1>
        <p>Shape spending reserves, Stellar savings, and the Binance payment allowance without mixing custody or provider responsibilities.</p>
      </section>

      <section className="allocation-overview-grid" aria-label="Allocation overview">
        <UiCard><span>Stellar savings target</span><strong>42%</strong><UiProgress value={42} label="Current plan" /></UiCard>
        <UiCard><span>Agentic payment cap</span><strong>20 USDC</strong><small>Per approved x402 sandbox intent</small></UiCard>
        <UiCard><span>Bridge policy</span><strong>USDC → Base</strong><small>CCTP testnet route only</small></UiCard>
      </section>

      <section className="savings-main-grid">
        <section className="savings-center-column">
          <article className="savings-chart-card">
            <SectionHeading eyebrow="Today" title="Asset movement" action="Daily" />
            <div className="flow-chart" aria-label="Daily inflow and outflow chart">
              {dailyFlowBars.map((bar) => (
                <div key={bar.day} className="flow-chart-day">
                  <div>
                    <span className="is-inflow" style={{ height: `${bar.inHeight}%` }} />
                    <span className="is-outflow" style={{ height: `${bar.outHeight}%` }} />
                  </div>
                  <small>{bar.day}</small>
                </div>
              ))}
            </div>
          </article>

          <section className="allocation-grid" aria-label="Allocation categories">
            {allocationCategories.map((category) => (
              <AllocationCard key={category.label} {...category} />
            ))}
          </section>

          <AllocationsManager />
        </section>

        <aside className="asset-flow-list" aria-label="Daily asset ledger">
          {dailyAssetFlows.map((flow) => (
            <article key={flow.asset}>
              <span>{flow.asset}</span>
              <strong>{flow.net}</strong>
              <dl>
                <div><dt>Inflow</dt><dd>{flow.inflow}</dd></div>
                <div><dt>Outflow</dt><dd>{flow.outflow}</dd></div>
                <div><dt>Mapped to</dt><dd>{flow.category}</dd></div>
              </dl>
            </article>
          ))}
        </aside>
      </section>
    </DashboardShell>
  );
}
