# PiggyBanq Vercel + Supabase Deployment Guide

PiggyBanq is currently split into two deployable pieces:

- `apps/web`: Next.js frontend, deployable on Vercel.
- `server`: Fastify API, deployable on a Node host such as Render, Railway, Fly.io, or a dedicated server.

The web app calls the API through `NEXT_PUBLIC_API_BASE_URL`, so deploy the API first, then point Vercel to that API URL.

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
```

For production funds, change `AUTH_ALLOWED_STELLAR_NETWORKS` only after the wallet and transaction flows are fully audited.

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
5. Open `/signup`, create a Stellar wallet, then confirm `/dashboard/community` loads after login.
