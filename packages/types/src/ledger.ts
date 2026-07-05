export interface SavingsPocket {
  id: string;
  label: string;
  assetCode: string;
  balance: string;
}

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

