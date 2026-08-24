# Theme APR Methods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make light/dark theme behavior visible on web and Android, and show Crypto Lending, Liquidity Mining / Yield Farming, and Staking as APR education options in both apps.

**Architecture:** Web keeps theme choice in `localStorage` and applies `data-resolved-theme` before hydration, while dashboard CSS consumes theme variables. Android uses a small theme context with system/light/dark choices and passes the resolved palette into dashboard components.

**Tech Stack:** Next.js app router, CSS variables, React Native, Expo Router, focused Node tests.

## Global Constraints

- The three APR methods are display/education options only; do not imply guaranteed yield or activate custody.
- Keep self-custodial copy visible near earning actions.
- No silent signing; transaction actions must remain locked behind review copy.
- Use deterministic code and static data for UI content, not LLM-generated runtime output.

---

### Task 1: Web Theme Bootstrap And Variables

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `tests/web-dashboard-features.test.mjs`

**Steps:**
- [x] Add an inline bootstrap script that reads `piggybanq-theme`, resolves system preference, and sets `data-theme` plus `data-resolved-theme` before paint.
- [x] Replace savings dashboard hard-coded surface/text colors with CSS variables under light and dark theme roots.
- [x] Add test assertions for the bootstrap script and theme variables.

### Task 2: Web APR Method Cards

**Files:**
- Modify: `apps/web/app/(app)/dashboard/_data/savings-dashboard.ts`
- Modify: `apps/web/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/app/(app)/dashboard/pockets/page.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `tests/web-dashboard-features.test.mjs`

**Steps:**
- [x] Add `earningAprMethods` with Crypto Lending, Liquidity Mining / Yield Farming, and Staking copy.
- [x] Render the methods on overview and pockets pages.
- [x] Style responsive APR cards with theme-aware colors and disclaimer copy.
- [x] Test that all three methods and the no-guarantee/self-custodial guardrails are present.

### Task 3: Android Theme And APR Cards

**Files:**
- Create: `apps/mobile/src/theme.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/src/dashboard/DashboardHome.tsx`
- Modify: `tests/mobile-wallet-create.test.mjs`

**Steps:**
- [x] Add a mobile theme provider with `system`, `light`, and `dark` choices.
- [x] Use the resolved palette throughout the dashboard screen and bottom navigation.
- [x] Add dashboard theme selector controls.
- [x] Render the three APR method cards in the Android dashboard.
- [x] Test that the provider, selector, dark palette, and APR method copy exist.
