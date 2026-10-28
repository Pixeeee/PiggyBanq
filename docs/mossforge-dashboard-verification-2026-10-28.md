# Dashboard theme verification — 28 October 2026

Implemented the approved [dashboard design](mossforge-dashboard-design.md): Mossforge's public paper/panel/pill language adapted to PiggyBanq pink, cream and plum. This is an original adaptation of the [public reference](https://uiverse.io/ui-kits/mossforge), not an import of its sign-in-gated source package. No dependencies were added.

## Scope and implementation

Web uses `app/dashboard-mossforge.css` scoped to the authenticated shell and explicit dashboard menu/header markers. Shared cards, fields, selectors, badges, alerts, buttons, navigation and transaction/receive dialogs inherit the family across home, goals, allocations, pockets/swap/Yield Lab, agent/x402 and profile. Superseded raised-button rules were removed.

Native uses the same visual decisions through its dashboard-only palette and existing banking components. The `/dashboard` pathname covers all local dashboard tabs. Auth keeps the previous palette and component geometry. Native field focus handlers continue forwarding caller callbacks; disabled handlers, text scaling and reduced motion remain supported.

No changes were made to signing, approvals, spending limits, receipts, sessions, planning persistence or backend/database code. Landing and recovery behavior are covered by regressions. No test payments were made.

## Evidence

- Production Next.js build passed, including TypeScript validation.
- Unit suite: 149 passed, 9 optional skipped, 0 failed.
- Native TypeScript check passed.
- Standalone Android release APK and separate instrumentation APK built successfully.
- Browser checks passed for home plus all five feature routes at 390px and 1440px, in both light and dark themes: no horizontal page overflow, visible input focus, consistent design family. Home checks retain exact fixture totals, balance privacy, action alignment and send/receive dialogs.
- The first fast multi-route runs hit the hosted API's session request limit at the last profile page. The QA script now spaces route requests by three seconds; the paced full run passed without weakening application rate limits.
- Recovery-copy success/failure, mandatory confirmation and numbered words passed.
- Landing/header/media checks passed at 320, 390, 430 and 1440 pixels, plus reduced-motion and video-failure fallbacks.
- Android API 33 QA emulator: the new release APK passed unlock, Home, Save, Send, Swap, Agent, Sync, You, light/dark switches and receive sheets with system reduced motion enabled. The separate instrumentation test performs no payments in this mode and does not reveal wallet backups.
- Read-only diff review found no actionable regression; `git diff --check` passed.

Browser layout data is intercepted only inside the QA browser. The tests use disposable QA identities, not the user's wallet. Screenshots are available in the ignored `qa-screenshots/` folder, including `clean-dashboard-preview.png`, `clean-dashboard-phone.png`, and `mossforge-<theme>-<route>.png`.

## Android artifact

`apps/mobile/android/app/build/outputs/apk/release/app-release.apk` — 71,467,953 bytes.

SHA256: `17e9aa3a637c466ce7ee3679ff72f87234be2e42c2a69832d4ed0079edc16df3`.

This review/Testnet build uses the existing development signing key. It is not a store-signed release. Updating an existing install retains its data; do not uninstall a wallet without a verified backup.

## Practical limits

Web screenshots were visually inspected; native checks used the actual Android accessibility/instrumentation flow. No native visual screenshot review, physical-device large-text check, iOS build, biometric/secure-hardware test or hardware performance measurement is claimed. Screen-capture protections were not disabled. Existing dependency advisory exceptions and the GitHub Actions billing lock remain as documented previously.

## Reproduce

Use Node 24 and pnpm 11.7.0. From the repo root:

```bash
pnpm test
API_BASE_URL=https://piggybanq-api.onrender.com pnpm --filter @piggybanq/web build
pnpm --filter @piggybanq/mobile build
API_BASE_URL=https://piggybanq-api.onrender.com pnpm --filter @piggybanq/web exec next start --hostname 127.0.0.1 --port 3010
```

Against that running server, run `node tests/release-clean-dashboard.mjs`, `node tests/release-recovery-controls.mjs` and `node tests/release-site-experience.mjs`. Chrome is expected at `/usr/bin/google-chrome`. `RELEASE_WEB_URL` selects a different origin.

For the existing disposable Android QA emulator, use the separate instrumentation APK and `-e reducedMotionCheck true`. The default instrumentation mode exercises payments and is deliberately outside this theme verification.
