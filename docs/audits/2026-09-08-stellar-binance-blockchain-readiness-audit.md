# PiggyBanq Stellar and Binance Blockchain Readiness Audit

**Audit date:** 2026-09-08

**Repository:** `Pixeeee/PiggyBanq`

**Local branch reviewed:** `kim`

**Audit type:** source review, focused runtime probes, test/build verification, dependency audit, credential-pattern scan, and current official-documentation comparison

## Executive verdict

PiggyBanq is **not yet a fully functional blockchain application**. It is a functional local UI and deterministic sandbox prototype with a sound high-level separation of responsibilities:

- Stellar is intended for wallet identity, savings, swaps, and future yield integrations.
- Binance is intended for isolated agentic payments/trading rather than custody of the Stellar wallet.
- Circle CCTP is intended for native USDC transfers from Stellar Testnet to Base Sepolia.

However, the repository currently performs **no real Stellar payment, swap, trustline, staking/yield, or CCTP transaction**, and it performs **no Binance Agentic Wallet or x402 API call**. The success receipts are generated locally. They are not blockchain receipts.

**Recommendation:** keep the product explicitly marked **prototype / testnet simulator**, do not accept real funds, and do not enable Mainnet until every P0 and P1 item in this report is complete and independently reviewed.

## What was validated

| Area | Result | Evidence |
|---|---|---|
| Unit/source-contract tests | Pass | 45/45 tests passed with `corepack pnpm test` |
| Monorepo build | Pass | Web production build, mobile TypeScript check, shared packages, and server syntax scripts passed with `corepack pnpm -r build` |
| Prisma schema | Pass | `prisma validate` reported a valid schema |
| Fastify runtime bootstrap | Pass, limited | `/health` returned 200; unauthenticated `/agentic/capabilities` returned 401 |
| Local web routes | Pass after dev-server restart | `/`, `/dashboard`, `/dashboard/allocations`, and `/dashboard/pockets` returned 200 with a development demo session |
| Stellar public infrastructure | Reachable | Horizon Testnet reported the current ledger; Stellar RPC Testnet reported `healthy` |
| Authenticated API integration | Not fully tested | No local PostgreSQL listener, no `server/.env`, and no API listener on port 4000 were present |
| Interactive visual browser test | Not completed | No controllable browser instance was available; HTTP route probes and production build were used instead |
| Dependency audit | Fail | 68 production advisory findings: 1 critical, 39 high, 28 moderate |
| Current-file credential scan | No live provider credentials found | No real Binance, Circle, or database credentials were found in tracked source/config files |
| Git-history credential-pattern scan | Review items only | A test Stellar secret, deterministic demo mnemonic, and Android debug keystore are tracked; no populated Binance credential variables were found |

The local dashboard initially returned HTTP 500 because a running Next development process was using build output while the production build rewrote `.next`. Restarting the development server restored all reviewed routes. This is a development-process/cache collision, not evidence of a blockchain failure. Avoid running `next build` concurrently with `next dev` in the same working tree.

## Functional reality by rail

| Capability shown or described | Current implementation | Fully functional? |
|---|---|---|
| Stellar wallet generation | Browser mnemonic-derived Ed25519 key and mobile random key generation | Partly: key generation works locally, but account funding and network account creation are absent |
| Stellar wallet authentication | Custom one-time Ed25519 challenge, hashed server session token, one-time challenge consumption | Partly: code is credible, but a database-backed end-to-end run was unavailable in this environment |
| Stellar balances/history | Static illustrative dashboard values and app-layer ledger events | No Horizon balance/history adapter exists |
| Stellar transfer | Confirmation data model only | No transaction builder, signing/submission, or finality check exists |
| XLM/USDC swap | Hard-coded rate sandbox preview | No Horizon path query, SDEX path-payment transaction, trustline inspection, signature, or settlement exists |
| Stellar trustlines | Boolean helper based only on whether the asset is XLM | No issuer validation or on-ledger trustline lookup exists |
| Stellar staking/yield | User-selected APR calculator and database/localStorage ledger simulation | No yield provider or Soroban contract exists; Stellar itself is not proof-of-stake staking |
| Sell/off-ramp | Fixed PHP-rate preview | SEP-24 route explicitly returns `phase_3`; no anchor is connected |
| Binance x402 | Local/server sandbox intent preview and fake success receipt | No partner-authenticated `/supported`, `/verify`, or `/settle` request exists |
| Binance Agentic Wallet/MCP | Names and UI labels only | No MCP connection, OAuth/session, sub-account, scopes, quota, wallet status, or order tracking exists in PiggyBanq |
| Stellar → Base CCTP | Correct domain labels and three fake stages | No Stellar burn, Circle attestation retrieval, Base mint, recovery/resume, or destination transaction verification exists |
| Stellar → BSC CCTP | Rejected | Correct: native USDC is not supported on the BNB Smart Chain CCTP domain |

