# Editable Budget Allocations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build editable, createable, and reorderable budget allocations on web and Android.

**Architecture:** Persist budget category order in the backend with `sortOrder`, expose authenticated update/delete/reorder routes, extend the web allocation manager with drag/drop and inline edit state, and add adaptive local edit controls to the Android dashboard.

**Tech Stack:** Prisma, Fastify, Zod, Next.js React client components, CSS grid, React Native, Expo, Node tests.

## Global Constraints

- Budget allocation edits are planning-only and must not move funds.
- Every backend write must authenticate, validate, check ownership, and return a recalculated plan.
- Web drag/drop must have accessible move buttons for keyboard and mobile users.
- Android controls must adapt to small screens without fixed-width overflow.
- Do not add a drag/drop dependency unless native controls cannot satisfy the request.

---

### Task 1: Backend Editable Budget Routes

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20260823093000_budget_category_sort_order/migration.sql`
- Modify: `server/src/modules/budget/routes.ts`
- Modify: `apps/web/app/lib/wallet-auth-api.ts`

**Steps:**
- [x] Add `sortOrder Int @default(0)` to `BudgetCategory`.
- [x] Add a migration for the new column.
- [x] Create Zod schemas for update and reorder payloads.
- [x] Add authenticated ownership lookup for categories and plans.
- [x] Add update, delete, and reorder routes.
- [x] Recalculate `BudgetPlan.totalMinor` from its categories after category writes.
- [x] Add web API helpers and `sortOrder` to `BudgetPlan.categories`.

### Task 2: Web Editable Allocation Board

**Files:**
- Modify: `apps/web/app/(app)/dashboard/allocations/AllocationsManager.tsx`
- Modify: `apps/web/app/globals.css`

**Steps:**
- [x] Replace the saved allocations table with responsive allocation cards.
- [x] Add inline edit state for category, amount, and currency.
- [x] Add create, save, cancel, delete, move up, and move down controls.
- [x] Add native drag/drop handlers that persist order through the reorder API.
- [x] Add empty, saving, and error status copy.
- [x] Add responsive CSS for one, two, and three column layouts.

### Task 3: Android Editable Allocation Cards

**Files:**
- Modify: `apps/mobile/src/dashboard/DashboardHome.tsx`

**Steps:**
- [x] Add local allocation state seeded from the current dashboard cards.
- [x] Add an adaptive create form.
- [x] Add inline edit, save, cancel, delete, move up, and move down controls.
- [x] Use themed colors and wrapping layouts for small phone widths.

### Task 4: Tests And Verification

**Files:**
- Modify: `tests/web-dashboard-features.test.mjs`
- Modify: `tests/mobile-wallet-create.test.mjs`

**Steps:**
- [x] Assert backend routes and API helpers exist.
- [x] Assert web drag/drop, move controls, edit controls, and responsive CSS exist.
- [x] Assert Android editable allocation controls exist.
- [x] Run `pnpm test`.
- [x] Run `pnpm build`.
