# Security and deployment check — 2026-10-27

## Fixed and verified locally

- Rotated the local PostgreSQL migration-owner password after finding that it
  matched an old tracked example; updated only the private migration credential
  file and verified a fresh authenticated connection. Runtime credentials stay separate.

- x402 status reconciliation could re-broadcast while payments were disabled.
  Both the x402 switch and emergency read-only switch now block new settlement,
  queued signing and recovery broadcasts; receipt verification remains available.
- Direct application validation and compatible dependencies were updated to patched
  versions. Oversized general API bodies are rejected with413 before validation.
- API Docker context and Vercel uploads exclude environment files, private keys and
  backup archives. The Docker image uses explicit source copies and a non-root user;
  a running image passed `/ready` using the restricted database login. It contains
  no environment files or operator migration artifacts.
- Known configured server secrets were absent from fresh production browser assets.
  Pattern scanning found only deterministic/invalid test secret fixtures. No ignored
  local credential files were tracked. This is a bounded scan, not proof of no leak.
- PostgreSQL17 rehearsal applied all seven migrations in private schema `piggybanq`,
  checked runtime/backup/browser-role privileges, exported over TCP, encrypted, and
  restored29 tables/8 fixture rows into an isolated matching-version container.
- Full suite:131 tests,126 passed,5 opt-in checks skipped; included a real Testnet
  x402 settlement and receipt. Web production build, server typecheck, Docker build,
  and browser signup/persistence/logout/recovery smoke checks passed.
- A fresh local encrypted backup restored28 tables/10 rows with matching data.

## Release blockers and limits

Supabase browser access is now authenticated. No PiggyBanq project was listed; a
dedicated Free/Singapore project form is prepared with Data API and automatic table
exposure disabled, awaiting the user's password entry and creation. Its role grants,
TLS, Data API exposure, backup credentials and first verified encrypted cloud export
have not been inspected or configured. Daily automation exports local data and will
also export Supabase when its private configuration exists; it reports missing cloud
coverage. Archives currently stay on this machine; offsite recovery is not set up.

Vercel and Render browser access work. An existing Vercel production deployment from
October5 predates these changes; no new cloud release was made. Provider secret
rotation and account MFA were not performed. No destructive data/table changes were
made. See DEPENDENCY-SECURITY.md for one remaining high advisory in the official
x402 package's Zod3 dependency and four existing mobile toolchain advisory exceptions.
Hosted x402 remains disabled in the deployment blueprint. No external penetration
test or guarantee against every breach is claimed.