## Positive security controls already present

- The backend auth database stores Stellar public keys, not Stellar secret keys or mnemonics.
- Web wallet material is encrypted with AES-GCM using a password-derived PBKDF2-SHA-256 key and a random salt/IV.
- Wallet auth challenges include domain, URI, network, nonce, issue time, expiry, and purpose.
- Challenge consumption uses a one-time conditional update, reducing replay risk.
- Session tokens are random and stored server-side only as SHA-256 hashes.
- Production auth cookies are `HttpOnly` and `Secure`.
- Agentic routes require an authenticated server session.
- The UI usually labels agentic execution as sandbox and states that no real funds moved.
- CCTP source/destination domains are currently correct: Stellar `27`, Base `6`.
- Stellar-to-BSC native USDC is intentionally blocked.

These controls are worth keeping, but they do not compensate for the missing settlement adapters or the issues below.

## Findings

### Critical — dependency tree contains known production vulnerabilities

`pnpm audit --prod` returned **68 advisory findings**: 1 critical, 39 high, and 28 moderate. Important direct/transitive examples include:

- `tar@6.2.1`, pulled through unused `bcrypt@5.1.1`, is below the audit's patched `tar` versions and includes a critical decompression/parse denial-of-service advisory plus several extraction advisories.
- `next@15.5.20` is below the audit's patched `15.5.21` and is reported for high-severity App Router/Server Action denial-of-service and SSRF advisories.
- `fastify@5.9.0` is below the audit's patched `5.12.1` for validation-bypass and proxy-related advisories.
- `axios@1.16.1`, pulled by `@stellar/stellar-sdk@16.0.1`, is below the audit's patched `1.18.0` for multiple request-construction and denial-of-service advisories.

**Impact:** the precise exploitability varies by code path, but a financial application should not ship with a critical production audit result.

**Required action:** upgrade direct dependencies and lockfile, remove unused `bcrypt`, `jose`, and `otplib` if still unused, then rerun unit tests, builds, integration tests, and `pnpm audit --prod`. Do not blindly use an audit auto-fix across major versions.

### High — no real blockchain or provider settlement is implemented

The source contains no `TransactionBuilder`, `Operation.payment`, `Operation.pathPayment*`, `Operation.changeTrust`, Horizon `submitTransaction`, RPC `sendTransaction`, RPC `simulateTransaction`, Binance x402 HTTP call, Circle attestation call, or EVM mint call in executable application code.

`packages/stellar-core/src/polling.ts` only classifies status strings. It does not poll a network. `server/src/modules/agentic/sandbox-provider.ts` delegates entirely to pure sandbox functions, and `executeSandboxIntent()` fabricates a successful receipt and successful stages.

**Impact:** displayed success cannot prove that funds moved. The application is not functionally complete for blockchain use.

**Required action:** implement provider adapters with real testnet transaction hashes and independently verify final state before marking any action successful.

### High — financial amounts lose precision and can be misquoted

`packages/stellar-core/src/cross-rail.ts:229-239` accepts up to seven decimals but converts every asset to two decimal units using JavaScript `Number`.

Reproduced locally:

- Input `25.1234567 XLM` becomes `25.12 XLM`.
- Amounts below `0.01 XLM` collapse to zero and are rejected even though Stellar supports seven decimals.
- Very large inputs can exceed safe integer precision.
- Circle's current Stellar documentation states that Stellar USDC uses seven-decimal subunits, while CCTP messages use six-decimal subunits. A universal two-decimal representation is unsafe.

**Required action:** introduce an asset metadata table with exact decimals, parse strings directly to `bigint`, never pass value through `Number`, and add boundary/property tests for XLM (7), Stellar USDC (7), CCTP USDC message units (6), and fiat display units (2).

### High — agentic execution is not idempotent or concurrency-safe

`executeSandboxIntent()` can be called repeatedly with the same approved object and generates a different success receipt each time. The server reads `APPROVED`, performs execution, then updates the row and creates a unique receipt. Two simultaneous requests can both pass the initial read.

