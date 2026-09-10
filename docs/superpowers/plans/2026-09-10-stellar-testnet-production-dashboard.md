# PiggyBanq Stellar Testnet Production Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the authenticated dashboard's simulated Stellar activity with live Testnet balances, trustlines, payments, path swaps, locally signed XDRs, and durable execution state while keeping yield explicitly simulated.

**Architecture:** The Fastify API owns validation, Horizon reads, policy, unsigned XDR construction, idempotent submission, persistence, and reconciliation. The browser independently verifies the returned XDR, decrypts the PiggyBanq vault only for explicit signing, and sends only signed XDR to the API. Dashboard resources expose authoritative live, unavailable, or demo states without substituting static financial data.

**Tech Stack:** Next.js 15, React 19, Fastify 5, Prisma 6, PostgreSQL 16, `@stellar/stellar-sdk` 16, TypeScript, Node test runner.

## Global Constraints

- Stellar Testnet only; use `Networks.TESTNET` and `https://horizon-testnet.stellar.org` by default.
- PiggyBanq remains self-custodial; password, mnemonic, and secret key never leave the browser.
- XLM and official Testnet USDC are the only enabled assets. USDC issuer: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
- Parse amounts directly to seven-decimal `bigint` units; never use JavaScript `Number` for financial amounts.
- Every signature follows a visible review of network, operation, amount, asset/issuer, destination, path, minimum received, fee, memo, and time bounds.
- Binance, CCTP, fiat settlement, Mainnet, and real yield remain disabled.
- Rename staking language to `Yield Lab` or `Locked Savings Forecast` and label it simulation-only.
- Never turn submission timeout or unknown state into success.
- Preserve the landing page and the approved dashboard color/typography direction.

---

### Task 1: Exact Stellar Assets and Amounts

**Files:**
- Create: `packages/stellar-core/src/assets.ts`
- Create: `packages/stellar-core/src/amounts.ts`
- Modify: `packages/stellar-core/package.json`
- Modify: `packages/stellar-core/src/cross-rail.ts`
- Test: `tests/stellar-production-core.test.mjs`

**Interfaces:**
- Produces: `STELLAR_TESTNET_ASSETS`, `resolveStellarAsset(code)`, `parseStellarAmount(value, decimals)`, and `formatStellarAmount(units, decimals)`.
- Consumes: asset code `XLM | USDC` and decimal strings with at most seven fractional digits.

- [ ] **Step 1: Write failing exact-unit tests** covering `0.0000001`, `25.1234567`, maximum configured amounts, excess decimals, zero, negative, exponential notation, unsafe integers, XLM native identity, and the exact USDC issuer.
- [ ] **Step 2: Run** `node --test tests/stellar-production-core.test.mjs` and confirm missing module/export failures.
- [ ] **Step 3: Implement asset metadata** as immutable records:

```ts
export const STELLAR_TESTNET_ASSETS = {
  XLM: { code: 'XLM', type: 'native', issuer: null, decimals: 7 },
  USDC: { code: 'USDC', type: 'credit_alphanum4', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', decimals: 7 }
} as const;
```

- [ ] **Step 4: Implement string-to-bigint parsing and formatting** by splitting whole/fractional digits and padding to the asset precision without passing through `Number`.
- [ ] **Step 5: Replace two-decimal parsing in `cross-rail.ts`** with the exact parser while retaining sandbox-only behavior for excluded features.
- [ ] **Step 6: Run** `node --test tests/stellar-production-core.test.mjs tests/agentic-cross-rail.test.mjs` and confirm all assertions pass.
- [ ] **Step 7: Commit** only Task 1 files with `feat: add exact Stellar asset amounts`.

