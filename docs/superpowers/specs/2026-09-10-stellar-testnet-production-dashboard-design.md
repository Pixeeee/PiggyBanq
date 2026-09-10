# PiggyBanq Stellar Testnet Production Dashboard Design

## Goal

Turn the authenticated PiggyBanq dashboard into a production-quality Stellar Testnet application with live account data, real signed transactions, durable execution state, and honest feature availability. This release remains Testnet-only and does not authorize Mainnet or real customer funds.

## Scope

This release includes:

- Live Stellar Testnet account balances and payment history from Horizon.
- Real XLM payments.
- A dedicated trustline flow for the official Stellar Testnet USDC asset.
- Real USDC payments after trustline validation.
- Live XLM-to-USDC and USDC-to-XLM strict-send path quotes and swaps when Horizon returns a viable path.
- PiggyBanq's existing locally encrypted browser wallet as the signing boundary.
- PostgreSQL-backed intents, idempotency, audit records, execution status, and reconciliation.
- Production security headers, stricter validation, scoped rate limits, and safe error states.
- Dashboard loading, empty, unavailable, pending, failed, unknown, and successful states.
- A renamed `Yield Lab` that remains explicitly simulation-only.

This release excludes:

- Binance MCP, Agentic Wallet, exchange, or x402 calls.
- Circle CCTP burns, attestations, relaying, or destination mints.
- Real yield, staking, lending, vault, or Soroban strategy execution.
- Stellar Mainnet.
- Fiat off-ramp settlement.

Excluded providers remain disabled in capabilities and UI. They must not generate successful-looking mock receipts.

## Product Language

- The network label is always `Stellar Testnet`.
- Static financial values are removed from authenticated non-demo dashboards.
- Demo mode remains separate and unmistakably labeled `Demo data — no funds move`.
- `Stake` becomes `Yield Lab` or `Locked Savings Forecast` until a named, reviewed yield source exists.
- No Stellar feature is described as native staking because Stellar does not provide proof-of-stake rewards.
- A transaction is successful only after authoritative network confirmation.

## Architecture

### Browser wallet boundary

PiggyBanq remains its own self-custodial wallet. The existing encrypted local vault remains the source of the Stellar secret key.

- Encrypted vault material may remain in browser storage.
- Plaintext password, mnemonic, and secret key never enter API requests, logs, analytics, URLs, or persisted application state.
- The secret is decrypted only after an explicit confirmation for a specific XDR.
- Before signing, the browser decodes the XDR and confirms it matches the visible review: network, source, operation type, amount, asset and issuer, destination, path, minimum received, fee, memo, and time bounds.
- The signed XDR may be sent to the PiggyBanq API. It contains a signature, not the secret key.
- The browser releases plaintext key references immediately after signing and returns the UI to a locked state after the configured short inactivity window.

### Server transaction coordinator

The Fastify API owns policy, quote creation, unsigned transaction construction, durable state, idempotent submission, reconciliation, and audit events.

The server never signs for the user. It:

1. Authenticates the wallet session.
2. Validates a discriminated request schema for `PAYMENT`, `CHANGE_TRUST`, or `PATH_PAYMENT_STRICT_SEND`.
3. Reads the source account and required ledger state from Horizon Testnet.
4. Applies allowlists, balance/reserve checks, trustline checks, amount bounds, destination validation, and rate limits.
5. Builds an unsigned, time-bounded XDR using a freshly loaded sequence number and `Networks.TESTNET`.
6. Stores the intent, normalized exact amounts, XDR hash, expiry, policy result, and idempotency key before returning the quote.
7. Accepts only a signed XDR matching the stored unsigned transaction body and expected signer.
8. Atomically claims the intent for execution before submitting it.
9. Stores the transaction hash and submitted XDR before or atomically with the external submission boundary as far as the database/provider protocol allows.
10. Reconciles the hash against Horizon and records a terminal or unresolved state.

### Stellar adapter

A focused Stellar adapter provides:

- Account lookup and existence checks.
- Balance and trustline normalization.
- Paginated payment and operation history.
- Fee-stat retrieval with bounded fallback.
- Strict-send path lookup.
- Payment, change-trust, and strict-send path-payment XDR construction.
- Signed transaction submission.
- Transaction lookup and reconciliation.

Classic account, balance, path, history, and submission operations use Horizon. Soroban RPC is not introduced in this release because no contract operation is in scope.

### Asset registry and exact amounts

The release uses a closed asset registry:

- XLM: native asset, seven decimal places.
- USDC Testnet: code `USDC`, issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, seven decimal places.

User-entered strings are parsed directly to `bigint` stroops or asset subunits. Financial values never pass through JavaScript `Number`. Formatting converts exact integer units back to fixed decimal strings without floating-point rounding.

## Durable Transaction Model

Introduce a transaction intent record with:

- User and wallet ownership.
- Operation type and network.
- Asset code, issuer, exact source amount, exact minimum destination amount, and exact fee.
- Destination, memo, selected path, and normalized policy snapshot.
- Unsigned XDR body hash and signed transaction hash.
- Client idempotency key with a per-user uniqueness constraint.
- Quote creation and expiry timestamps.
- Approval, submission, reconciliation, and terminal timestamps.
- Failure code and sanitized failure detail.
- Status: `QUOTED`, `AWAITING_SIGNATURE`, `EXECUTING`, `SUBMITTED`, `SUCCEEDED`, `FAILED`, `EXPIRED`, `CANCELLED`, or `UNKNOWN`.

State transitions use conditional database updates. Only one request may claim `AWAITING_SIGNATURE` for execution. Retries return the existing intent or receipt instead of submitting a second transaction.

Audit events record quote, approval, signature acceptance, submission, reconciliation, expiry, cancellation, and failure without secrets or raw passwords.