The database uniqueness constraint may make one request fail, but it does not protect a future external provider call that occurs before the conflicting database write. That can create a double payment or an ambiguous 500 after money moved.

The savings withdrawal route has a similar read-then-update race. Two concurrent withdrawals can both observe `withdrawnAt == null` and append duplicate yield/withdrawal events.

**Required action:** use a database compare-and-set transition (`APPROVED → EXECUTING`) inside a transaction, a durable client/provider idempotency key, a unique operation key, provider reconciliation, and an atomic conditional withdrawal update.

### High — expired approvals can still execute

Expiry is checked only in `approveSandboxIntent()`. `executeSandboxIntent()` verifies status but not `expiresAt`.

Reproduced locally: an intent approved during its five-minute window executed successfully after its expiry time.

**Required action:** check expiry both before provider execution and inside the atomic state transition. Expired intents must become `EXPIRED` or `CANCELLED` and require a new quote.

### High — CCTP destination protection is enforced only in one UI

`RailOperations.tsx` validates a 40-byte-hex Base address in the browser, but the server schema makes `destinationAddress` optional and only limits it to 80 characters. The shared CCTP domain function accepts a bridge without any destination and still marks “Base destination must be confirmed” as passed.

Reproduced locally: a Stellar-to-Base bridge preview was accepted with `destinationAddress: null`.

**Impact:** wiring a real burn behind this contract could burn funds without a valid mint recipient.

**Required action:** use a discriminated schema per action type. Require and checksum-validate the Base Sepolia address on the server and provider adapter, encode it to the exact CCTP recipient representation, and show the resolved destination in the approval payload.

### High — web key custody depends on XSS resistance that is not configured

The web vault is encrypted at rest, but it is stored in `localStorage`, decrypted in browser JavaScript, and the secret key is passed as a JavaScript string for signing. Any same-origin script executing while the wallet is unlocked can access process memory or intercept signing operations.

The Next configuration defines no Content Security Policy or other explicit security headers. The root layout also uses an inline theme script, which will require a nonce/hash or redesign when a strict CSP is added.

**Required action:** add a strict CSP, Trusted Types where practical, restrictive framing/referrer/permissions headers, dependency/SRI controls for third-party scripts, and an XSS-focused review. For production, strongly prefer a reviewed wallet/key-management SDK or external wallet signing boundary instead of maintaining custom key custody.

### High — mobile secret is loaded into memory before device authentication

The native app stores raw wallet JSON in Expo SecureStore without `requireAuthentication` options. On startup it loads the complete object, including `secretKey`, into React state. Device authentication is performed only before revealing the already-loaded string in the UI.

If SecureStore is unavailable, the Expo web preview stores the raw secret key unencrypted in `localStorage`. Comments say this is localhost-only, but no production platform guard enforces that assumption.

**Required action:** store the secret with OS authentication/access-control options, retrieve it only for a narrowly scoped signing/backup operation after authentication, avoid keeping it in global React context, zero/release references promptly, and hard-disable raw-secret web fallback in production builds.

### High — yield/stake records are accounting simulations, not sourced yield

Creating a locked earning pocket accepts a user-selected amount and APY, then immediately creates a `DEPOSIT_CONFIRMED` ledger event with metadata `source: testnet-demo`. No wallet balance, Horizon transaction, contract deposit, or provider position is verified. Withdrawal later calculates and credits yield mathematically.

Stellar uses SCP/Federated Byzantine Agreement rather than proof-of-stake, and validators receive no monetary staking reward. Therefore “Stellar staking” is not an accurate source of native XLM yield.

**Required action:** rename this feature to “yield simulation” or “locked savings forecast” everywhere until a named, audited strategy exists. A real feature needs a specific protocol/provider, contract addresses, asset issuer, custody model, APY source, risk disclosures, position reconciliation, and withdrawal path.

### Medium — dashboard financial values are static illustrative data

The primary dashboard imports balances, token rates, portfolio allocations, savings activity, maturity details, and APR from `apps/web/app/(app)/dashboard/_data/savings-dashboard.ts`. It does not read Horizon or the user's savings records. The page labels some values illustrative, but the presentation can still look like a live account.

**Required action:** default to real empty states, load account balances/history from Horizon, load pockets from the API, and isolate sample data behind an unmistakable demo-only mode banner.

### Medium — policy checks are text, not checks

