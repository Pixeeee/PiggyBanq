'use client';

import { useEffect, useMemo, useState } from 'react';

import { createBudgetAllocation, getBudgetPlans, type BudgetPlan } from '../../../lib/wallet-auth-api';
import { minorToDecimal } from '../_components/MoneyFormat';

type Currency = 'PHP' | 'USD' | 'XLM' | 'USDC';

export function AllocationsManager() {
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [category, setCategory] = useState('Food');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('PHP');
  const [status, setStatus] = useState('Loading allocations...');

  useEffect(() => {
    void refreshPlans();
  }, []);

  const rows = useMemo(() => plans.flatMap((plan) => plan.categories.map((item) => ({ ...item, month: plan.month }))), [plans]);

  async function refreshPlans() {
    try {
      const result = await getBudgetPlans();
      setPlans(result.plans);
      setStatus(result.plans.length ? 'Allocations synced.' : 'No allocations yet.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to load allocations.');
    }
  }

  async function addAllocation() {
    setStatus('Saving allocation...');
    try {
      const result = await createBudgetAllocation({ category, amount, currency });
      setPlans((current) => [result.plan, ...current.filter((plan) => plan.id !== result.plan.id)]);
      setAmount('');
      setStatus('Allocation saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save allocation.');
    }
  }

  return (
    <article className="live-manager-card">
      <div className="live-manager-heading">
        <div>
          <span>Live allocation form</span>
          <strong>Add daily inflow or outflow reserve</strong>
        </div>
        <em>{status}</em>
      </div>

      <form className="manager-form">
        <label>Type<input value={category} onChange={(event) => setCategory(event.target.value)} /></label>
        <label>Amount<input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="1500.00" /></label>
        <label>
          Asset
          <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>
            <option value="PHP">PHP</option>
            <option value="USD">USD</option>
            <option value="XLM">XLM</option>
            <option value="USDC">USDC</option>
          </select>
        </label>
        <button type="button" onClick={addAllocation}>Save allocation</button>
      </form>

      <div className="manager-table" aria-label="Saved allocations">
        {rows.map((row) => (
          <div key={row.id}>
            <span>{row.name}</span>
            <strong>{row.currency} {minorToDecimal(row.amountMinor)}</strong>
            <small>{row.month}</small>
          </div>
        ))}
      </div>
    </article>
  );
}
