import { DashboardShell, getDashboardSnapshot, Icon } from '../_components/DashboardShell';
import { SectionHeading } from '../_components/SavingsCards';
import { earningAprMethods, earningPockets } from '../_data/savings-dashboard';
import { requireWalletSession } from '../_lib/session';
import { PocketsManager } from './PocketsManager';

export default async function PocketsPage() {
  const authUser = await requireWalletSession();
  const snapshot = await getDashboardSnapshot(authUser);

  return (
    <DashboardShell active="pockets" snapshot={snapshot}>
      <section className="savings-page-title">
        <span>Stake</span>
        <h1>Earn APR with testnet staking positions.</h1>
        <p>Review XLM and USDT earning options, preview estimated APR, and confirm the risk details before creating a position.</p>
      </section>

      <section className="stake-summary-grid">
        {earningPockets.map((pocket) => (
          <article key={pocket.asset} className="pocket-card stake-summary-card">
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

      <section className="savings-chart-card" aria-label="Common ways to earn APR">
        <SectionHeading eyebrow="APR education" title="Choose a staking method with the right risk profile" />
        <div className="apr-method-grid">
          {earningAprMethods.map((method) => (
            <article key={method.title} className="apr-method-card">
              <span>{method.status}</span>
              <strong>{method.title}</strong>
              <p>{method.summary}</p>
              <small>{method.detail}</small>
            </article>
          ))}
        </div>
        <p className="apr-guardrail-note">
          APR is not guaranteed. Keep keys self-custodial and review risk, trustlines, amount, asset, destination, and fee before signing anything.
        </p>
      </section>

      <PocketsManager />

      <section className="stake-safety-grid">
        <article className="savings-chart-card">
          <SectionHeading eyebrow="Stake setup" title="Confirmation flow" />
          <div className="conversion-steps">
            <span>Choose asset</span>
            <span>Check trustline</span>
            <span>Preview APR</span>
            <span>Confirm stake position</span>
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
