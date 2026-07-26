'use client';

import { useEffect, useMemo, useState } from 'react';

import { createBudgetAllocation, getBudgetPlans, type BudgetPlan } from '../../../lib/wallet-auth-api';
import { minorToDecimal } from '../_components/MoneyFormat';

export function GoalsManager() {
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [category, setCategory] = useState('New goal');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'PHP' | 'USD' | 'XLM' | 'USDC'>('PHP');
  const [status, setStatus] = useState('Loading goals...');

  useEffect(() => {
    void refreshGoals();
  }, []);

  const goals = useMemo(() => plans.flatMap((plan) => plan.categories.map((goal) => ({ ...goal, month: plan.month }))), [plans]);

  async function refreshGoals() {
    try {
      const result = await getBudgetPlans();
      setPlans(result.plans);
      setStatus(result.plans.length ? 'Goals synced.' : 'No goals yet.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to load goals.');
    }
  }

  async function addGoal() {
    setStatus('Saving goal...');
    try {
      const result = await createBudgetAllocation({ category, amount, currency });
      setPlans((current) => [result.plan, ...current.filter((plan) => plan.id !== result.plan.id)]);
      setAmount('');
      setStatus('Goal saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save goal.');
    }
  }

  return (
    <article className="live-manager-card">
      <div className="live-manager-heading">
        <div>
          <span>Live goal builder</span>
          <strong>Add a bill, item, or target</strong>
        </div>
        <em>{status}</em>
      </div>

      <form className="manager-form">
        <label>Goal name<input value={category} onChange={(event) => setCategory(event.target.value)} /></label>
        <label>Money now<input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="500.00" /></label>
        <label>
          Currency
          <select value={currency} onChange={(event) => setCurrency(event.target.value as typeof currency)}>
            <option value="PHP">PHP</option>
            <option value="USD">USD</option>
            <option value="XLM">XLM</option>
            <option value="USDC">USDC</option>
          </select>
        </label>
        <button type="button" onClick={addGoal}>Add goal</button>
      </form>

      <div className="manager-table" aria-label="Saved goals">
        {goals.map((goal) => (
          <div key={goal.id}>
            <span>{goal.name}</span>
            <strong>{goal.currency} {minorToDecimal(goal.amountMinor)}</strong>
            <small>{goal.month}</small>
          </div>
        ))}
      </div>
    </article>
  );
}
