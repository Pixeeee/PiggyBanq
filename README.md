# PiggyBanq

Stellar Testnet demo: [PiggyBanq](https://piggy-banq-web.vercel.app) · [API readiness](https://piggybanq-api.onrender.com/ready). Hosted x402 is disabled pending an upstream dependency fix; see the [security review](docs/security-review-2026-10-27.md).

PiggyBanq is a self-custodial Stellar Testnet wallet and savings-planning workspace. Testnet assets have no monetary value. Web wallets use a 12-word recovery phrase, PBKDF2 and an AES-GCM local vault. Authentication uses signed wallet-ownership challenges and HttpOnly server sessions. Private keys and passwords never go to the API.

## Release features

- Web: real Testnet XLM/official USDC balances, payments, trustlines, swaps and activity, locally signed after transaction review.
- Web: authenticated database-backed allocations, goals, profile and savings forecasts; recovery in a new browser or after forgetting a local password.
- Web deployment: same-origin backend proxy, HTTPS cookies, exact origin validation, session revocation/suspension, rate limits, database readiness and security headers.
- Android: on-device wallet creation, Stellar secret-key or web recovery-phrase import, persistent password unlock and backup confirmation, automatic background locking and screen-capture protection.
- Android: live Testnet balances/activity, reviewed XLM/official USDC transfers and USDC trustlines, persistent pending-hash reconciliation, device-local plans, and a native Sync workspace for web account login, shared goals/allocations, pockets and profile.

Yield Lab is a simulation; it does not deposit funds or generate real yield. CCTP, Binance, fiat settlement and mainnet are disabled. Android swaps, actual yield and social provider login are unavailable in this release. Save retains existing device-only plans; Sync uses the same backend records as web after approved wallet authentication. New native wallets back up a web-compatible 12-word phrase. Existing secret-key wallets are preserved; their secret keys cannot be converted into the original web phrase. Android can import either format.

## Setup

Use Node24 and pnpm11.7.0. Supply a PostgreSQL database. Copy server/.env.example and apps/web/.env.example to the corresponding .env files, and server/.env.migrations.example to server/.env.migrations. Set the migration URLs to your database owner's credentials and restrict server/.env and server/.env.migrations to mode 600. Install and migrate from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @piggybanq/server exec prisma generate --schema prisma/schema.prisma
pnpm --filter @piggybanq/server db:migrate
```

Next, follow [Database accounts](docs/database-operations.md#database-accounts) to provision `piggybanq_app` and set its generated password in the runtime URLs in server/.env. The checked-in templates contain placeholders, not usable credentials. Then verify:

```sh
pnpm test
pnpm -r build
pnpm lint
```

Production web builds require API_BASE_URL. Development defaults to http://127.0.0.1:4000. Run the API with `pnpm --filter @piggybanq/server dev`; run web with `pnpm --filter @piggybanq/web dev --port 3010`. Browser clients use the same-origin /backend proxy. Production deployment requires a running Next server, Fastify API, migrated database, configured trusted proxy chain and HTTPS hosts.

[Deployment guide](docs/vercel-supabase-deployment.md) · [Database roles, backups and recovery](docs/database-operations.md) · [Android setup](docs/ANDROID.md) · [Dependency exceptions](docs/DEPENDENCY-SECURITY.md)

[Stellar Testnet x402 paid API](docs/x402-testnet.md): reviewed local signing,
spending limits, real settlement and independently verified receipts at `/dashboard/agent`.
The separate Binance/CCTP agentic sandbox remains simulated.

## Android development

Install JDK17 and Android SDK36, set JAVA_HOME and ANDROID_HOME, then use:

```sh
pnpm mobile:build
pnpm mobile:android
```

The Android command runs Expo Prebuild to synchronize checked-in native configuration. Release APK instructions and store-signing boundaries are in docs/ANDROID.md. The supplied test APK uses the development signing key; store distribution requires a privately managed signing identity.

For local Expo web preview on Windows, `npm.cmd run mobile:web` opens http://localhost:8087. This preview is development-only and uses a strictly localhost-gated fallback. Use the dedicated Next web app for deployment.

## Release verification

`pnpm test` runs deterministic unit/runtime tests; network/database integration tests opt in separately. Use an isolated migrated test database and API for `RUN_DATABASE_RELEASE_TESTS=1 node --test tests/release-api.test.mjs`. Run `node tests/release-browser.mjs` against a production Next build after `pnpm exec playwright install chromium`. Live tests use disposable Testnet wallets only:

```sh
RUN_STELLAR_TESTNET_E2E=1 node --test tests/stellar-testnet-live.test.mjs
RUN_DATABASE_STELLAR_TESTS=1 node --test tests/release-stellar-api.test.mjs
RUN_MOBILE_STELLAR_TESTNET=1 node --test tests/mobile-stellar-live.test.mjs
```

RELEASE_API_URL / RELEASE_WEB_ORIGIN configure API integration tests; RELEASE_WEB_URL configures browser tests. Runtime test proofs, hosted preview checks and Android device testing are distinct. Four tracked Expo/Metro build-tool advisories remain; see docs/DEPENDENCY-SECURITY.md for exact IDs and constraints. Older phase documents describe historical prototypes and do not establish current release guarantees.
