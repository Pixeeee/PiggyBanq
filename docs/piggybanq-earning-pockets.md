# PiggyBanq Earning Pockets

PiggyBanq Earning Pockets are a Stellar testnet-first savings feature inside the existing Pockets dashboard. They let users create flexible XLM/USDT savings pockets or locked demo earning pockets with an estimated maturity value.

## Scope

- Supported assets: XLM and USDT.
- Network posture: Stellar testnet only.
- Yield posture: demo estimate only, not real passive income.
- Custody posture: self-custodial; the backend must not store wallet secret keys.
- Transaction posture: no silent signing; future Stellar transactions must show amount, asset, destination, and fee before signing.

## Locked Earning Formula

```text
estimated_interest = principal * apy_bps * lock_days / (10000 * 365)
```

The implementation uses integer minor-unit math to avoid floating point errors in money values.

## Ledger Rules

Pocket balances are calculated from append-only ledger events. The backend does not maintain an editable balance field.

Credit events:
- `POCKET_CREDIT`
- `DEPOSIT_CONFIRMED`
- `YIELD_ACCRUED`

Debit events:
- `POCKET_DEBIT`
- `WITHDRAWAL_CONFIRMED`

Metadata/history events:
- `POCKET_CREATED`
- `DEPOSIT_PLANNED`
- `LOCK_STARTED`
- `WITHDRAWAL_PLANNED`

## User Flow

1. User chooses XLM or USDT.
2. User chooses flexible savings or locked earn.
3. For locked earn, user enters amount, lock duration, and APY bps.
4. UI previews estimated yield, PHP estimate, and maturity date.
5. User confirms the testnet/demo disclaimer.
6. Backend creates the pocket and ledger events.
7. Withdrawal is blocked until the maturity date.
8. After maturity, the backend records demo yield and withdrawal events.

## Safety Notes

This implementation is database-backed and demo-only. If real Stellar testnet transfers are wired later, PiggyBanq must validate addresses, check USDT trustlines, require wallet confirmation, submit through the correct Stellar service, and treat `PENDING` as incomplete until polling reaches success or timeout.
