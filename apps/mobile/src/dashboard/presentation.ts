import { parseStellarAmount, formatStellarAmount } from '@piggybanq/stellar-core/amounts';

export function formatLedgerBalance(value?: string): string {
  if (!value || !/^\d+(?:\.\d{1,7})?$/.test(value)) return '—';
  const [whole, fraction = ''] = value.split('.');
  const decimals = fraction.replace(/0+$/, '').padEnd(2, '0');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimals}`;
}

export function getGoalProgress(goal: { target: string; saved: string }) {
  const target = parseStellarAmount(goal.target, { decimals: 2 });
  const saved = parseStellarAmount(goal.saved, { decimals: 2, allowZero: true });
  return {
    percent: Number((saved >= target ? 10000n : saved * 10000n / target)) / 100,
    remaining: formatStellarAmount(saved >= target ? 0n : target - saved, 2)
  };
}
