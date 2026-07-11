# PiggyBanq Stellar Wallet Authentication

PiggyBanq uses Stellar wallets for sign up and login. The app never sends a recovery phrase, Stellar secret key, or password to the server.

## Flow

1. The user opens `/signup`.
2. The browser generates a 12-word recovery phrase and derives a Stellar Ed25519 keypair with BIP39 seed material and the Stellar `m/44'/148'/0'` hardened path.
3. The browser encrypts the recovery phrase and Stellar secret key with the user's password using PBKDF2 and AES-GCM, but keeps the new local wallet record in memory until server signup succeeds.
4. The API creates a one-time Stellar challenge with a five-minute expiry.
5. The browser signs the challenge with the local Stellar secret key.
6. The API verifies the signature with `Keypair.fromPublicKey(publicKey).verify(...)`, atomically consumes the challenge, creates the user, and creates a session.
7. Only after signup succeeds, the browser persists the encrypted local wallet record. New records are versioned as v2 and do not store a password verifier hash.
8. The raw session token is stored only in an HttpOnly cookie. The database stores only `sha256(token)`.
9. `/dashboard` calls `/api/auth/me` server-side before rendering protected content.
10. Logout revokes the session row and clears the cookie.

Login uses the same signing model. The user enters username and password, the browser unlocks the encrypted local Stellar wallet, signs a fresh challenge, and the server verifies the signature.

## Required Environment

Copy `server/.env.example` and `apps/web/.env.example`, then adjust values for your local machine or deployment.

The default local URLs are:

- Web: `http://127.0.0.1:3010`
- API: `http://127.0.0.1:4000`

Supported Stellar networks default to `TESTNET`.

## Database

Run Prisma migrations before using the auth flow:

```powershell
pnpm --filter @piggybanq/server exec prisma migrate dev
```

The migration adds:

- `User.username`
- `User.stellarPublicKey`
- `WalletAuthChallenge`
- hashed session token storage with revocation fields

For Supabase, use the generated baseline SQL at:

```text
server/prisma/migrations/20260711090000_supabase_baseline/migration.sql
```

This file is generated from `server/prisma/schema.prisma` and is intended for the Supabase SQL Editor when a direct Supabase Postgres URL is not available. Run it against a fresh Supabase database before starting the API. If you later provide a Supabase `DATABASE_URL`, the same schema can be applied through Prisma instead.

## Local Run

Start the API and web app in separate terminals:

```powershell
pnpm --filter @piggybanq/server dev
pnpm --filter @piggybanq/web start -- -p 3010 -H 127.0.0.1
```

Use `pnpm --filter @piggybanq/web dev -- -p 3010 -H 127.0.0.1` during development.
