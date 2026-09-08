# PiggyBanq Agentic Payments, Stellar Yield, and Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a fully usable local sandbox for Stellar yield/swap, Stellar-to-Base CCTP bridging, Binance x402 agentic payments, and a landing-aligned dashboard experience.

**Architecture:** Keep financial logic in pure shared modules, expose authenticated Fastify intent routes backed by additive Prisma records, and provide a browser-local sandbox fallback for the development demo session. Compose the UI from reusable shadcn-style primitives using the existing CSS system, with explicit preview, approval, execution, and receipt states.

**Tech Stack:** Next.js 15, React 19, TypeScript, Fastify 5, Prisma/PostgreSQL, Zod, Stellar SDK 16, Node test runner, CSS design tokens.

## Global Constraints

- Stellar remains the wallet, swap, savings, and yield rail.
- Circle CCTP is limited to native USDC between Stellar Testnet domain 27 and Base Sepolia domain 6.
- Binance owns x402 and Agentic Wallet payment functions only.
- Local sandbox mode must work without API credentials or a running database.
- Every mutation requires preview and explicit user approval.
- Never store private keys, mnemonics, Binance tokens, or signing credentials in application records or browser sandbox history.
- Never offer Stellar-to-BSC USDC as a supported CCTP route.
- Testnet and simulated returns must be labeled clearly.
- Do not modify the landing-page hero.

---

### Task 1: Add shared cross-rail intent contracts and safety logic

**Files:**
- Create: `packages/types/src/agentic.ts`
- Create: `packages/stellar-core/src/cross-rail.ts`
- Modify: `packages/types/package.json`
- Modify: `packages/stellar-core/package.json`
- Test: `tests/agentic-cross-rail.test.mjs`

**Interfaces:**
- Produces: `AgenticActionType`, `AgenticIntentPreview`, `parseAgentCommand()`, `createSandboxIntentPreview()`, `approveSandboxIntent()`, `executeSandboxIntent()`.

- [ ] **Step 1: Write failing tests** for supported commands, a 20 USDC policy cap, approval-before-execute, quote expiry, Stellar domain 27 → Base domain 6, and BSC rejection.
- [ ] **Step 2: Run** `node --test tests/agentic-cross-rail.test.mjs` and confirm missing-module failure.
- [ ] **Step 3: Implement** discriminated unions for `X402_PAYMENT`, `STELLAR_SWAP`, `CCTP_BRIDGE`, and `STELLAR_SELL`; use integer minor units and deterministic sandbox IDs.
- [ ] **Step 4: Implement** command parsing for `Pay <amount> USDC to <recipient>`, `Swap <amount> XLM to USDC`, and `Bridge <amount> USDC to Base`; return actionable validation errors for unsupported commands.
- [ ] **Step 5: Run** `node --test tests/agentic-cross-rail.test.mjs` and confirm all new cases pass.