The sandbox creates `policyChecks` with `passed: true`, including “Trustline checked” and “Base destination must be confirmed,” without performing those checks. x402 recipient is any non-empty string; bridge and swap have no maximum; `serviceUrl` is an arbitrary string rather than a validated URL.

**Required action:** compute every policy result from authoritative input/state. Add asset/issuer allowlists, recipient/address allowlists, per-user daily limits, route-specific maxima, quote freshness, trustline and balance checks, and safe URL parsing. If `serviceUrl` is ever fetched server-side, add strict egress allowlisting to prevent SSRF.

### Medium — payment confirmation accepts zero amount and zero fee

`createPaymentConfirmation()` says the amount must be positive but accepts `0` and `0.0000000`. It also accepts an estimated fee of `0`. Both were reproduced locally.

**Required action:** parse exact units, require amount greater than zero, enforce a reasonable upper bound, validate the asset/issuer pair, and derive fee from the prepared network transaction rather than accepting an arbitrary UI string.

### Medium — trustline and issuer validation are incomplete

`requiresTrustline()` only returns false for XLM/native and true for everything else. It ignores `issuer`. `createWalletAccountLink()` validates only that the value starts with `G`, although the auth path correctly uses the Stellar SDK's checksum validation.

**Required action:** use SDK StrKey validation consistently; require a known issuer for classic Stellar assets; read the destination/source account through Horizon; verify the exact trustline, authorization flags, limits, liabilities, and available balance.

### Medium — authentication and environment hardening are incomplete

- Auth TTL/rate-limit environment values are converted with `Number()` but not validated for finite positive ranges.
- `server/.env.example` says the web app URL/domain is port 3011 even though the documented web app runs on port 3010. This makes the signed message show the wrong relying-party domain if copied as-is.
- Wallet/username status and challenge errors reveal registration state, enabling account enumeration.
- There is one global rate limit rather than stricter per-wallet/per-IP challenge, login, approval, and execution policies.
- Cross-origin production cookies use `SameSite=None`; sensitive mutation routes have no explicit Origin/CSRF enforcement beyond CORS.
- Sessions have no user-facing device list, revoke-all, or rotation policy.

**Required action:** validate configuration at startup and fail closed; correct the example domain; normalize authentication responses where enumeration is unnecessary; add scoped rate limits, explicit Origin/CSRF defenses, session management, and audit events for every approval/execution/revocation.

### Medium — server verification does not type-check the server implementation

The server `build` script only runs `node --check` on `src/index.ts` and `src/server.ts`. It does not type-check all route modules. Several tests assert source text rather than exercising real database/provider behavior.

**Required action:** add a strict server `tsconfig.json`, run `tsc --noEmit`, execute Fastify integration tests against ephemeral PostgreSQL, test migrations from empty and previous schemas, and add provider-contract tests using recorded sandbox responses.

### Low — tracked demo/test key material can be mistaken for real secrets

- `WalletAuthFlow.tsx` contains a deterministic public demo mnemonic and password.
- `tests/mobile-wallet-create.test.mjs` contains a complete Stellar secret-key fixture.
- `apps/mobile/android/app/debug.keystore` is tracked.

No populated Binance/Circle credentials were found. These items are not evidence of a live-fund leak, but automated secret scanners will flag them and users may accidentally fund the deterministic demo account.

**Required action:** never fund demo/test keys; display a prominent warning; generate ephemeral test keys where possible; document the Android key as debug-only; ensure release signing credentials are external and ignored; enable repository secret scanning and push protection.

### Low — React emits repeated SVG title warnings

The dashboard dev runtime reports that a chart's nested `<title>` receives multiple JSX children. This is not a blockchain security issue, but it pollutes diagnostics and can reduce accessible chart reliability.

**Required action:** use a single template-string child for each dynamic SVG `<title>`.

## Required implementation plan

### P0 — security and accounting correctness before any provider call

- [ ] Replace universal two-decimal/`Number` math with asset-aware `bigint` units.
- [ ] Add discriminated schemas for payment, swap, sell, and bridge requests.
- [ ] Require valid destination, asset, issuer, network, recipient, and amount bounds server-side.
- [ ] Add durable idempotency keys and atomic state transitions (`AWAITING_APPROVAL → APPROVED → EXECUTING → terminal`).
- [ ] Recheck quote expiry at execution.
- [ ] Make withdrawals atomic and idempotent.
- [ ] Separate `SUBMITTED`, `PENDING`, `SUCCEEDED`, `FAILED`, `EXPIRED`, and `UNKNOWN`; never convert uncertainty into success.
- [ ] Add CSP and production security headers; complete XSS/key-custody threat modeling.
- [ ] Harden mobile SecureStore use and eliminate production raw-secret fallbacks.
- [ ] Clear all critical/high dependency findings that affect production paths, with documented exceptions only after review.

