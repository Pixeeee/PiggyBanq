export type StellarAmountOptions = {
  decimals?: number;
  allowZero?: boolean;
  maxUnits?: bigint;
};

export function parseStellarAmount(value: string, options: StellarAmountOptions | number = {}): bigint {
  const normalized = typeof options === 'number' ? { decimals: options } : options;
  const decimals = normalized.decimals ?? 7;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error('Invalid amount precision.');
  const expression = decimals === 0
    ? /^(0|[1-9]\d*)$/
    : new RegExp(`^(0|[1-9]\\d*)(?:\\.(\\d{1,${decimals}}))?$`);
  const match = value.match(expression);
  if (!match) throw new Error(`Enter a valid amount with up to ${decimals} decimals.`);

  const scale = 10n ** BigInt(decimals);
  const fraction = (match[2] ?? '').padEnd(decimals, '0');
  const units = BigInt(match[1]) * scale + BigInt(fraction || '0');
  if (!normalized.allowZero && units === 0n) throw new Error('Amount must be greater than zero.');
  if (normalized.maxUnits !== undefined && units > normalized.maxUnits) throw new Error('Amount exceeds the configured maximum.');
  return units;
}

export function formatStellarAmount(units: bigint, decimals = 7): string {
  if (units < 0n) throw new Error('Amount units must be non-negative.');
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error('Invalid amount precision.');
  if (decimals === 0) return units.toString();
  const scale = 10n ** BigInt(decimals);
  return `${units / scale}.${(units % scale).toString().padStart(decimals, '0')}`;
}
