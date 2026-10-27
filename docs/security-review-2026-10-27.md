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
- Current standard suite:131 tests,123 passed,8 opt-in checks skipped. Targeted
  database/backup checks and an earlier real Testnet x402 settlement also passed.
  Web production build, server typecheck, Docker build, and both local/hosted browser
  signup/persistence/logout/recovery smoke checks passed.
- A fresh local encrypted backup restored28 tables/10 rows with matching data.

## Release blockers and limits

Supabase project `anylyvnesgiwalhwbddj` (Free/Singapore) is provisioned. All seven
migrations are applied in private schema `piggybanq`. The source's27 application
tables/10 rows were copied atomically via a temporary local clone and compared;
Prisma maintains its own7 migration records. No source tables were renamed or
removed. Supabase Data API and automatic table exposure are disabled. SSL
enforcement is enabled. Both clients verify the official Supabase CA and hostname.
The runtime and backup roles have no superuser, database/role creation, replication
or RLS-bypass privileges. Runtime cannot read migration history or delete audit
records; browser roles lack private-schema usage. Backup cannot insert user records.

Live Supabase encrypted export and isolated PostgreSQL17 restore passed:28 tables/
17 rows before release fixtures. Daily02:00 Asia/Manila automation now checks both
local and cloud targets. Historical plaintext archives were encrypted and restored
before their plaintext originals were removed. Archives remain on this machine;
computer/Docker availability and offsite recovery remain operational limits.

Render Free API `https://piggybanq-api.onrender.com` is deployed from455e675. Both
health/readiness endpoints return200. Live signed authentication, replay rejection,
durable CRUD, ownership and logout passed. An initial pnpm startup dependency
reinstall failed on root-owned files; direct Node startup now passes as non-root
with CI=true and a read-only image. Administrator and backup credentials are absent
from Render. Vercel receives only its API URL. Production web `https://piggy-banq-web.vercel.app`
is Ready from application revision f2987a7; `/backend/ready` returns200 through the
same-origin proxy. Hosted browser signup, Secure/HttpOnly/SameSite cookies, protected
reloads, allocation/profile persistence, responsive layout, logout and fresh-browser
recovery passed. Wallet access choices stay disabled until client initialization,
preventing clicks before hydration. Browser tests wait for page data to finish
syncing before editing; external assets are not used as the readiness signal.

Final encrypted Supabase export after release fixtures restored28 tables/47 rows:
`piggybanq_supabase_20261027T053013508379Z.dump.gpg` with its SHA256 `.verified`
report. The automation requires both independent backup targets every day.

Account MFA and external API-key rotation were not performed. Existing application
data was preserved. See DEPENDENCY-SECURITY.md for one remaining high advisory in the official
x402 package's Zod3 dependency and four existing mobile toolchain advisory exceptions.
Hosted x402 remains disabled in the deployment blueprint. No external penetration
test or guarantee against every breach is claimed.
