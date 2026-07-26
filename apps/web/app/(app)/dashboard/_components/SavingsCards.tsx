import { Icon } from './DashboardShell';

export function SectionHeading({
  eyebrow,
  title,
  action
}: {
  eyebrow: string;
  title: string;
  action?: string;
}) {
  return (
    <div className="savings-section-heading">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action ? <button type="button">{action} <Icon name="chevron" /></button> : null}
    </div>
  );
}

export function AllocationCard({ label, amount, percent, tone }: { label: string; amount: string; percent: number; tone: string }) {
  return (
    <article className={`allocation-card is-${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{amount}</strong>
      </div>
      <div className="allocation-meter" aria-label={`${percent}% allocated`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <small>{percent}% of planned monthly allocation</small>
    </article>
  );
}

export function GoalCard({ title, saved, target, percent }: { title: string; saved: string; target: string; percent: number }) {
  return (
    <article className="goal-card">
      <div>
        <span>{title}</span>
        <strong>{saved}</strong>
      </div>
      <small>Target {target}</small>
      <div className="allocation-meter" aria-label={`${percent}% funded`}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </article>
  );
}
