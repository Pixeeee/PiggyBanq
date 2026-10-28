# Mossforge dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Apply the approved pink/cream Mossforge adaptation to web and native dashboard screens.
**Architecture:** Reuse dashboard-scoped CSS variables, existing shared primitives and native theme/components. Change presentation at shared seams; retain routes and all payment/session/planning logic.
**Tech Stack:** Existing Next.js, CSS, React Native/Expo and Playwright; no new dependencies.
**Spec:** `docs/mossforge-dashboard-design.md` (approved by user).

## Global Constraints
- Keep PiggyBanq pink and cream, with deep plum for prominent panels and rose for actions.
- Keep the existing light/dark theme choice.
- Preserve 44–48px touch targets, text scaling, reduced motion and light/dark contrast.
- Keep the sunny landing page and authentication/recovery screens outside this dashboard-only redesign.
- No database, infrastructure, credential or payment-protocol changes.

## Review Focus
- Phone layouts: long labels/addresses must wrap without page overflow.
- Dark dialogs: controls and selected states must remain readable.
- Keyboard/disabled actions: visible focus and no disabled payment bypass.
- Native sheets/text scaling: no fixed-height clipping or lost handlers.
- Theme scope: dashboard changes must not restyle landing/auth pages.

### Task 1: Web dashboard family
Files: `apps/web/app/dashboard-banking.css`, `apps/web/app/site-experience.css`, `apps/web/app/components/SiteNavigation.tsx`, new `apps/web/app/dashboard-mossforge.css`, `apps/web/app/layout.tsx`, `tests/release-clean-dashboard.mjs`.
Consumes existing shell, UI primitive and dialog classes; produces a dashboard-scoped visual layer with no changed component contracts.
- [x] Add browser assertions for cream canvas, pill actions, flat panels, dark dialog surfaces and consistent all-route fields/controls; run against current build to observe the intended style failure.
- [x] Update shared styling and dashboard-only menu marker. Remove superseded raised-action declarations rather than retaining competing rules.
- [x] Build and run dashboard regressions and every route at phone/desktop widths in both themes, checking overflow and focus.

### Task 2: Native family
Files: `apps/mobile/src/theme.tsx`, `apps/mobile/src/ui/banking.tsx`, `apps/mobile/src/ui/NativeSiteNavigation.tsx`, `apps/mobile/src/dashboard/DashboardHome.tsx`, existing native preview/check scripts.
Consumes unchanged palette/component interfaces; produces consistent paper/plum/rose surfaces, pills, fields, cards and sheets.
- [x] Update dashboard palette and shared styles; keep auth's independent palette intact.
- [x] Update overview wallet and navigation exceptions to match the shared family, without touching transaction/planning code.
- [x] Run native TypeScript checks and existing native preview when available; inspect screenshots. Record any unavailable physical-device checks.

### Task 3: Verify and ship
Files: verification note under `docs/`, relevant tests.
- [x] Run unit suite, production build, native type check and relevant browser regressions. Confirm no source changes to signing/data paths.
- [x] Inspect web screenshots in both themes and native preview. Check landing/recovery regressions for scope leakage.
- [x] Commit and push `HEAD:main`; check Vercel and live page if ready, preserving unrelated build queues.

## Execution notes
Ruling: implement inline under the user's explicit “Approve and implement” authorization; no further plan approval is needed. Native checks use actual Android instrumentation; screen capture remains protected, so no native visual screenshot verification is claimed. Final diff review found no actionable regression.

Delivery: web/native implementation pushed as `971b4c9`; Vercel reports pending. Live verification remains conditional on deployment completion. The tracked Android smoke test now covers every main tab and both themes without payments.
