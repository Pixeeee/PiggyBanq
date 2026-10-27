# Stellar Testnet x402 paid API

The first service sells a deterministic savings-tip response for 0.0001 Testnet
XLM. It uses x402 v2 exact payments through the native XLM Stellar Asset Contract.
XLM Testnet credits have no monetary value. ZK, Mainnet, autonomous signing,
arbitrary URLs, bridging and Binance integrations are outside this change.

The user creates a quote, reviews the recipient, token, amount, sponsored fee and
limits, explicitly approves it, then unlocks the local vault to sign the precise
Soroban authorization. The backend never receives the user's secret or password.
The same-origin RPC proxy allows simulation/read methods only. A separate local
Testnet facilitator wallet sponsors fees; it cannot sign for the payer.

Limits are 0.001 XLM per payment and 0.01 XLM per rolling 24 hours per user.
Approval reserves the amount under a database row lock. Pending and uncertain
payments consume the allowance, preventing concurrent approval from overspending.
Only the fixed built-in paid resource is accepted. Auth entries must contain one
exact token transfer and no nested calls. Expired or unapproved intents cannot pay.

The facilitator's signed settlement envelope and hash are persisted before
broadcast. The API independently queries Stellar RPC and checks success, the exact
transfer and the original authorization before issuing a receipt. Unknown outcomes
remain unresolved and can be refreshed without a new payment. Repeated requests
return the stored receipt and result after success. No sandbox receipt can satisfy
the live payment path.

Implementation order: test validation, implement shared/local signing, add the
payment table and service, add the reviewed dashboard flow, then run deterministic,
database, browser and disposable-account live Testnet verification. Existing
database-role and encrypted-backup changes must remain intact. Local table renames
and a Supabase deployment are not part of this work.

## Run locally

Use the repository's Node 24 / pnpm 11.7.0 environment, then:

```sh
pnpm install --frozen-lockfile
pnpm --filter @piggybanq/server exec prisma generate --schema prisma/schema.prisma
pnpm --filter @piggybanq/server db:migrate
node scripts/setup-x402-testnet.mjs
```

The setup creates two disposable Testnet accounts and funds them with Friendbot.
The fee sponsor secret is kept in the private, ignored server `.env`; the separate
merchant recovery key is stored at `~/.config/piggybanq/x402-testnet-merchant.key`.
These accounts are only for Testnet. The payer's key is never provisioned by the
server. Setup is rerunnable and refuses to replace an existing merchant address.
After setup, restart the API. Build and restart Next rather than using dev mode,
because the existing production CSP disallows the dev runtime's eval:

```sh
pnpm --filter @piggybanq/web build
pnpm --filter @piggybanq/web start --hostname 127.0.0.1 --port 3010
```

Open `/dashboard/agent`, sign in with your PiggyBanq wallet, fund its public key
with Testnet XLM if necessary, preview the paid API, approve, and sign locally.
The API issues HTTP 402 with `PAYMENT-REQUIRED`, accepts `PAYMENT-SIGNATURE`, and
returns `PAYMENT-RESPONSE` only after independent ledger verification. The result
can be retrieved repeatedly without paying again. Refresh recovers pending status.
Unsubmitted approvals can be cancelled; expired approvals release their reservation.

Interrupted work without a prepared envelope fails safely after 90 seconds on
refresh. A saved, signed envelope can be re-broadcast unchanged during its validity
window. A NOT_FOUND result becomes failed only when RPC's retained ledger interval
covers the entire expired transaction window; otherwise it stays UNKNOWN. Terminal
states cannot be overwritten by a stale reconciliation request. Recovery currently
runs on request/refresh; an unattended background reconciliation worker is deferred.

The fee sponsor is serialized within one API process. Before running multiple
replicas, move settlement to a shared facilitator with durable sequence management.
The seller lives in this backend and is an educational test service, not an
external commercial provider. Each payment requires a fresh local user signature;
there is no unattended spending delegation.

## Verification

```sh
RUN_DATABASE_X402_TESTS=1 node --test tests/x402-database.test.mjs
RUN_X402_TESTNET_E2E=1 node --test tests/x402-live.test.mjs
pnpm test
pnpm --filter @piggybanq/server lint
pnpm --filter @piggybanq/web lint
```

The database tests create and remove only their own fixture users/records. The
live test creates a disposable payer, uses the actual local encrypted-vault signer,
and removes its local database fixture afterward. Testnet transfers remain on-chain.

Verified live transaction on 2026-10-27:
`b063bcbc609612ef6f39b9d0a5dbbaebedfe60f6bc88b77d2bb2323756286143`,
ledger `5409622`, amount `0.0001 XLM`. This establishes Testnet settlement,
not Mainnet readiness or an independent cryptographic audit.

References: [Stellar x402](https://developers.stellar.org/docs/build/agentic-payments/x402/)
and [official exact Stellar implementation](https://www.npmjs.com/package/@x402/stellar).


## Web and native release (2026-10-27)

The pinned x402 core compatibility patch removes Zod3 in favor of patched4.6.7;
see DEPENDENCY-SECURITY.md. Web and native share the exact-transfer simulated
local signer. Native: Sync → connect web account → Paid API. The separate Send →
Agent screen remains a sandbox. Native persists the payment ID before approval,
requires password verification before signing, and recovers the result and
verified receipt on reopening. Closing/locking the view during signing prevents
further submission; an already submitted transfer must be reconciled.

Render uses a dedicated funded Testnet fee sponsor, separate from local development
and the merchant. Only its sponsor key and the merchant public address belong in
Render. Neither Vercel nor the APK receives sponsor keys, database URLs or merchant
recovery keys. Keep Render at one replica because the sponsor sequence queue is
process-local. The per-user caps remain0.001XLM per payment and0.01XLM/rolling24h.