### Task 2: Durable Stellar Transaction State

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20260910090000_stellar_transaction_intents/migration.sql`
- Create: `server/src/modules/stellar/intent-store.ts`
- Test: `tests/stellar-intent-contract.test.mjs`

**Interfaces:**
- Produces: `StellarTransactionIntent`, `StellarTransactionStatus`, and store operations `createQuotedIntent`, `claimIntentForExecution`, `recordSubmittedIntent`, `recordTerminalIntent`, `findIntentForUser`.
- Consumes: authenticated user ID, client idempotency key, normalized operation request, unsigned body hash, XDR, expiry, and transaction hash.

- [ ] **Step 1: Write failing schema/source tests** for statuses `QUOTED`, `AWAITING_SIGNATURE`, `EXECUTING`, `SUBMITTED`, `SUCCEEDED`, `FAILED`, `EXPIRED`, `CANCELLED`, `UNKNOWN`, plus a unique `(userId, idempotencyKey)` constraint.
- [ ] **Step 2: Run** `node --test tests/stellar-intent-contract.test.mjs` and confirm the model and store are absent.
- [ ] **Step 3: Add the Prisma enum/model and SQL migration** with exact amount strings, asset/issuer, destination, memo, path JSON, fee, unsigned XDR/body hash, signed hash, error fields, and transition timestamps.
- [ ] **Step 4: Implement conditional transitions** using `updateMany` predicates so only `AWAITING_SIGNATURE` can become `EXECUTING`, and return an existing terminal/submitted intent for duplicate idempotent requests.
- [ ] **Step 5: Add audit entries** for quote, execution claim, submission, terminal result, expiry, and cancellation without storing secrets or passwords.
- [ ] **Step 6: Run** `corepack pnpm exec prisma validate --schema server/prisma/schema.prisma` and the focused test.
- [ ] **Step 7: Commit** Task 2 files with `feat: persist Stellar transaction intents`.

### Task 3: Horizon Testnet Adapter and Configuration

**Files:**
- Create: `server/src/config.ts`
- Create: `server/src/modules/stellar/horizon-adapter.ts`
- Create: `server/src/modules/stellar/errors.ts`
- Create: `server/tsconfig.json`
- Modify: `server/package.json`
- Modify: `server/.env.example`
- Test: `tests/stellar-horizon-adapter.test.mjs`
- Test: `tests/deployment-config.test.mjs`

**Interfaces:**
- Produces: `loadStellarConfig(env)`, `StellarHorizonAdapter`, normalized account summaries, activity records, path quotes, unsigned transaction builders, submission result, and reconciliation result.
- Consumes: `Horizon.Server`, `Networks.TESTNET`, exact asset metadata, public keys, normalized amount strings, and optional injected clock/server for tests.

- [ ] **Step 1: Write failing adapter/config tests** using fixture responses for missing account, XLM/USDC balances, liabilities, absent trustline, payment history, strict-send paths, no path, fee stats, successful submission, duplicate submission, and transaction lookup.
- [ ] **Step 2: Run** `node --test tests/stellar-horizon-adapter.test.mjs tests/deployment-config.test.mjs` and confirm missing exports.
- [ ] **Step 3: Implement startup configuration validation** for Testnet-only Horizon URL, network, quote TTL, amount caps, Friendbot flag, allowed origin, and cookie settings. Correct example auth URL/domain to port 3010.
- [ ] **Step 4: Implement normalized Horizon reads** using `Horizon.Server` for account, balances, trustlines, payments, operations, fee stats, and strict-send paths.
- [ ] **Step 5: Implement unsigned builders** for `Operation.payment`, `Operation.changeTrust`, and `Operation.pathPaymentStrictSend` with `Networks.TESTNET`, fresh sequence, bounded fee, memo validation, and short time bounds.
- [ ] **Step 6: Implement submission and reconciliation** that returns distinct `SUBMITTED`, `SUCCEEDED`, `FAILED`, and `UNKNOWN` results with sanitized Stellar result codes.
- [ ] **Step 7: Replace server `build` and `lint` scripts** with strict `tsc --noEmit` checks covering all server source files.
- [ ] **Step 8: Run** focused tests plus `corepack pnpm --filter @piggybanq/server build`.
- [ ] **Step 9: Commit** Task 3 files with `feat: add Stellar Horizon testnet adapter`.

### Task 4: Authenticated Stellar API

**Files:**
- Create: `packages/types/src/stellar-transactions.ts`
- Modify: `packages/types/package.json`
- Create: `server/src/modules/stellar/schemas.ts`
- Create: `server/src/modules/stellar/service.ts`
- Create: `server/src/modules/stellar/routes.ts`
- Modify: `server/src/server.ts`
- Test: `tests/stellar-server-contract.test.mjs`

**Interfaces:**
- Produces: `GET /stellar/me/summary`, `GET /stellar/me/activity`, `GET /stellar/capabilities`, `POST /stellar/intents/quote`, `POST /stellar/intents/:id/submit`, and `GET /stellar/intents/:id`.
- Consumes: authenticated session user/public key, `Idempotency-Key` header, discriminated quote bodies for `PAYMENT`, `CHANGE_TRUST`, and `PATH_PAYMENT_STRICT_SEND`, and signed XDR submissions.

- [ ] **Step 1: Write failing route/source tests** for authentication, ownership, discriminated validation, mandatory idempotency key, Testnet/asset allowlists, destination StrKey checks, memo limits, slippage bounds, expiry, and stable error codes.
- [ ] **Step 2: Run** `node --test tests/stellar-server-contract.test.mjs` and confirm missing routes/types.
- [ ] **Step 3: Add shared request/response types** for summary, activity, quote review, intent state, capabilities, and sanitized errors.
- [ ] **Step 4: Implement quote service policy**: account existence, spendable balance/reserve, source and destination trustlines, exact amount caps, live path selection, fee, quote age, and expiry.
- [ ] **Step 5: Persist the quote before returning unsigned XDR** and return the existing quote for the same user/idempotency key and identical request; reject key reuse with different input.
- [ ] **Step 6: Implement signed-XDR acceptance** by parsing with `Networks.TESTNET`, comparing the transaction body with the stored unsigned XDR, verifying source/signature, atomically claiming execution, recording hash, submitting once, and reconciling.
- [ ] **Step 7: Register routes and map adapter/domain failures** to stable HTTP status and error codes without leaking provider payloads.
- [ ] **Step 8: Run** focused tests and the strict server build.
- [ ] **Step 9: Commit** Task 4 files with `feat: expose signed Stellar transaction API`.

### Task 5: Local XDR Verification and Wallet Signing

**Files:**
- Create: `apps/web/app/lib/stellar-transactions.ts`
- Modify: `apps/web/app/(app)/dashboard/secure-wallet.ts`
- Modify: `apps/web/app/lib/wallet-auth-api.ts`
- Test: `tests/web-stellar-signing.test.mjs`

**Interfaces:**
- Produces: `decodeAndVerifyStellarQuote(quote)`, `signStellarTransaction({ username, password, quote })`, and typed API client methods for summary, activity, quote, submit, and intent refresh.
- Consumes: stored active wallet username/public key, password entered for the current action, server quote, unsigned XDR, and `Networks.TESTNET`.

- [ ] **Step 1: Write failing source/import tests** that require local XDR decoding, exact review comparison, Testnet enforcement, source-account match, time-bound validation, `Keypair.fromSecret` only inside the signing function, and no secret in API payloads.
- [ ] **Step 2: Run** `node --test tests/web-stellar-signing.test.mjs` and confirm missing functions.
- [ ] **Step 3: Implement quote decoding and independent verification** for payment, change-trust, and strict-send path-payment operations; reject extra operations or mismatched review fields.
- [ ] **Step 4: Add a narrow signing helper** that unlocks the encrypted vault, validates public key equality, signs the verified transaction, returns signed XDR, and does not persist the vault/password/secret.
- [ ] **Step 5: Add typed API client functions** with `credentials: include`, `Idempotency-Key`, abort timeouts, and structured errors.
- [ ] **Step 6: Run** focused signing and existing wallet-auth tests.
- [ ] **Step 7: Commit** Task 5 files with `feat: sign verified Stellar XDR locally`.

### Task 6: Live Dashboard and Transaction Experience

**Files:**
- Create: `apps/web/app/(app)/dashboard/StellarDashboard.tsx`
- Create: `apps/web/app/(app)/dashboard/StellarTransactionDialog.tsx`
- Modify: `apps/web/app/(app)/dashboard/PortfolioDashboard.tsx`
- Modify: `apps/web/app/(app)/dashboard/_components/DashboardShell.tsx`
- Modify: `apps/web/app/(app)/dashboard/pockets/RailOperations.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `tests/web-agentic-dashboard.test.mjs`
- Create: `tests/web-stellar-dashboard.test.mjs`

