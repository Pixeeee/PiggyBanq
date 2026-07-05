# PiggyBanq AI Guardrails

This project handles real user funds in a self-custodial model. Do not expand custody, regulatory posture, or explicit non-goals without user approval.

## Stellar-Specific Gotchas

1. Use the `rpc` namespace from `@stellar/stellar-sdk` v14. Never use the deprecated `SorobanRpc` namespace.
2. Always simulate Soroban transactions before sending (when Soroban contracts are introduced).
3. `sendTransaction` returning `PENDING` is NOT success - always poll `getTransaction` until `SUCCESS` or timeout.
4. Poll pattern: every 1s, up to 60s, before declaring failure.
5. Always use `Networks.TESTNET` or `Networks.PUBLIC` - never a hardcoded passphrase string.
6. Trustlines required before receiving any non-native asset - check and prompt trustline creation in "Add Money" flow before anchor handoff.
7. Use Horizon for balance/history reads; Soroban RPC only for contract calls.
8. Validate every destination address (G... format, checksum) client-side before building a transaction.
9. Show the user a clear confirmation screen (amount, asset, destination, fee) before every signature prompt - no silent signing.

