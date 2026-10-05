# Android savings design implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement these tasks in this session.

**Goal:** Replace the existing Android layout with a clean banking and savings experience, retaining the original interactive piggy GIF and verified wallet behavior.
**Architecture:** Keep wallet storage, lock/sign/reconciliation logic and local planning records. Redesign the existing four tabs with shared native controls, a compact overview, expandable plan editors and an animated mascot. Use React Native Animated and the already-installed Expo icon library.
**Tech stack:** Expo54, React Native0.81, TypeScript, Animated, Ionicons.
**Spec:** The design brief below; user requested research and direct implementation together. Implement inline under the existing fix branch; no redundant approval checkpoint.

## Design brief and research (2026-10-05)
Current official published screenshots inspected: MariBank PH (Google Play, Sep23 update), GoTyme Philippines (Google Play, Sep30 update), Tarsi developer site and Play listing. References:
- https://play.google.com/store/apps/details?hl=en-US&id=ph.seabank.seabank
- https://play.google.com/store/apps/details?hl=en_US&id=ph.com.gotyme
- https://tarsi.pocketdevs.ph/
Reuse the patterns: prominent balance, short action row, whitespace, distinct savings goals/progress and simple bottom navigation. Create an original PiggyBanq layout and palette, using the existing assets/piggy.gif.

Home wireframe: compact greeting + profile -> Testnet balance/asset selector + visibility toggle -> Send / Receive / Save / Refresh actions -> interactive piggy encouragement -> savings goal previews -> recent ledger activity.
Save wireframe: heading + local-plan label -> Goals / Budget segmented control -> summary + progress/list cards -> explicit add button -> editor sheet/form only when opened.
Send wireframe: heading -> short network/status note -> destination/amount/asset/memo inputs -> Review -> full immutable details + password + Confirm; all existing signing guards retained.
You wireframe: profile/address -> receive/copy actions -> security -> theme picker -> lock action. Unlock/onboarding use the same clean visual language.
Colors: warm-white canvas, dark ink, coral accent, soft rose/green surfaces. Rounded cards20–24dp, 16–20dp gutters, 48dp or larger tap controls, readable system typography. Bottom navigation sits outside the scroll area and above system insets.
Piggy: original animated GIF with tap spring/reaction and saved-progress celebration; reduced-motion disables extra motion and uses static existing artwork. No autonomous signatures or advertised interest.

## Constraints and review focus
- Never alter keys/credential storage, backup requirement, background locks or signing checks.
- Ledger balances retain asset units and precision; absent/failed reads show unavailable, not invented balances.
- Goal progress is a local planning record, not an on-chain deposit; never combine PHP plans with XLM as a total balance.
- Small screens, keyboard and large text must scroll; no buttons behind bottom navigation.
- Reduced motion, accessibility labels, selected state and dark mode remain supported.

## Task1: Presentation and reusable native controls
- [x] Add behavioral tests for precise balance formatting and capped goal progress; see RED, implement presentation.ts, see GREEN.
- [x] Update the palette and shared banking controls; add direct dependency on installed Ionicons.
- [x] Implement interactive piggy with original GIF, reduced-motion and successful-save reactions.

## Task2: Dashboard and plans
- [x] Keep existing wallet/session/ledger safety logic, replace view layout and navigation.
- [x] Implement receive sheet, balance hide/show, live refresh, goal previews and ledger activity rows.
- [x] Replace long always-open plan editors with goals/budgets lists and explicit add/edit controls. Saving failures retain drafts; delete has a confirmation; progress remains device-local.
- [x] Preserve transaction review fields/password/hash persistence/reconciliation and restyle the Send and security screens.

## Task3: Access screens and design proof
- [x] Restyle unlock and entry screens with matching palette and original mascot; keep backup/import/create behavior.
- [x] Produce a clean wireframe artifact and inspect the actual native layout on the emulator, including light/dark, tap reaction, small-screen scrolling, plan edits, receive and transaction review/cancel.
- [x] Run pnpm test, mobile typecheck, Expo/native release build and APK verification; obtain one fresh whole-change review and fix important issues.
- [ ] Install the final APK in the visible emulator, retain test wallet/plans, refresh user-facing APK/source and verification notes.

## Verification record
Full suite: 124 tests, 119 pass, 5 opt-in integrations skipped, zero failures. Mobile TypeScript and production native assembleRelease passed. Android13 384x640dp emulator checks cover balance privacy, public receive sheet, original GIF/tap reactions, reduced-motion tap behavior, creation/progress updates, retained budget, light/dark, full transaction review/cancel, and cold restart/password/progress persistence. Fresh review found three issues (status visibility, accessible values, and editable drafts during saves), all addressed. Native testing also caught and fixed the review scroll position. Final APK remains development-signed and Testnet-only. Design artifact: docs/design/android-savings-wireframe.svg.
