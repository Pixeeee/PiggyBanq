# PiggyBanq Savings Rebuild Stellar Spec

## Scope

This spec defines the Stellar-specific rules for the savings-only PiggyBanq rebuild.

## Network

V1 runs on Stellar testnet only.

Required constants:

- network: testnet
- passphrase: Stellar testnet passphrase through SDK constants, not hardcoded custom strings
- funding path for development: Friendbot or equivalent controlled testnet setup

## Supported Savings Assets

V1 product approval covers:

- `XLM`
- `USDT`

These labels are product-facing only. Implementation must pin exact technical definitions:

- `XLM`: Stellar native asset
- `USDT`: one exact configured testnet asset definition or token route

If no valid and stable testnet route exists for the configured `USDT` savings strategy, the app must disable that asset instead of faking support.

## Wallet Model

- wallets are created client-side
- signing happens client-side
- public address only may be sent to the backend

## Savings Strategy Model

PiggyBanq must wrap each savings route in a strategy adapter with these operations:

- read availability
- validate prerequisites
- prepare deposit transaction
- prepare withdraw transaction
- read position state
- read yield state

## Trustlines and Asset Preconditions

For `USDT`, the app must verify that any required trustline or equivalent asset prerequisite exists before deposit or receipt. The UI must explain why the action is blocked when prerequisites are missing.

## Transaction Lifecycle

For savings actions:

1. validate input locally
2. fetch or build a prepared transaction payload
3. present confirmation
4. sign locally
5. submit to Stellar
6. poll or confirm completion before final success UI

The UI must not mark success immediately after submission if chain confirmation is still pending.

## Allowlist Policy

The Stellar integration must reject:

- arbitrary contract addresses
- arbitrary issuers
- arbitrary pools
- arbitrary route identifiers
- non-testnet network targets

## Position Source of Truth

Balances and positions should be read from Stellar and the configured strategy route. Database mirrors are caches, not authoritative state.

## Testnet Caveat

Because Stellar testnet resets periodically, PiggyBanq must assume testnet data can disappear. The rebuild should be resilient to:

- account re-funding
- trustline recreation
- strategy reconfiguration
- position cache invalidation after reset

## Stellar Testing

Tests should cover:

- address validation
- native vs non-native asset handling
- trustline gating for `USDT`
- allowlist enforcement
- testnet-only configuration
- transaction preparation lifecycle
