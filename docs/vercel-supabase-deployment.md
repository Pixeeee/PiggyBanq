# PiggyBanq Vercel + Supabase Deployment Guide

PiggyBanq is currently split into two deployable pieces:

- `apps/web`: Next.js frontend, deployable on Vercel.
- `server`: Fastify API, deployable on a Node host such as Render, Railway, Fly.io, or a dedicated server.

The web app calls the API through `NEXT_PUBLIC_API_BASE_URL`, so deploy the API first, then point Vercel to that API URL. This release is deliberately **Stellar Testnet only**. Mainnet, Binance, CCTP, fiat settlement, and real yield are disabled.

## 1. Supabase Database URLs

In Supabase, use the transaction pooler for app traffic and the session pooler for migrations:

```env
DATABASE_URL="postgresql://postgres.cuwoidoiwtxxfbjeftdh:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.cuwoidoiwtxxfbjeftdh:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

Replace `[YOUR-PASSWORD]` with the Supabase database password. Do not commit real credentials.

## 2. Run The Migration

The Prisma schema lives at `server/prisma/schema.prisma`, not the repo root.

From `D:\PiggyBanq`, run:

```powershell
$env:DATABASE_URL="postgresql://postgres.cuwoidoiwtxxfbjeftdh:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
$env:DIRECT_URL="postgresql://postgres.cuwoidoiwtxxfbjeftdh:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
npx prisma migrate deploy --schema server/prisma/schema.prisma
```

Alternative Supabase SQL Editor path:

1. Open `server/prisma/migrations/20260711090000_supabase_baseline/migration.sql`.
2. Paste it into Supabase SQL Editor.
3. Run it once on an empty Supabase database.

Use the Prisma command when possible because it also records migration history.

## 3. API Environment Variables

Set these on the API host:

```env
NODE_ENV="production"
PORT="4000"
HOST="0.0.0.0"
DATABASE_URL="postgresql://postgres.cuwoidoiwtxxfbjeftdh:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.cuwoidoiwtxxfbjeftdh:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
AUTH_APP_NAME="PiggyBanq"
AUTH_APP_URL="https://your-vercel-domain.vercel.app"
AUTH_DOMAIN="your-vercel-domain.vercel.app"
AUTH_ALLOWED_STELLAR_NETWORKS="TESTNET"
AUTH_CHALLENGE_TTL_SECONDS="300"
AUTH_SESSION_TTL_SECONDS="604800"
AUTH_SESSION_COOKIE_NAME="piggybanq_wallet_session"
AUTH_RATE_LIMIT_MAX="30"
AUTH_RATE_LIMIT_WINDOW="1 minute"
AUTH_SENSITIVE_RATE_LIMIT_MAX="10"
STELLAR_NETWORK="TESTNET"
STELLAR_HORIZON_URL="https://horizon-testnet.stellar.org"
STELLAR_FRIENDBOT_URL="https://friendbot.stellar.org"
STELLAR_FRIENDBOT_ENABLED="false"
STELLAR_QUOTE_TTL_SECONDS="300"
STELLAR_MAX_PAYMENT_AMOUNT="1000000"
STELLAR_MAX_SWAP_AMOUNT="100000"
STELLAR_MAX_TRUSTLINE_LIMIT="1000000"
STELLAR_EMERGENCY_READ_ONLY="false"
STELLAR_QUOTE_RATE_LIMIT_MAX="12"
STELLAR_SUBMIT_RATE_LIMIT_MAX="6"
```

Do not change either network variable to Mainnet. The API fails closed if any network other than `TESTNET` is configured. Set `STELLAR_EMERGENCY_READ_ONLY=true` to stop new quotes and submissions while keeping balances, activity, and reconciliation available.

## 4. Vercel Web Environment Variables

Set these in the Vercel project for `apps/web`:

```env
NEXT_PUBLIC_API_BASE_URL="https://your-api-domain.example.com"
AUTH_SESSION_COOKIE_NAME="piggybanq_wallet_session"
```

Recommended Vercel project settings:

- Framework Preset: `Next.js`
- Root Directory: `apps/web`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build`
- Output Directory: leave blank for Next.js

## 5. Deploy Commands

Install Vercel CLI if needed:

```powershell
npm install -g vercel
```

Deploy preview:

```powershell
cd D:\PiggyBanq\apps\web
vercel
```

Deploy production after the preview works:

```powershell
cd D:\PiggyBanq\apps\web
vercel --prod
```

## 6. Required Deployment Order

1. Create the Supabase database.
2. Run `prisma migrate deploy`.
3. Deploy the Fastify API and set its Supabase variables.
4. Deploy the Vercel web app and set `NEXT_PUBLIC_API_BASE_URL` to the API URL.
5. Open `/signup`, create a PiggyBanq wallet, fund its public key on Stellar Testnet, and confirm `/dashboard` shows the live balance without demo fallback.
6. Create the official Testnet USDC trustline, send XLM, and run an XLM/USDC swap quote or verify the explicit no-path state.
7. Confirm expired, duplicate, rejected, timed-out, and unknown intents never appear as successful.

## 7. Release Gates

From the repository root, run:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm -r build
corepack pnpm --filter @piggybanq/server exec prisma validate --schema prisma/schema.prisma
corepack pnpm audit --prod --audit-level high --ignore GHSA-w3rx-r6r6-pgpr --ignore GHSA-5p2g-fcmc-qvqq
git diff --check
```

The two explicit audit exceptions are confined to Expo/Metro's build-time `image-size` parser. The registry currently has no patched `2.0.3` release. Remove the exceptions as soon as a compatible patched release is published. No critical advisories or web/server high advisories are accepted.

The opt-in live test creates disposable Testnet wallets and uses Friendbot:

```bash
RUN_STELLAR_TESTNET_E2E=1 node --test tests/stellar-testnet-live.test.mjs
```

Do not run that test as a required high-frequency CI job; public Testnet/Friendbot availability is external and rate-limited.
