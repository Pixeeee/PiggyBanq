# PiggyBanq deployment readiness and Android follow-up

Goal: ship a verified Stellar Testnet web release, then a usable Android wallet release.
Architecture: existing Next.js/Fastify/PostgreSQL monorepo; self-custody and server wallet-ownership sessions. Browser requests use a same-origin /backend proxy; server rendering uses a private API_BASE_URL. Android keeps keys in native SecureStore.
Constraints: no mainnet, real yield, fiat settlement or external sandbox execution claimed as real. Preserve existing work. No live publication or destructive database changes. Work branch fix/deployment-readiness. User authorized plan and implementation together.
Review focus: session cookies across hosts; origin validation; unavailable backend; wallet overwrite/data loss; native wallet locks and persistence; honest simulated balances; signature confirmation and transaction status.

## Task 1: Web authentication deployment
Files: apps/web/api-config.ts, next.config.ts, app/lib/wallet-auth-api.ts, dashboard/_lib/session.ts; server auth cookie option; tests/deployment-config.test.mjs.
Write failing URL/config tests, run them, implement validated private upstream plus same-origin rewrite and Lax cookie, test production login with a real browser/API/database.

## Task 2: Backend production lifecycle
Files: server config/index/server/auth session/routes and new focused tests.
Prove env precedence, origin restrictions, readiness and suspended-account rejection before fixing. Validate backend typecheck.

## Task 3: Release proof and deployment instructions
Apply all migrations to a fresh throwaway PostgreSQL instance; verify migration repeatability; exercise signed signup/login/logout, authenticated CRUD and ownership isolation. Build production Next, test browser navigation, vault unlock, allocations/pockets/profile and responsive UI. Run live Stellar Testnet checks. Fix observed failures. Add repeatable integration tests/CI. Update deploy guide/environment examples with exact deployment order and rollback/backup guidance.

## Task 4: Android wallet safety and behavior
After web verification: persist backup state, enforce native secure storage, prevent accidental overwrite; provide a meaningful device unlock/lock flow and remove misleading password promises. Replace dead navigation/actions with functional views or explicit unavailable state. Persist local planning data and integrate live Testnet balance/history with reviewed native transactions where feasible. Build new APK and verify emulator flows including restart. Document boundaries honestly.

## Task 5: Final review and deliverables
Run relevant full suite/build; obtain one fresh code review under requesting-code-review skill; address important findings with regressions. Package updated source/APK and verification/fix report in outputs. Release verdict depends on observed checks; hosting credentials/domain and Android distribution signing are user configuration, not evidence of deployed service.
