export function minorToDecimal(value: string | null | undefined) {
  const numeric = BigInt(value ?? '0');
  const zero = BigInt(0);
  const hundred = BigInt(100);
  const sign = numeric < zero ? '-' : '';
  const absolute = numeric < zero ? -numeric : numeric;
  const whole = absolute / hundred;
  const cents = String(absolute % hundred).padStart(2, '0');
  return `${sign}${whole.toLocaleString()}.${cents}`;
}

export function minorToNumber(value: string | null | undefined) {
  return Number(value ?? '0') / 100;
}
