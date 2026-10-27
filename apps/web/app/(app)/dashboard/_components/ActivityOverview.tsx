import { summarizeDashboardActivity, type DashboardActivity } from '@piggybanq/stellar-core/dashboard-activity';
import { formatLedgerUnits } from './ledger-format';
import { Icon } from './DashboardShell';

export function ActivityOverview({ activity, asset, ready, hidden = false }: { activity: DashboardActivity[]; asset: 'XLM' | 'USDC'; ready: boolean; hidden?: boolean }) {
  const sample = summarizeDashboardActivity(activity, asset);
  const path = (key: 'received' | 'sent') => sample.points.map((point, index) => `${index ? 'L' : 'M'}${12 + index / Math.max(1, sample.points.length - 1) * 336},${132 - point[key] * 1.08}`).join(' ');
  return <section className="clean-flow-card" aria-labelledby="money-flow-title">
    <header><div><span className="clean-eyebrow">THE BIGGER PICTURE</span><h2 id="money-flow-title">Money flow</h2></div><span className="clean-asset-chip">{asset} <Icon name="swap" /></span></header>
    <div className="clean-flow-totals"><div><span><i />Received</span><strong>{hidden ? '••••' : ready ? formatLedgerUnits(sample.received) : '—'}</strong></div><div><span><i />Sent</span><strong>{hidden ? '••••' : ready ? formatLedgerUnits(sample.sent) : '—'}</strong></div></div>
    {ready && sample.count && !hidden ? <svg className="clean-flow-chart" viewBox="0 0 360 150" role="img" aria-label={`Cumulative received and sent ${asset} in loaded payments, oldest to newest`}>
      {[24, 60, 96, 132].map(y => <path key={y} d={`M12 ${y} H348`} stroke="var(--dash-border)" strokeDasharray="3 5" />)}
      <path d={`${path('received')} L348 140 L12 140 Z`} fill="var(--banking-soft)" />
      <path d={path('received')} fill="none" stroke="var(--dash-action)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d={path('sent')} fill="none" stroke="var(--dash-secondary)" strokeWidth="2" strokeDasharray="5 5" />
    </svg> : <div className="clean-flow-empty"><Icon name="move" /><strong>{hidden ? 'Activity hidden' : ready ? 'A fresh start for your money' : 'Connecting to your ledger'}</strong><p>{hidden ? 'Show balances to view your activity.' : 'Confirmed payments will bring this chart to life.'}</p></div>}
    <footer><span>{ready ? `${sample.count} confirmed ${asset} payments` : 'Ledger data pending'}</span><span>Loaded activity only</span></footer>
  </section>;
}
