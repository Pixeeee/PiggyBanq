export interface SavingsPocket {
  id: string;
  label: string;
  assetCode: string;
  balance: string;
}

export type EarningPocketStatus = 'active' | 'locked' | 'matured' | 'withdrawn';

export interface PocketLedgerEvent {
  pocketId: string;
  amount: string;
  direction: 'credit' | 'debit';
  createdAt: string;
}

export function createSavingsPocket(input: {
  id: string;
  label: string;
  assetCode: string;
}): SavingsPocket {
  if (!input.id.trim()) {
    throw new Error('pocket id is required');
  }

  if (!input.label.trim()) {
    throw new Error('pocket label is required');
  }

  return {
    id: input.id,
    label: input.label.trim(),
    assetCode: input.assetCode.trim().toUpperCase(),
    balance: '0.00'
  };
}

export function createPocketLedgerEvent(input: {
  pocketId: string;
  amount: string;
  direction: 'credit' | 'debit';
}): PocketLedgerEvent {
  const cents = parseMoneyToCents(input.amount);
  if (cents <= 0n) {
    throw new Error('ledger event amount must be positive');
  }

  return {
    pocketId: input.pocketId,
    amount: formatCents(cents),
    direction: input.direction,
    createdAt: new Date(0).toISOString()
  };
}

export function applyLedgerEvents(
  pocket: SavingsPocket,
  events: PocketLedgerEvent[]
): SavingsPocket {
  const balance = events
    .filter((event) => event.pocketId === pocket.id)
    .reduce((sum, event) => {
      const cents = parseMoneyToCents(event.amount);
      return event.direction === 'credit' ? sum + cents : sum - cents;
    }, parseMoneyToCents(pocket.balance));

  if (balance < 0n) {
    throw new Error('savings pocket balance cannot go negative');
  }

  return {
    ...pocket,
    balance: formatCents(balance)
  };
}

export function calculateLockedEarningPreview(input: {
  principalMinor: string | bigint;
  apyBps: number;
  lockDays: number;
}) {
  const principalMinor = typeof input.principalMinor === 'bigint' ? input.principalMinor : BigInt(input.principalMinor);
  if (principalMinor <= 0n) {
    throw new Error('locked earning principal must be positive');
  }
  if (!Number.isInteger(input.apyBps) || input.apyBps < 0) {
    throw new Error('apy bps must be a positive integer');
  }
  if (![7, 30, 90].includes(input.lockDays)) {
    throw new Error('lock duration must be 7, 30, or 90 days');
  }

  const estimatedInterestMinor =
    (principalMinor * BigInt(input.apyBps) * BigInt(input.lockDays)) / (BigInt(10000) * BigInt(365));

  return {
    principalMinor: principalMinor.toString(),
    estimatedInterestMinor: estimatedInterestMinor.toString(),
    totalAtMaturityMinor: (principalMinor + estimatedInterestMinor).toString()
  };
}

export function getLockedPocketStatus(input: {
  status: string;
  maturesAt?: string | Date | null;
  withdrawnAt?: string | Date | null;
  now?: Date;
}): EarningPocketStatus {
  if (input.withdrawnAt || input.status.toLowerCase() === 'withdrawn') {
    return 'withdrawn';
  }

  const status = input.status.toLowerCase();
  if (status === 'active') {
    return 'active';
  }

  const now = input.now ?? new Date();
  const maturesAt = input.maturesAt ? new Date(input.maturesAt) : null;
  if (maturesAt && maturesAt <= now) {
    return 'matured';
  }

  return status === 'matured' ? 'matured' : 'locked';
}

export function canWithdrawLockedPocket(input: {
  status: string;
  maturesAt?: string | Date | null;
  withdrawnAt?: string | Date | null;
  now?: Date;
}) {
  return getLockedPocketStatus(input) === 'matured';
}

function parseMoneyToCents(amount: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    throw new Error(`invalid money amount: ${amount}`);
  }

  const [whole, fraction = ''] = amount.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function formatCents(cents: bigint): string {
  const whole = cents / 100n;
  const fraction = cents % 100n;
  return `${whole}.${fraction.toString().padStart(2, '0')}`;
}