### Task 2: Add additive agent-action persistence and authenticated APIs

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20260908123000_agentic_payment_intents/migration.sql`
- Create: `server/src/modules/agentic/routes.ts`
- Create: `server/src/modules/agentic/sandbox-provider.ts`
- Modify: `server/src/server.ts`
- Test: `tests/agentic-server-contract.test.mjs`

**Interfaces:**
- Produces: `GET /agentic/capabilities`, `POST /agentic/intents/preview`, `POST /agentic/intents/:id/approve`, `POST /agentic/intents/:id/execute`, and `GET /agentic/intents`.

- [ ] **Step 1: Write failing contract tests** for route registration, authentication, Zod request validation, stable error codes, and absence of secret fields.
- [ ] **Step 2: Run** `node --test tests/agentic-server-contract.test.mjs` and confirm failure.
- [ ] **Step 3: Add** `AgentAction` and `ProviderReceipt` with user ownership, JSON request/policy payloads, status indexes, timestamps, and cascade behavior.
- [ ] **Step 4: Implement** the sandbox provider and thin Fastify handlers using `requireAuthUser`; wrap approval/execution writes in Prisma transactions.
- [ ] **Step 5: Register** the new routes and extend logger redaction for provider credential names.
- [ ] **Step 6: Run** `pnpm --filter @piggybanq/server exec prisma validate` and the new server contract test.

### Task 3: Build the local sandbox store and shadcn-style primitives

**Files:**
- Create: `apps/web/app/lib/agentic-sandbox.ts`
- Create: `apps/web/app/components/ui/DashboardPrimitives.tsx`
- Modify: `apps/web/app/lib/wallet-auth-api.ts`
- Test: `tests/web-agentic-dashboard.test.mjs`

**Interfaces:**
- Produces: browser-safe `previewAgenticIntent()`, `approveAgenticIntent()`, `executeAgenticIntent()`, `listAgenticIntents()` with API-first/local-fallback behavior; `UiCard`, `UiBadge`, `UiAlert`, `UiTabs`, and `UiProgress`.

- [ ] **Step 1: Write failing source-contract tests** for local fallback, no secret persistence, primitives, status variants, and API paths.
- [ ] **Step 2: Run** the test and confirm missing-module failure.
- [ ] **Step 3: Implement** a non-sensitive development store under a versioned localStorage key and use shared pure domain functions for all state transitions.
- [ ] **Step 4: Implement** accessible reusable primitives without adding Tailwind solely for this release.
- [ ] **Step 5: Run** the web agentic dashboard test.

### Task 4: Enhance the dashboard and add the agent command/payment center

**Files:**
- Create: `apps/web/app/(app)/dashboard/AgenticCommandCenter.tsx`
- Modify: `apps/web/app/(app)/dashboard/PortfolioDashboard.tsx`
- Modify: `apps/web/app/(app)/dashboard/_components/DashboardShell.tsx`
- Modify: `apps/web/app/(app)/dashboard/_data/savings-dashboard.ts`
- Test: `tests/web-agentic-dashboard.test.mjs`

**Interfaces:**
- Consumes: sandbox store and UI primitives.
- Produces: command preview, policy summary, approval, execution receipt, rail status, and recent activity.

- [ ] **Step 1: Extend failing tests** for command examples, provider separation, explicit approval, and testnet/sandbox badges.
- [ ] **Step 2: Implement** the command center as a client component with idle, parsing, preview, approved, executing, success, and error states.
- [ ] **Step 3: Replace** dashboard summary composition with warm cards, prominent total, rail health, primary actions, and recent activity while preserving authenticated wallet context.
- [ ] **Step 4: Update** sidebar names to `Overview`, `Allocations`, `Sell`, `Swap`, and `Stake`, retaining the requested URLs.
- [ ] **Step 5: Run** the focused web tests.

### Task 5: Make Sell, Swap, Bridge, and Stake functional in the pockets workspace

**Files:**
- Create: `apps/web/app/(app)/dashboard/pockets/RailOperations.tsx`
- Modify: `apps/web/app/(app)/dashboard/pockets/PocketsManager.tsx`
- Modify: `apps/web/app/(app)/dashboard/pockets/page.tsx`
- Modify: `apps/web/app/lib/wallet-auth-api.ts`
- Test: `tests/web-agentic-dashboard.test.mjs`
- Test: `tests/web-dashboard-features.test.mjs`

**Interfaces:**
- Produces hash-addressable `sell`, `swap`, `bridge`, and `stake` tabs with preview/confirm/receipt flows.

- [ ] **Step 1: Add failing tests** for section IDs, hash-aware tabs, XLM/USDC quote details, CCTP route labels, BSC rejection copy, and sourced yield language.
- [ ] **Step 2: Implement** hash synchronization using `hashchange`, semantic tab roles, and URL updates.
- [ ] **Step 3: Implement** sell, swap, and bridge forms using the common intent lifecycle; show amount, output, minimum received, slippage, fee, destination, and expiry.
- [ ] **Step 4: Refine** Stake into grouped creation, forecast, saved positions, and safety sections while preserving every existing mutation call.
- [ ] **Step 5: Run** both focused test files.

### Task 6: Refine allocations and apply the landing-aligned dashboard theme

**Files:**
- Modify: `apps/web/app/(app)/dashboard/allocations/page.tsx`
- Modify: `apps/web/app/(app)/dashboard/allocations/AllocationsManager.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `tests/web-dashboard-features.test.mjs`

**Interfaces:**
- Preserves allocation CRUD/reorder while changing presentation only.

- [ ] **Step 1: Add failing assertions** for landing palette tokens, warm shadcn-like primitives, visible focus, responsive grids, and allocation state classes.
- [ ] **Step 2: Recompose** the allocations page around a concise header, overview metrics, editable board, and secondary activity context.
- [ ] **Step 3: Append** a scoped dashboard theme so the hero and authentication surfaces are untouched; use white/ivory, brown ink, rose action, peach accent, warm borders, tabular numbers, and restrained shadows.
- [ ] **Step 4: Add** responsive rules for 1280px, 900px, and 560px plus reduced-motion handling.
- [ ] **Step 5: Run** dashboard and routing tests.

### Task 7: Verify behavior, migration safety, build, and visual quality

**Files:**
- Modify: `README.md`
- Modify: `server/.env.example`
- Test: all files under `tests/`

**Interfaces:**
- Documents optional Binance x402 sandbox credentials and confirms local fallback operation.

- [ ] **Step 1: Document** local usage, feature flags, sandbox limitations, provider responsibilities, and the Stellar-to-Base-only bridge rule.
- [ ] **Step 2: Run** `pnpm test` and fix every regression.
- [ ] **Step 3: Run** `pnpm --filter @piggybanq/server exec prisma validate`.
- [ ] **Step 4: Run** `pnpm --filter @piggybanq/web build`.
- [ ] **Step 5: Start or reuse** the local web server and verify `/dashboard`, `/dashboard/allocations`, `/dashboard/pockets#sell`, `/dashboard/pockets#swap`, and Stake at desktop and mobile widths.
- [ ] **Step 6: Exercise** command → preview → approval → receipt for payment, swap, and bridge; exercise allocation and pocket controls; capture any provider-degraded states.
- [ ] **Step 7: Run** UI/UX Maxi taste review for `warm fintech dashboard cards command center` and fix material anti-patterns.
- [ ] **Step 8: Re-run** the full tests and web build after visual fixes.

## Self-review

- Spec coverage: all provider boundaries, requested routes, action states, responsive states, and verification gates map to Tasks 1–7.
- Placeholder scan: no task delegates unspecified error handling or tests; each task names concrete contracts and checks.
- Type consistency: the shared intent lifecycle is the single contract used by backend, local fallback, and UI.
- Scope guard: no production settlement, Soroban contract deployment, Binance trading, BSC bridge, or hero modification is included.
