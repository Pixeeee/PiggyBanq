import { DashboardShell, getDashboardSnapshot, Icon } from '../_components/DashboardShell';
import { SectionHeading } from '../_components/SavingsCards';
import { earningAprMethods, earningPockets } from '../_data/savings-dashboard';
import { requireWalletSession } from '../_lib/session';
import { PocketsManager } from './PocketsManager';
import { RailOperations } from './RailOperations';

export default async function PocketsPage() {
  const authUser = await requireWalletSession();
  const snapshot = await getDashboardSnapshot(authUser);

  return (
    <DashboardShell active="pockets" snapshot={snapshot}>
      <section className="savings-page-title rail-page-title">
        <span>Move & forecast</span>
        <h1>Live Stellar swaps. Honest savings forecasts.</h1>
        <p>Swap XLM and official Testnet USDC with local signing, or explore a clearly labeled Yield Lab simulation. Fiat selling remains unavailable.</p>
      </section>
      <RailOperations username={authUser.username ?? ''} publicKey={authUser.stellarPublicKey ?? ''} isDemo={authUser.id === 'local-demo-user'}>
        <div className="stake-tab-content">
          <section className="stake-summary-grid">
            {earningPockets.map((pocket) => <article key={pocket.asset} className="pocket-card stake-summary-card"><div className="pocket-token">{pocket.asset}</div><div><span>{pocket.yieldType}</span><strong>{pocket.allocated}</strong><small>{pocket.converted}</small></div><em>{pocket.status}</em></article>)}
          </section>
          <section className="savings-chart-card" aria-label="Common ways to earn APR">
            <SectionHeading eyebrow="APR education" title="Choose a sourced strategy with the right risk profile" />
            <div className="apr-method-grid">{earningAprMethods.map((method) => <article key={method.title} className="apr-method-card"><span>{method.status}</span><strong>{method.title}</strong><p>{method.summary}</p><small>{method.detail}</small></article>)}</div>
            <p className="apr-guardrail-note">Simulation only — no funds deposited. APR is not guaranteed and no live yield protocol is connected.</p>
          </section>
          <PocketsManager />
          <section className="stake-safety-grid"><article className="savings-chart-card"><SectionHeading eyebrow="Yield Lab" title="Forecast flow" /><div className="conversion-steps"><span>Choose asset</span><span>Set horizon</span><span>Preview APR</span><span>Save forecast</span></div></article><article className="savings-security-card"><Icon name="shield" /><div><span>Simulation boundary</span><strong>Forecasts do not sign transactions, move funds, or promise returns. Live wallet actions always use a separate review.</strong></div></article></section>
        </div>
      </RailOperations>
    </DashboardShell>
  );
}
