import { formatStellarAmount } from '@piggybanq/stellar-core/amounts';

export function formatLedgerUnits(units?: string): string {
  if (units === undefined) return '—';
  const [whole, fraction] = formatStellarAmount(BigInt(units)).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.replace(/0+$/, '').padEnd(2, '0')}`;
}