### P1 — real Stellar Testnet rail

- [ ] Define verified asset metadata, including the official testnet USDC issuer and decimal rules.
- [ ] Add Horizon account, balance, payment history, path quote, and trustline reads.
- [ ] Add Friendbot funding only for explicit development/testnet accounts.
- [ ] Build payment and `pathPaymentStrictSend`/`pathPaymentStrictReceive` transactions from a freshly loaded sequence number.
- [ ] Show exact amount, asset/issuer, destination, path, minimum received, fee, memo, and network before signing.
- [ ] Sign only on the client/wallet boundary; never send the mnemonic/secret to PiggyBanq APIs.
- [ ] Submit the same signed XDR idempotently and persist its hash/XDR before network submission.
- [ ] Poll to a terminal ledger state; treat timeout/unknown as unresolved and reconcile later.
- [ ] Add integration tests that fund two fresh Testnet accounts, establish a USDC trustline, transfer XLM, and exercise a real available path or a deterministic no-path error.

### P2 — real yield product, not “Stellar staking”

- [ ] Select and name a real yield source; do not invent APR.
- [ ] Document custody, smart-contract, liquidity, oracle, depeg, lockup, and counterparty risks.
- [ ] Audit provider contracts/adapters and pin network contract IDs.
- [ ] Fetch APY from an authoritative source with timestamp and methodology.
- [ ] Reconcile on-chain position shares/assets and withdrawal status.
- [ ] Obtain legal/compliance review before offering yield to users.

### P3 — Binance agentic/x402 integration

- [ ] Decide which product is being integrated: external Binance MCP connection, Binance Agentic Wallet skills/session, or x402 partner APIs. They are related but not interchangeable.
- [ ] Complete Binance partner onboarding for x402 sandbox credentials.
- [ ] Keep `clientId`, sign access token, and PKCS#8 signing key server-side in a managed secret store; never expose them as `NEXT_PUBLIC_*` values.
- [ ] Implement signed `/papi/v2/b402/supported` and cache supported networks/tokens/signers.
- [ ] Implement HTTP 402 requirements using the provider's full supported `extra` object.
- [ ] Implement `/verify`, then `/settle`, then poll/reconcile the provider and on-chain transaction status.
- [ ] Verify signed provider responses and bind them to PiggyBanq user, intent, amount, recipient, network, and idempotency key.
- [ ] Use a dedicated Agentic sub-account, least-privilege scopes, low funding, daily caps, token allowlists, confirmation for writes, revoke/disconnect, and emergency-stop runbooks.
- [ ] Never share or derive the Stellar wallet secret for Binance. Cross-rail movement must be an explicit bridge/transfer workflow.

### P4 — Circle CCTP Stellar Testnet → Base Sepolia

- [ ] Pin current Circle testnet contract IDs/addresses from configuration and verify them at startup.
- [ ] Verify native USDC asset identity and source balance on Stellar.
- [ ] Encode and validate the Base Sepolia recipient exactly.
- [ ] Build the Stellar Soroban `deposit_for_burn` call for destination domain 6.
- [ ] Simulate every Soroban invocation, assemble it, show confirmation, sign locally, submit, and poll to finality.
- [ ] Extract and persist the CCTP message/hash from the confirmed source transaction.
- [ ] Fetch and verify Circle's attestation with retry/backoff and resumable state.
- [ ] Submit `receiveMessage`/mint on Base Sepolia or use a documented relayer; verify the destination receipt and USDC balance change.
- [ ] Implement recovery states for source-final/destination-pending, already-minted messages, failed relays, timeouts, and user retries.
- [ ] Do not advertise Stellar-to-BSC native USDC through CCTP.

### P5 — operations and release gates

- [ ] Correct local/production environment templates and validate every required setting at startup.
- [ ] Add strict server type-checking, integration tests, concurrency tests, provider contract tests, and end-to-end testnet tests.
- [ ] Run migrations against ephemeral PostgreSQL in CI.
- [ ] Add dependency, secret, SAST, and license scanning with blocking thresholds.
- [ ] Add structured audit events without secrets, provider reconciliation jobs, alerts, and incident response procedures.
- [ ] Replace dashboard mock values with Horizon/API data or unmistakable empty/demo states.
- [ ] Complete external smart-contract, application-security, legal, BSP/AMLC, privacy, and product-risk reviews before Mainnet.