## User Flows

### Account activation

- A valid public key with no Testnet account displays an empty state.
- Friendbot funding is available only in explicit development/Testnet mode and requires confirmation.
- The dashboard refreshes Horizon state after funding and does not claim activation until the account exists.

### Create USDC trustline

1. Read the account and confirm the USDC trustline is absent.
2. Show issuer, limit, reserve implication, fee, network, and time bounds.
3. Build and store an unsigned `changeTrust` XDR.
4. Require password and explicit user confirmation.
5. Decode and verify the XDR locally, sign locally, and submit the signed XDR.
6. Reconcile the transaction and refresh balances.

### Send XLM or USDC

1. Validate the destination using Stellar StrKey checksum validation.
2. Load source and destination accounts.
3. Validate the source spendable balance, native reserve, and required source/destination trustlines.
4. Show amount, asset and issuer, destination, memo, fee, and network.
5. Build, confirm, locally sign, submit once, reconcile, and refresh history.

The application does not silently create recipient accounts or trustlines.

### Swap XLM and USDC

1. Validate source balance and destination trustline.
2. Request live strict-send paths from Horizon.
3. Return no executable quote if no path exists.
4. Show the selected path, exact send amount, expected receive amount, user-configured slippage, minimum received, fee, quote age, and expiry.
5. Build `pathPaymentStrictSend` to the user's own account, decode and verify locally, sign locally, submit once, and reconcile.

Changing amount, asset, path, slippage, account sequence, or an expired quote requires a fresh XDR and a new signature.

## Dashboard Data and States

The dashboard reads normalized API resources rather than static fixtures:

- Wallet summary: account state, XLM balance, USDC balance, reserve/liability information, and last ledger cursor.
- Activity: confirmed payments and swaps with transaction hashes and explorer links.
- Pending operations: durable local intent status plus authoritative Horizon status.
- Capabilities: real `AVAILABLE`, temporarily `UNAVAILABLE`, or intentionally `SIMULATION_ONLY` flags.

Required UI states are loading, first-use/no-account, active with zero balances, missing trustline, no swap path, quote expired, awaiting signature, submitting, submitted/pending reconciliation, succeeded, failed with a safe retry path, offline, provider unavailable, and session expired.

The dashboard never replaces unavailable live data with plausible sample balances outside explicit demo mode.

## Security and Operational Controls

- Strict Content Security Policy with a nonce-compatible theme bootstrap or an externalized script.
- `frame-ancestors 'none'`, restrictive `connect-src`, Referrer-Policy, Permissions-Policy, and content-type protection.
- Explicit Origin/CSRF checks for authenticated mutations.
- Per-IP and per-user limits for authentication, quote, signing submission, Friendbot, and transaction reconciliation endpoints.
- Startup validation for every URL, TTL, amount cap, asset identifier, cookie setting, and network setting.
- Production cookies remain `HttpOnly`, `Secure`, and correctly scoped.
- Sanitized structured logs use request, user, intent, and transaction IDs without wallet secrets or complete signed XDRs.
- A reconciliation worker rechecks `SUBMITTED` and `UNKNOWN` records with bounded backoff.
- Emergency configuration can disable new transaction creation while preserving balance/history reads and reconciliation.
- Dependency, secret, static-analysis, license, migration, unit, integration, and build checks gate release.

## Error Handling

- Invalid or unsupported inputs return stable machine-readable codes and safe user-facing messages.
- Missing account, insufficient balance, reserve violation, missing trustline, destination trustline failure, no path, price movement, bad sequence, expired time bounds, malformed XDR, signature mismatch, and Horizon rejection remain distinct.
- A bad sequence or expired quote requires rebuilding and re-signing; the server never modifies a signed envelope.
- Network timeouts become `UNKNOWN` until reconciliation proves success or failure.
- Failed transactions retain their intent and transaction hash for diagnosis but never credit balances locally.
- Retries use the original idempotency key and do not create a second payment.

## Testing and Release Gates

### Deterministic tests

- Exact seven-decimal `bigint` parsing, formatting, bounds, and overflow tests.
- Asset registry and issuer allowlist tests.
- StrKey destination validation tests.
- Unsigned/signed XDR equivalence and visible-review matching tests.
- Policy tests for reserve, balance, trustline, slippage, expiry, and network restrictions.
- State-machine, idempotency, duplicate-submit, and concurrent-claim tests.
- Error mapping and secret-redaction tests.

### Integration tests

- Fastify routes run against ephemeral PostgreSQL.
- Horizon adapter tests use recorded fixtures for account, balance, history, paths, submission, and errors.
- Database migrations run from an empty database and the previous schema.
- CSP and security headers are asserted.
- Dashboard tests cover every required state and prevent demo/live data mixing.

### Opt-in live Testnet tests

- Fund fresh Testnet accounts.
- Create the official USDC trustline.
- Submit an XLM payment and verify both account histories.
- Execute an XLM/USDC strict-send path when liquidity exists, or prove a deterministic no-path state.
- Retry an identical signed submission and prove no duplicate accounting or user-visible success.

### Release definition

The release may be called production-quality Testnet only when:

- Unit, integration, concurrency, migration, build, and live opt-in Testnet tests pass.
- No critical or high exploitable production dependency advisory remains without a written exception.
- No secret or mnemonic appears in API traffic, logs, analytics, browser history, or tracked production configuration.
- Every displayed balance and completed operation can be traced to Horizon or an explicitly labeled demo fixture.
- An external application-security review is still required before Mainnet.

## Delivery and Git

Implementation occurs on the current feature branch while preserving existing uncommitted dashboard layout work. Each coherent task is verified before commit. After final verification, the completed commits are pushed to the repository's `main` branch as explicitly requested, without force-pushing or discarding unrelated work.
