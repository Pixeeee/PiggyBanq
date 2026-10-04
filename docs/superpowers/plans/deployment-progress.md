# Deployment progress

Plan: 2026-10-04-deployment-readiness.md
Branch: fix/deployment-readiness

All five phases completed: web authentication/proxy; backend lifecycle and database release checks; production browser verification and deployment instructions; Android wallet/planning/ledger functionality; final independent review and deliverables. Work followed the user-authorized order: web first, Android afterward.

Web proof: full workspace production builds/typechecks; all six Prisma migrations on a fresh PostgreSQL database, repeat migration with no pending changes and empty schema diff; signed authentication, replay rejection, CRUD, ownership and logout with the real database; production HTTPS browser signup, secure cookie, reload, persistent allocations/profile, responsive navigation, failed logout/retry and new-browser password recovery. A separate API outage check preserved the dashboard URL/cookie and rendered a retry page. Direct and API Stellar Testnet transaction tests passed.

Android proof: standalone release APK built and signature verified; installed/updated on an Android 13 emulator. Legacy wallet upgrade preserved the key; wrong-password rejection, persistent backup, manual/background locking, cold restart, allocation/goal persistence, theme controls and secure window capture passed. A transaction reviewed and password-signed through the native UI credited exactly 1 Testnet XLM after ledger confirmation. Live helper tests also confirmed trustline setup and safe expiry reconciliation against the official ingested ledger.

Final deterministic/runtime suite: 122 tests, 117 passed, 5 opt-in integration tests skipped, zero failures. Opt-in database, production browser and live Testnet checks were run separately. Final native helper live run: 2 passed, zero skips/failures.

Final review findings fixed: asynchronous rate-limit registration; shared server-rendering session quota replaced with verified user quotas; backend outage no longer redirects authenticated users to login; failed logout stays on page with retry; Android pending hash stores review expiry and reconciles only after ledger proof, avoiding permanent blocks after an app exit before submission; Android CI generates Prisma before server-backed tests. Focused regressions passed. Android fields now have accessibility labels and appropriate placeholders.

Verdict: verified deployable Stellar Testnet source and installable development-signed Android APK. No live host was published. Hosting/domain/database secrets must be supplied using the deployment guide. Store distribution needs a private signing identity and physical-device/store validation. Native plans remain device-local; native swaps/yield/social/fiat/mainnet remain unavailable. Four Expo/Metro build-tool advisory exceptions are documented in DEPENDENCY-SECURITY.md; do not claim a zero-advisory dependency tree. These boundaries preserve the repository's stated scope.