## Acceptance criteria for “fully functional on testnet”

Do not describe PiggyBanq as fully functional until all of these are demonstrable:

- [ ] A newly generated Stellar Testnet wallet can be funded, read from Horizon, and restored safely.
- [ ] A user can create the required trustline, sign a transfer/swap, receive a real hash, and observe final ledger success and balance changes.
- [ ] A failed, expired, duplicated, timed-out, or no-path transaction is represented accurately and can be recovered without double spending.
- [ ] A Binance x402 sandbox payment completes the official supported/verify/settle lifecycle and its on-chain/provider receipt is independently verified.
- [ ] A Stellar Testnet USDC CCTP burn reaches Base Sepolia mint with source and destination explorer-verifiable hashes.
- [ ] Yield positions correspond to a named testnet contract/provider and reconcile to on-chain balances; otherwise the feature remains a simulation.
- [ ] Concurrent approve/execute/withdraw tests prove exactly-once accounting behavior.
- [ ] No critical/high exploitable production dependency findings remain.
- [ ] No private key, mnemonic, Binance token, signing key, or database credential reaches logs, API payloads, analytics, browser history, or repository history.
- [ ] The complete flow passes CI, database integration tests, mobile device tests, and an independent security review.

## Honest architectural recommendation

Use a deliberately narrow architecture:

1. Keep the Stellar wallet self-custodial and use it for Stellar payments, asset swaps, and any explicitly selected Stellar-based savings strategy.
2. Treat Binance MCP/Agentic Wallet as a separately authorized, separately funded sub-account. Do not make it the custodian or signer for the Stellar wallet.
3. Use Binance x402 only for the agentic payment use case after partner onboarding, with server-held provider credentials and strict per-user approval/idempotency controls.
4. Use Circle CCTP only for native USDC routes Circle currently supports. A swap is not a bridge: XLM must first be swapped into verified Stellar USDC, then bridged, then optionally swapped on the destination chain as a separate approved action.
5. Rename “Stake” to “Yield Lab” or “Locked Savings Forecast” until there is a real, audited source of yield. Stellar has no native proof-of-stake reward to pass through.
6. Keep Mainnet disabled. The current prototype is appropriate for demonstrations and product discovery, not real customer funds.

## Official references checked

- [Stellar path payments and trustline requirements](https://developers.stellar.org/docs/build/guides/transactions/path-payments)
- [Stellar transaction submission and finality polling](https://developers.stellar.org/docs/build/guides/transactions/submit-transaction-wait-js)
- [Stellar Soroban transaction simulation](https://developers.stellar.org/docs/build/guides/transactions/simulateTransaction-Deep-Dive)
- [Stellar web application security guidance](https://developers.stellar.org/docs/build/security-docs/securing-web-based-projects)
- [Stellar Consensus Protocol; no proof-of-stake validator rewards](https://developers.stellar.org/docs/learn/fundamentals/stellar-consensus-protocol)
- [Binance MCP Server and Agentic sub-account controls](https://developers.binance.com/en/docs/agent-native/mcp-server/agentic)
- [Binance Agentic Wallet capabilities and supported chains](https://developers.binance.com/en/docs/products/agentic-wallet/welcome)
- [Binance x402 quick start and supported/verify/settle flow](https://developers.binance.com/en/docs/products/onchainpay-x402/quick-start)
- [Circle CCTP supported chains, domains, and token restrictions](https://developers.circle.com/cctp/concepts/supported-chains-and-domains)
- [Circle CCTP on Stellar precision/address rules](https://developers.circle.com/cctp/references/stellar)
- [Circle CCTP Stellar contracts and interfaces](https://developers.circle.com/cctp/references/stellar-contracts)

## Final rating

| Dimension | Rating |
|---|---|
| Local prototype/UI | Functional with demo fallbacks |
| Wallet-auth design | Promising, requires database E2E and hardening |
| Stellar blockchain integration | Not implemented beyond helpers/configuration |
| Binance integration | Not implemented beyond sandbox naming/modeling |
| CCTP integration | Correct route model, no execution |
| Key-custody readiness | Testnet-only; not production-ready |
| Financial/accounting correctness | Blocked by precision, idempotency, race, and simulated-credit issues |
| Dependency security | Failing release gate |
| Mainnet readiness | **No-go** |
