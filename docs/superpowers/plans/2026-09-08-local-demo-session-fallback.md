# Local Demo Session Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Open demo account` reliably open the local dashboard without PostgreSQL while preserving production wallet authentication.

**Architecture:** Add a development-only same-origin session-cookie route and teach the server-side dashboard guard to recognize that cookie as a fixed demo user. Retain the signed Fastify flow as the primary path and use the local session only for backend-unavailable errors.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Node test runner.

## Global Constraints

- Never bypass production wallet authentication.
- Never store a demo mnemonic or secret key in a cookie.
- Keep the existing Stellar signed challenge flow as the primary path.
- Clear the demo session during logout.

---

### Task 1: Specify the fallback contract

**Files:**
- Modify: `tests/web-wallet-create.test.mjs`

**Interfaces:**
- Consumes: `WalletAuthFlow`, `requireWalletSession`, and `DashboardLogoutButton` source.
- Produces: regression assertions for the development-only demo session.

- [ ] Add assertions for `createLocalDemoSession`, backend-unavailable filtering, `piggybanq_demo_session`, production guards, and demo-session logout.
- [ ] Run `node --test tests/web-wallet-create.test.mjs` and confirm it fails before implementation.

### Task 2: Implement the development-only demo session

**Files:**
- Create: `apps/web/app/api/demo-session/route.ts`
- Modify: `apps/web/app/lib/wallet-auth-api.ts`
- Modify: `apps/web/app/components/WalletAuthFlow.tsx`
- Modify: `apps/web/app/(app)/dashboard/_lib/session.ts`
- Modify: `apps/web/app/components/DashboardLogoutButton.tsx`

**Interfaces:**
- Produces: `createLocalDemoSession(): Promise<void>` and `clearLocalDemoSession(): Promise<void>`.
- Cookie: `piggybanq_demo_session=active`, HTTP-only, SameSite=Lax, development only.

- [ ] Add POST and DELETE handlers guarded by `process.env.NODE_ENV !== 'production'`.
- [ ] Add same-origin client helpers for creating and clearing the cookie.
- [ ] Fall back only for `TypeError`, `Failed to fetch`, `Request failed.`, or `Authentication service failed.`.
- [ ] Return a fixed safe demo user from `requireWalletSession` only in development.
- [ ] Clear both backend and demo sessions on logout.
- [ ] Run the focused test and confirm it passes.

### Task 3: Verify runtime and regressions

**Files:**
- Test: `tests/web-wallet-create.test.mjs`
- Test: `tests/web-secure-wallet-auth.test.mjs`

**Interfaces:**
- Consumes: the completed fallback flow.
- Produces: evidence that local demo access works with port 4000 offline.

- [ ] Run `corepack pnpm test`.
- [ ] Run `corepack pnpm --filter @piggybanq/web build`.
- [ ] Restart the development server after the build.
- [ ] POST `/api/demo-session`, capture the cookie, and request `/dashboard` with that cookie while port 4000 is offline.
- [ ] Confirm production build output still excludes the visible demo button and the demo endpoint rejects production use.
- [ ] Commit the implementation.
