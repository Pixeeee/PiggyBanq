'use client';

import { useEffect, useMemo, useState } from 'react';

import { getBudgetPlans, getSavingsPockets, type BudgetPlan, type SavingsPocket } from '../../lib/wallet-auth-api';
import { minorToDecimal, minorToNumber } from './_components/MoneyFormat';

export function OverviewManager() {
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [pockets, setPockets] = useState<SavingsPocket[]>([]);
  const [status, setStatus] = useState('Syncing savings data...');

  useEffect(() => {
    async function loadOverview() {
      try {
        const [budgetResult, pocketResult] = await Promise.all([getBudgetPlans(), getSavingsPockets()]);
        setPlans(budgetResult.plans);
        setPockets(pocketResult.pockets);
        setStatus('Overview synced.');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Failed to sync overview.');
      }
    }

    void loadOverview();
  }, []);

  const allocations = useMemo(() => plans.flatMap((plan) => plan.categories.map((category) => ({ ...category, month: plan.month }))), [plans]);
  const totalPhpMinor = allocations
    .filter((allocation) => allocation.currency === 'PHP')
    .reduce((total, allocation) => total + BigInt(allocation.amountMinor), BigInt(0));
  const totalTokenEstimate = pockets.reduce((total, pocket) => {
    const rate = pocket.assetCode === 'XLM' ? 7.7 : 57.5;
    return total + minorToNumber(pocket.balanceMinor) * rate;
  }, 0);
  const activeLockedPockets = pockets.filter((pocket) => pocket.pocketType === 'LOCKED_EARN' && pocket.status !== 'withdrawn');
  const estimatedEarningsMinor = pockets.reduce(
    (total, pocket) => total + BigInt(pocket.estimatedInterestMinor ?? '0'),
    BigInt(0)
  );

  return (
    <article className="live-manager-card overview-manager">
      <div className="live-manager-heading">
        <div>
          <span>Live overview</span>
          <strong>Saved allocations, pockets, and goals</strong>
        </div>
        <em>{status}</em>
      </div>

      <div className="overview-live-grid">
        <section>
          <span>PHP planned</span>
          <strong>PHP {minorToDecimal(totalPhpMinor.toString())}</strong>
          <small>{allocations.length} allocation and goal records</small>
        </section>
        <section>
          <span>Token pockets</span>
          <strong>PHP {totalTokenEstimate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
          <small>{pockets.length} XLM/USDT pockets</small>
        </section>
        <section>
          <span>Locked earning pockets</span>
          <strong>{activeLockedPockets.length} active</strong>
          <small>{minorToDecimal(estimatedEarningsMinor.toString())} estimated testnet yield</small>
        </section>
      </div>

      <div className="manager-table" aria-label="Overview records">
        {allocations.slice(0, 4).map((allocation) => (
          <div key={allocation.id}>
            <span>{allocation.name}</span>
            <strong>{allocation.currency} {minorToDecimal(allocation.amountMinor)}</strong>
            <small>{allocation.month}</small>
          </div>
        ))}
        {pockets.slice(0, 4).map((pocket) => (
          <div key={pocket.id}>
            <span>{pocket.label}</span>
            <strong>{minorToDecimal(pocket.balanceMinor)} {pocket.assetCode}</strong>
            <small>{pocket.pocketType === 'LOCKED_EARN' ? `${pocket.status} · testnet yield` : 'flexible pocket'}</small>
          </div>
        ))}
      </div>
    </article>
  );
}
