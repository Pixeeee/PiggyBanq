# Deploy PiggyBanq (Stellar Testnet)

Release scope: self-custodial Testnet wallet, local encrypted recovery, authenticated planning records, live XLM/official Testnet USDC payments, trustlines, swaps and history. Yield Lab records are simulations. Mainnet, real yield, fiat settlement, CCTP and Binance execution are disabled.

## Architecture and prerequisites

Use Node 24, pnpm 11.7.0, PostgreSQL and HTTPS web/API hosts. Next.js (`apps/web`) runs on Vercel; Fastify (`server`) runs on a persistent Node host. The browser calls `/backend` on the web origin; Next rewrites these requests to the server-only `API_BASE_URL`. The host-only HttpOnly session cookie therefore belongs to the web host and is available to protected server-rendered pages. Do not configure browser clients to call the API domain directly. Legacy NEXT_PUBLIC_API_BASE_URL is only an upstream compatibility fallback; prefer API_BASE_URL.

See [Next.js external rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites) and [Vercel monorepos](https://vercel.com/docs/monorepos).

## Database

Use a new Supabase Free project. Before moving existing data, take and verify a
backup; restore a copy for rehearsal. Do not reset, rename, or overwrite an existing
cloud database. Keep application tables in a private `piggybanq` schema that is not
listed in Supabase's exposed Data API schemas. Browser `anon`, `authenticated` and
`service_role` roles receive no access to this schema. The application talks to
PostgreSQL only through its authenticated API.

Run `server/prisma/supabase-roles.sql` as the migration owner (`postgres`) before
and after migrations, supplying two distinct generated passwords through
`PIGGYBANQ_APP_PASSWORD` and `PIGGYBANQ_BACKUP_PASSWORD`. It is a psql script with
operator environment inputs, not a Dashboard SQL Editor paste. The second run
removes runtime access to migration history and audit-log mutations after tables
exist. Never start public traffic before that second run passes.

Keep owner URLs in a private `server/.env.migrations` (mode600), using the provider's
session/direct connection with `schema=piggybanq` and verified TLS. Run:

```sh
pnpm install --frozen-lockfile
pnpm --filter @piggybanq/server db:migrate
```

Apply all seven migrations. Never use migrate reset on a deployed database. For
runtime DATABASE_URL use the transaction pooler (port6543), restricted
`piggybanq_app.PROJECT_REF` user, `schema=piggybanq`, `pgbouncer=true`,
`connection_limit=3`, `sslmode=require` and `sslaccept=strict` (Prisma6), with
the provider's CA when required. The backup libpq client separately uses
`sslmode=verify-full`; Prisma6 does not support that sslmode value.
Set API DIRECT_URL to the same restricted role using the session endpoint. Neither
Render nor Vercel should receive owner or backup credentials. Read-only backup
configuration stays on the operator's backup host; see database-operations.md.

This schema layout is tested on a disposable PostgreSQL17 database. Actual Supabase
migration, data transfer, provider TLS, Data API exposure and live role permissions
still require authenticated project access and verification before release.

## API host

Set the following environment, substituting real hosts and database strings:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=4000
DATABASE_URL=<pooled-database-url>
DIRECT_URL=<same-restricted-runtime-role-session-url>
AUTH_APP_NAME=PiggyBanq
AUTH_APP_URL=https://your-web-domain.example
AUTH_DOMAIN=your-web-domain.example
AUTH_ALLOWED_ORIGINS=https://your-web-domain.example
AUTH_ALLOWED_STELLAR_NETWORKS=TESTNET
AUTH_SESSION_COOKIE_NAME=piggybanq_wallet_session
AUTH_CHALLENGE_TTL_SECONDS=300
AUTH_SESSION_TTL_SECONDS=604800
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_FRIENDBOT_URL=https://friendbot.stellar.org
STELLAR_FRIENDBOT_ENABLED=false
STELLAR_EMERGENCY_READ_ONLY=false
```

The checked-in `Dockerfile` and `render.yaml` configure Render Free (Singapore). Keep one replica. If using a Node host without Docker, configure the provider build command as `pnpm install --frozen-lockfile && pnpm --filter @piggybanq/server exec prisma generate --schema prisma/schema.prisma && pnpm --filter @piggybanq/server build`. Start with `pnpm --filter @piggybanq/server start`. Run migrations once as a release job, before starting the new version. `/health` reports process liveness; `/ready` returns 200 only when the database responds. Use `/ready` for readiness monitoring. Termination signals close HTTP and database connections.

AUTH_ALLOWED_ORIGINS is a comma-separated list of exact HTTPS origins, including approved preview hosts if needed. AUTH_DOMAIN must match the host in AUTH_APP_URL. Set the identical session cookie name on both services. Deployment environment takes precedence over an optional local .env file. Keep the API reachable from Vercel. Rate limits are per process; keep one instance or supply shared limiting before scaling. Configure TRUST_PROXY explicitly for your provider’s trusted IP/CIDR chain or validated hop count. The provider must sanitize X-Forwarded-For; never trust arbitrary client headers. Without it, proxy users share an IP and authentication limits. Verify distinct browser clients have distinct request IPs before promotion. For a local loopback proxy only, TRUST_PROXY=loopback. See Fastify trustProxy documentation.

## Vercel web host

Authenticated session checks use a verified user quota so server-rendered requests from different users do not share the Next server's IP quota. Invalid sessions retain IP limits. Backend outages and throttling show a retry page; only rejected credentials redirect to login.

Create a Next.js project with Root Directory `apps/web`, allow access to files outside the root directory for the workspace packages, use Node 24, use the checked-in `apps/web/vercel.json` pinned pnpm installer and build command, and leave Output Directory at the Next.js default.

Set at build and runtime:

```env
API_BASE_URL=https://your-api-domain.example
AUTH_SESSION_COOKIE_NAME=piggybanq_wallet_session
```

API_BASE_URL is mandatory in production and must be an HTTP(S) origin without credentials or a path. Public production upstreams require HTTPS. Loopback HTTP is allowed for local release testing only. Rebuild/redeploy when the upstream changes; rewrites are included in the build. Do not publish a static export; authentication requires the Next server runtime.

## Verify and release

Deploy API, confirm `/ready`, then deploy a web preview configured with its allowed origin. Verify on the deployed HTTPS host:

1. Create a disposable wallet and save its recovery phrase privately.
2. Reload dashboard and visit allocations, goals, pockets and profile.
3. Save an allocation, reload, and verify persistence.
4. Log out and confirm dashboard access redirects to login.
5. Recover the same wallet in a fresh browser using its phrase and a new local password.
6. Fund only disposable Testnet wallets via Friendbot outside the app (disabled by default in production). Review and submit a small Testnet payment, then confirm ledger history.
7. Confirm no social SDK placeholder or development demo login appears in production. Test mobile width and backend outage/retry behavior.

Local release proof is reproducible with `pnpm test`, `pnpm -r build`, `pnpm lint`, then a migrated disposable database/API using `RUN_DATABASE_RELEASE_TESTS=1 node --test tests/release-api.test.mjs`. Install Chromium with `pnpm exec playwright install chromium`, start the production web build on port3010 and run `node tests/release-browser.mjs`. RELEASE_WEB_URL and RELEASE_BROWSER_EXECUTABLE customize the browser run. Use RUN_STELLAR_TESTNET_E2E=1 for the direct live ledger test; RUN_DATABASE_STELLAR_TESTS=1 for the API quote/sign/submit test against an isolated release API.

Only promote after the hosted preview passes these checks. No live hosting account, production domain or database credentials are included in this source package.

## Operations and rollback

Configure database backups, uptime alerts on `/ready`, and server error monitoring. Logs redact wallet secrets and session cookies. Never send recovery phrases, private keys or passwords to the API. Test restoration from backup. Set STELLAR_EMERGENCY_READ_ONLY=true to pause quotes/submissions while preserving reads and reconciliation. Roll back web/API to the previous tested build with compatible database schema; do not delete migration history or reverse migrations without a tested data-preserving procedure. Preserve existing transaction intents and reconcile uncertain submissions before retrying.

See docs/DEPENDENCY-SECURITY.md for four tracked Expo/Metro build-tool advisory exceptions; none is a deployed web/API dependency path.

## Free-plan rollout and current access

Use Vercel Hobby only if this project meets its personal/noncommercial terms. Render
Free can sleep after15 minutes of inactivity and cold starts can take about a minute;
Supabase Free can pause inactive projects. These plans are suitable for a Testnet
demo, not dependable financial production hosting. Render's filesystem is ephemeral:
never keep the database or backup archives there. Keep sensitive environment variables
out of preview/untrusted branches and restrict provider team access with MFA.

Create the Vercel project with root directory `apps/web`, Node24 and workspace files
outside that root enabled. Only API_BASE_URL and the session-cookie name are needed
there. Import `render.yaml` for the API and supply restricted database credentials and
the exact Vercel origin. Verify readiness before web deployment. Payment signing
starts only after the API has warmed. Leave x402 disabled until hosted approval,
limits, emergency stop and independent receipt verification pass; then enable only
the separate Testnet sponsor/merchant credentials.

Deployment completed on2026-10-27 using existing authenticated accounts:

- Web: https://piggy-banq-web.vercel.app (Vercel Hobby, application revision f2987a7).
- API: https://piggybanq-api.onrender.com (Render Free, Singapore, runtime revision455e675).
- Database: Supabase Free project `anylyvnesgiwalhwbddj`, PostgreSQL17.11, Singapore.
- Data: all27 application tables/10 source rows copied and compared;7 migration
  records maintained by Prisma. Existing local source data is preserved.
- Security: private schema; restricted runtime role; read-only backup role; Data API
  off; automatic table exposure off; server SSL enforcement on; CA/hostname checks on.
- Readiness: direct API and same-origin `/backend/ready` both200.
- Release proof: live API auth/replay/persistence/logout and full hosted browser
  signup, cookies, persistence, responsive layout, logout/recovery checks passed.
- Backups: both targets are required daily at02:00 Asia/Manila. Final live cloud
  encrypted export restored28 tables/47 rows, including release fixtures.

The Docker runtime starts directly with Node as a non-root user. It never invokes
pnpm or installs dependencies at startup. The deployed image passed readiness with
CI=true and a read-only filesystem before release. Runtime and backup passwords are
generated independently; owner credentials remain only on the operator's machine.
No Supabase browser API key is needed by this architecture. Configured cloud
credentials were absent from tracked source and server secrets absent from browser
assets. See `security-review-2026-10-27.md` for the bounded review and residual risks.

Hosted x402 remains disabled because the official package still depends on an
unpatched Zod3 release. The local Testnet payment implementation and real receipt
checks remain available for controlled testing. There is no offsite backup copy;
the daily job requires this computer and Docker to be available. Free-host cold
starts and project pauses remain platform limits. Mainnet is disabled.