**Interfaces:**
- Produces: live dashboard summary/activity, create-trustline flow, send flow, swap quote/review/sign/submit flow, intent status refresh, transaction explorer links, and honest capability messaging.
- Consumes: Task 5 API/signing functions and shared Stellar response types.

- [ ] **Step 1: Write failing UI contract tests** for live/empty/offline/missing-trustline/no-path/expired/awaiting-signature/submitted/unknown/succeeded/failed states and absence of static balances in live mode.
- [ ] **Step 2: Run** `node --test tests/web-stellar-dashboard.test.mjs tests/web-agentic-dashboard.test.mjs` and confirm missing components/copy.
- [ ] **Step 3: Implement live resource loading** with explicit retry and no fallback to plausible balances; preserve a separately labeled demo mode only for the development demo account.
- [ ] **Step 4: Implement transaction forms and review dialog** with keyboard focus management, exact details, password requested only at final signature, disabled duplicate submission, and safe recovery actions.
- [ ] **Step 5: Refresh balance, activity, and intent state** after submission; show explorer links only for validated Testnet transaction hashes.
- [ ] **Step 6: Rename `Stake` navigation and copy to `Yield Lab`** and mark forecast cards `Simulation only — no funds deposited`.
- [ ] **Step 7: Replace Binance/CCTP action UI with disabled capability cards** and remove sandbox success execution controls from the production dashboard.
- [ ] **Step 8: Add responsive, focus-visible, loading, error, and reduced-motion styles** scoped below `.savings-dashboard-shell`; do not touch landing selectors.
- [ ] **Step 9: Run** dashboard/signing tests and `corepack pnpm --filter @piggybanq/web build`.
- [ ] **Step 10: Commit** Task 6 files, including the pre-existing approved dashboard layout repair, with `feat: connect dashboard to Stellar Testnet`.

