# Web Portfolio Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the web overview with a dark-first PiggyBanq crypto portfolio dashboard.

**Architecture:** Keep the authenticated server dashboard page, render a client portfolio component for balance visibility, expand shared static dashboard data, and restyle the dashboard shell with responsive dark-first CSS.

**Tech Stack:** Next.js app router, React client component, CSS grid/flex, existing Node tests.

## Global Constraints

- Do not use MetaMask logos, fox icon, brand names, or proprietary assets.
- Do not introduce live trading, custody, or silent signing.
- Keep PiggyBanq colors visible: rose, peach, lilac, charcoal, near-black, and blue action accents.
- Dashboard must adapt to desktop and mobile.

---

### Task 1: Portfolio Data And Component

**Files:**
- Modify: `apps/web/app/(app)/dashboard/_data/savings-dashboard.ts`
- Create: `apps/web/app/(app)/dashboard/PortfolioDashboard.tsx`
- Modify: `apps/web/app/(app)/dashboard/page.tsx`

**Steps:**
- [x] Add portfolio action labels, tabs, filters, and token rows to dashboard data.
- [x] Create a client component with balance visibility toggle.
- [x] Render title, action pills, account summary, tabs, filters, and token table/cards.
- [x] Keep self-custodial safety copy in the overview.

### Task 2: Shell Navigation

**Files:**
- Modify: `apps/web/app/(app)/dashboard/_components/DashboardShell.tsx`

**Steps:**
- [x] Replace sidebar labels with requested portfolio navigation items.
- [x] Keep existing dashboard routes for Dashboard, Tokens/Pockets, Stake/Pockets, Send & Receive/Profile, and planning pages.
- [x] Add generic icon cases for the expanded nav.

### Task 3: Responsive Styling

**Files:**
- Modify: `apps/web/app/globals.css`

**Steps:**
- [x] Make dashboard shell dark-first.
- [x] Style portfolio action pills, card, tabs, filters, token table, and mobile card layout.
- [x] Preserve light theme support through existing variables.
- [x] Ensure sidebar is fixed on desktop and compact horizontal on mobile.

### Task 4: Tests And Verification

**Files:**
- Modify: `tests/web-dashboard-features.test.mjs`
- Modify: `tests/web-routing-ui.test.mjs`

**Steps:**
- [x] Assert dashboard portfolio labels, nav labels, balance toggle, filters, and token columns.
- [x] Assert no prohibited MetaMask/fox references.
- [x] Run `pnpm test`.
- [x] Run `pnpm build`.
