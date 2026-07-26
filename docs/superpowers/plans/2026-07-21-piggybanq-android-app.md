# PiggyBanq Android App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a usable Android-first Expo app surface with wallet activation and Stellar transaction safety gates.

**Architecture:** Keep React Native UI in `apps/mobile/app/index.tsx`, move testable mobile state guards into `apps/mobile/src/wallet/local-wallet.ts`, and reuse `packages/stellar-core` for blockchain guardrails. Avoid new dependencies so the current workspace can build offline.

**Tech Stack:** Expo Router, React Native, Expo SecureStore, Expo LocalAuthentication, Stellar SDK, Node test runner.

## Global Constraints

- PiggyBanq remains self-custodial.
- Mobile must stay TESTNET-only.
- No hidden signing.
- No server custody of secret keys or backup material.
- No new downloads are required for this pass.

---

### Task 1: Mobile Wallet Activation Guards

**Files:**
- Modify: `apps/mobile/src/wallet/local-wallet.ts`
- Modify: `tests/mobile-wallet-create.test.mjs`

**Interfaces:**
- Produces: `getWalletActivationStatus(state): 'ready' | 'needs_wallet' | 'needs_backup' | 'needs_secure_store'`
- Produces: `createMobilePaymentReview(input): MobilePaymentReview`

- [ ] Add failing Node tests that expect backup gating, confirmation copy, trustline warning, and pending polling copy.
- [ ] Run `npm.cmd test -- tests/mobile-wallet-create.test.mjs` and verify it fails because the new functions are missing.
- [ ] Implement the pure guard functions in `local-wallet.ts`.
- [ ] Run `npm.cmd test -- tests/mobile-wallet-create.test.mjs` and verify it passes.

### Task 2: Android App UI

**Files:**
- Modify: `apps/mobile/app/index.tsx`

**Interfaces:**
- Consumes: `MobileStoredWallet`, `createAndStoreLocalWallet`, `loadStoredLocalWallet`
- Consumes: `canActivateWallet`, `getWalletActivationStatus`, `createMobilePaymentReview`

- [ ] Add failing static tests that expect bottom navigation, backup action, Android savings sections, and transaction confirmation UI text.
- [ ] Run `npm.cmd test -- tests/mobile-wallet-create.test.mjs` and verify it fails for missing UI text.
- [ ] Replace the scaffold screen with a mobile app shell: overview, pockets, goals, security, and payment review.
- [ ] Run `npm.cmd test -- tests/mobile-wallet-create.test.mjs` and verify it passes.

### Task 3: Verification

**Files:**
- Verify: `apps/mobile`
- Verify: `packages/stellar-core`

**Interfaces:**
- Verifies mobile TypeScript through `pnpm --filter @piggybanq/mobile build`
- Verifies repository tests through `npm.cmd test`

- [ ] Run focused mobile test.
- [ ] Run mobile TypeScript build.
- [ ] Run full Node test suite.
- [ ] Review final diff for secret leakage, mainnet drift, hidden signing, missing trustline warning, and `PENDING` success mistakes.

## Self-Review

- Spec coverage: wallet activation, Android layout, transaction confirmation, trustline warning, and polling are covered.
- Placeholder scan: no TBD/TODO placeholders are present.
- Type consistency: produced functions are consumed by the UI and tests with the same names.
