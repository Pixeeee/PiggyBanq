'use client';

import { useEffect, useState } from 'react';
import { getBudgetPlans, type BudgetPlan } from '../../../lib/wallet-auth-api';
import { minorToDecimal } from './MoneyFormat';
import { Icon } from './DashboardShell';

export function PlanningPreview({ isDemo }: { isDemo: boolean }) {
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    if (isDemo) { setStatus('ready'); return; }
    void getBudgetPlans().then(result => { if (mounted) { setPlans(result.plans); setStatus('ready'); } }).catch(cause => {
      if (mounted) { setStatus('error'); setError(cause instanceof Error ? cause.message : 'Your saved plans could not be loaded.'); }
    });
    return () => { mounted = false; };
  }, [isDemo]);
  const entries = plans.flatMap(plan => plan.categories.map(item => ({ ...item, month: plan.month })));
  return <section className="banking-plans" aria-labelledby="planning-title">
    <header className="banking-section-heading"><h2 id="planning-title">Your savings plans</h2><a href="/dashboard/goals">See all</a></header>
    {status === 'loading' ? <p role="status">Loading your saved plans…</p> : status === 'error' ? <p role="alert">{error} <a href="/dashboard/goals">Open plans</a></p> : entries.length ? <div className="banking-plan-grid">
      {entries.slice(0, 3).map(item => <a className="banking-plan-card" key={item.id} href="/dashboard/goals"><span><Icon name="target" /><strong>{item.name}</strong></span><b>{item.currency} {minorToDecimal(item.amountMinor)}</b><small>Planned amount · {item.month}</small></a>)}
    </div> : <div className="banking-empty-plan"><Icon name="target" /><div><strong>Your next big thing starts with a small plan.</strong><p>Set aside space for a rainy day, a trip, or something you love.</p></div><a href="/dashboard/goals">Create a savings plan <Icon name="plus" /></a></div>}
    <small className="banking-plan-note">Planning records · Saving a plan does not move wallet funds</small>
  </section>;
}