### Task 7: Security Headers and Runtime Guardrails

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/next.config.ts`
- Modify: `server/src/server.ts`
- Modify: `apps/web/.env.example`
- Modify: `server/.env.example`
- Test: `tests/production-security.test.mjs`
- Modify: `tests/deployment-config.test.mjs`

**Interfaces:**
- Produces: restrictive security headers, explicit mutation-origin checks, scoped rate limits, startup fail-closed validation, and read-only emergency mode.
- Consumes: validated configuration from Task 3 and configured web/API origins.

- [ ] **Step 1: Write failing security contract tests** for CSP, frame protection, referrer policy, permissions policy, content-type protection, production cookie/origin settings, emergency read-only mode, and secret log redaction.
- [ ] **Step 2: Run** `node --test tests/production-security.test.mjs tests/deployment-config.test.mjs` and confirm missing controls.
- [ ] **Step 3: Replace the inline theme bootstrap** with a CSP-compatible external script or nonce strategy and add Next response headers with explicit Testnet/API `connect-src` values.
- [ ] **Step 4: Add Fastify mutation Origin validation** and route-specific rate-limit configuration for quote, submit, Friendbot, and auth endpoints.
- [ ] **Step 5: Add emergency read-only configuration** that blocks new quotes/submissions but leaves health, summary, activity, and reconciliation available.
- [ ] **Step 6: Update environment examples and deployment documentation** with exact port 3010 origins, Testnet URLs, limits, cookie settings, and disabled-provider flags.
- [ ] **Step 7: Run** security tests and web/server builds.
- [ ] **Step 8: Commit** Task 7 files with `security: harden Stellar dashboard runtime`.

### Task 8: End-to-End Verification and Main Push

**Files:**
- Create: `tests/stellar-testnet-live.test.mjs`
- Modify: `.github/workflows/ci.yml` if the workflow exists; otherwise create it.
- Modify: `docs/vercel-supabase-deployment.md`
- Modify: `docs/audits/2026-09-08-stellar-binance-blockchain-readiness-audit.md`

**Interfaces:**
- Produces: deterministic CI gates, opt-in live Testnet coverage, current deployment instructions, and a final readiness record.
- Consumes: all preceding tasks.

- [ ] **Step 1: Add an opt-in live test** guarded by `RUN_STELLAR_TESTNET_E2E=1` and ephemeral secrets supplied only through CI secret storage; cover account funding, trustline creation, XLM payment, balance/history confirmation, and strict-send swap or deterministic no-path.
- [ ] **Step 2: Add CI jobs** for frozen install, unit/source tests, strict server type-check, Prisma validation, web build, dependency audit, and PostgreSQL migration/integration tests.
- [ ] **Step 3: Update deployment and audit documents** to distinguish implemented live Stellar Testnet flows from disabled Binance/CCTP and simulated Yield Lab.
- [ ] **Step 4: Stop any dev server sharing `.next`, then run** `corepack pnpm test`, `corepack pnpm -r build`, `corepack pnpm exec prisma validate --schema server/prisma/schema.prisma`, `git diff --check`, and the dependency audit.
- [ ] **Step 5: Start PostgreSQL/API/web locally**, apply migrations, create/login a fresh PiggyBanq wallet, and verify dashboard summary, trustline, payment, swap/no-path, timeout, retry, and logout behavior.
- [ ] **Step 6: Run the UI taste review** and correct material hierarchy, overflow, interaction, or accessibility findings without altering the landing hero.
- [ ] **Step 7: Commit final verification/documentation** with `docs: record Stellar testnet readiness`.
- [ ] **Step 8: Fetch the remote, verify the intended commits and working tree, merge or fast-forward onto local `main`, rerun the release gate on `main`, and push `main` without force.**

## Self-review

- Spec coverage: Tasks 1–7 cover exact amounts, durable state, Horizon, API, local signing, dashboard states, and security. Task 8 covers live verification, CI, operations, documentation, and the requested push.
- Scope: Binance, CCTP, Mainnet, fiat settlement, and real yield are explicitly excluded from implementation and represented as unavailable rather than successful simulations.
- Type consistency: shared types flow from `packages/types/src/stellar-transactions.ts` into the server routes and web client; operation names and statuses match the approved specification.
- Safety: the backend never receives wallet secrets; the browser verifies every XDR before signing; durable idempotency precedes external submission.
- Placeholder scan: every task names exact files, interfaces, commands, expected failure mode, implementation behavior, verification, and commit boundary.
