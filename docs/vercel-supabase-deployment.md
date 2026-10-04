# Deploy PiggyBanq (Stellar Testnet)

Release scope: self-custodial Testnet wallet, local encrypted recovery, authenticated planning records, live XLM/official Testnet USDC payments, trustlines, swaps and history. Yield Lab records are simulations. Mainnet, real yield, fiat settlement, CCTP and Binance execution are disabled.

## Architecture and prerequisites

Use Node 24, pnpm 11.7.0, PostgreSQL and HTTPS web/API hosts. Next.js (`apps/web`) runs on Vercel; Fastify (`server`) runs on a persistent Node host. The browser calls `/backend` on the web origin; Next rewrites these requests to the server-only `API_BASE_URL`. The host-only HttpOnly session cookie therefore belongs to the web host and is available to protected server-rendered pages. Do not configure browser clients to call the API domain directly. Legacy NEXT_PUBLIC_API_BASE_URL is only an upstream compatibility fallback; prefer API_BASE_URL.

See [Next.js external rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites) and [Vercel monorepos](https://vercel.com/docs/monorepos).

## Database

Create a dedicated database and copy its actual connection strings from the provider. URL-encode password characters. For Supabase, use a transaction pooler URL with `?pgbouncer=true` for DATABASE_URL and a direct/session connection for DIRECT_URL. Require TLS as specified by your provider. Never commit secrets.

From the repository root, with DATABASE_URL and DIRECT_URL set:

```sh
pnpm install --frozen-lockfile
pnpm --filter @piggybanq/server exec prisma generate --schema prisma/schema.prisma
pnpm --filter @piggybanq/server exec prisma validate --schema prisma/schema.prisma
pnpm --filter @piggybanq/server exec prisma migrate deploy --schema prisma/schema.prisma
```

Apply all six migrations through Prisma. Running only the old baseline SQL omits later schema changes and migration history. Never use migrate reset on a deployed database. Take a database backup before upgrading, and test upgrades against a restored copy first.

## API host

Set the following environment, substituting real hosts and database strings:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=4000
DATABASE_URL=<pooled-database-url>
DIRECT_URL=<migration-database-url>
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

Configure the provider build command as `pnpm install --frozen-lockfile && pnpm --filter @piggybanq/server exec prisma generate --schema prisma/schema.prisma && pnpm --filter @piggybanq/server build`. Start with `pnpm --filter @piggybanq/server start`. Run migrations once as a release job, before starting the new version. `/health` reports process liveness; `/ready` returns 200 only when the database responds. Use `/ready` for readiness monitoring. Termination signals close HTTP and database connections.

AUTH_ALLOWED_ORIGINS is a comma-separated list of exact HTTPS origins, including approved preview hosts if needed. AUTH_DOMAIN must match the host in AUTH_APP_URL. Set the identical session cookie name on both services. Deployment environment takes precedence over an optional local .env file. Keep the API reachable from Vercel. Rate limits are per process; keep one instance or supply shared limiting before scaling. Configure TRUST_PROXY explicitly for your provider’s trusted IP/CIDR chain or validated hop count. The provider must sanitize X-Forwarded-For; never trust arbitrary client headers. Without it, proxy users share an IP and authentication limits. Verify distinct browser clients have distinct request IPs before promotion. For a local loopback proxy only, TRUST_PROXY=loopback. See Fastify trustProxy documentation.

## Vercel web host

Authenticated session checks use a verified user quota so server-rendered requests from different users do not share the Next server's IP quota. Invalid sessions retain IP limits. Backend outages and throttling show a retry page; only rejected credentials redirect to login.

Create a Next.js project with Root Directory `apps/web`, allow access to files outside the root directory for the workspace packages, use Node 24, install `pnpm install --frozen-lockfile`, build `pnpm build`, and leave Output Directory at the Next.js default.

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
