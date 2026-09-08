# PiggyBanq Operations Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current marketing-like dashboard overview with a compact PiggyBanq financial operations layout derived from the approved reference.

**Architecture:** Keep `PortfolioDashboard.tsx` as the overview owner and retain `AgenticCommandCenter` as an isolated functional child. Add dashboard-only data and scoped CSS selectors so other routes and the landing hero are unaffected.

**Tech Stack:** Next.js 15, React 19, TypeScript, existing CSS tokens and UI primitives, Node test runner.

## Global Constraints

- Modify only `/dashboard` overview composition and scoped dashboard styles.
- Do not modify the landing-page hero.
- Preserve testnet labels and explicit approval before agentic execution.
- Preserve the current dashboard navigation and requested hash routes.
- Do not present illustrative values as live balances or guaranteed yield.

---

### Task 1: Lock the overview contract with a failing test

**Files:**
- Modify: `tests/web-agentic-dashboard.test.mjs`

**Interfaces:**
- Consumes: the existing dashboard source-contract test.
- Produces: assertions for `dashboard-kpi-grid`, `savings-lock-panel`, `savings-activity-chart`, `dashboard-quick-actions`, `dashboard-token-rates`, and `AgenticCommandCenter`.

- [ ] **Step 1: Add assertions** for the approved reference-derived structure and PiggyBanq-specific copy.
- [ ] **Step 2: Run** `node --test tests/web-agentic-dashboard.test.mjs` and confirm the new assertions fail before implementation.

### Task 2: Recompose the dashboard overview

**Files:**
- Modify: `apps/web/app/(app)/dashboard/PortfolioDashboard.tsx`
- Modify: `apps/web/app/(app)/dashboard/_data/savings-dashboard.ts`

**Interfaces:**
- Consumes: `accountLabel`, `displayName`, current route URLs, and `AgenticCommandCenter`.
- Produces: compact KPI, lock, chart, quick-action, rate, portfolio, and agentic sections.

- [ ] **Step 1: Add typed overview data** for KPI values, weekly chart points, and token rates.
- [ ] **Step 2: Replace the oversized page header and rail cards** with the approved compact operations header and four KPI cards.
- [ ] **Step 3: Add the primary lock/activity grid** with semantic headings and accessible chart labels.
- [ ] **Step 4: Add quick-action and token-rate panels** linked to Sell, Swap, Bridge, and Stake.
- [ ] **Step 5: Retain the token portfolio and command center** below the operational overview with explicit testnet language.

### Task 3: Apply the PiggyBanq reference translation

**Files:**
- Modify: `apps/web/app/globals.css`

**Interfaces:**
- Consumes: the new `operations-*` and `dashboard-*` class names.
- Produces: reference-matched desktop and mobile layouts scoped beneath `.portfolio-dashboard`.

- [ ] **Step 1: Add desktop grid styling** for the header, KPIs, primary panels, activity chart, actions, and rates.
- [ ] **Step 2: Apply the landing palette and typography** with compact card radii, tabular numerals, restrained shadows, and accessible contrast.
- [ ] **Step 3: Add responsive breakpoints** that collapse to two KPI columns and then one content column without overflow.
- [ ] **Step 4: Preserve focus-visible and reduced-motion behavior.**

### Task 4: Verify behavior and visual quality

**Files:**
- Test: `tests/web-agentic-dashboard.test.mjs`
- Test: all files under `tests/`

**Interfaces:**
- Produces: verified source, build, desktop, mobile, and interaction evidence.

- [ ] **Step 1: Run** `node --test tests/web-agentic-dashboard.test.mjs` and confirm the focused contract passes.
- [ ] **Step 2: Run** `npm test` and resolve regressions.
- [ ] **Step 3: Run** `npm run build` in `apps/web` and confirm type/build success.
- [ ] **Step 4: Start port 3010 and browser-check** `/dashboard` at 1440×1000 and 500×844.
- [ ] **Step 5: Exercise** balance visibility and agentic preview → approval → sandbox receipt.
- [ ] **Step 6: Run** the UI/UX Maxi taste review and fix material findings.
- [ ] **Step 7: Commit** the verified implementation.

## Self-review

- Spec coverage: every approved dashboard region is mapped to Tasks 1–3 and verified in Task 4.
- Placeholder scan: no TBD, TODO, or unspecified implementation steps remain.
- Type consistency: the existing `PortfolioDashboard` and `AgenticCommandCenter` interfaces are preserved.
- Scope check: landing, auth, allocation, and rail-operation page implementations remain outside this redesign.
