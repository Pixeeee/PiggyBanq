# PiggyBanq Developer Guide

This guide explains how the current PiggyBanq codebase works, how to run it locally, what is already functional, and what must still be built before production use.

## Product Goal

PiggyBanq is a no-KYC micro-savings account concept for Filipinos who cannot easily access traditional banking. The product combines:

- A self-custodial Stellar wallet.
- Micro-savings pockets and budget allocation.
- A social/community layer for calamity support.
- Future anchor flows for PHP or USD on/off ramps.
- Future perks when users reach savings milestones.

The core design rule is that PiggyBanq must not become a custodian without explicit approval. Private keys and recovery phrases should remain on the user's device.

## What Works Today

The web app currently works locally with browser storage:

- Landing page at `/`.
- Dashboard at `/dashboard`.
- Secure wallet gate before dashboard access.
- 12-word recovery phrase generation.
- Username creation with local uniqueness checks.
- Password strength enforcement:
  - 12 or more characters.
  - Uppercase letter.
  - Lowercase letter.
  - Number.
  - Special character.
- Password-derived encryption using PBKDF2 and AES-GCM.
- Local encrypted wallet vault storage.
- Username/password wallet login.
- Dashboard overview that detects the active wallet session.
- Profile editing.
- Budget allocation categories and currencies.
- Community tools:
  - Calamity help posts.
  - Photo uploads.
  - Donation pledge text.
  - Groups.
  - Discussions.
  - Global chat.
  - Private chat.
- Light, dark, and system theme selection.
- Feature dropdown navigation.

The Expo app is scaffolded and includes secure local Stellar testnet wallet helper code. The mobile app does not yet have full feature parity with the web dashboard.

## What Is Still Local-Only

The current web wallet/account system is local to one browser profile. This is useful for prototype testing, but it is not enough for production.

Local-only today:

- Username uniqueness.
- Wallet account records.
- Active wallet session.
- Profile data.
- Budget data.
- Help posts.
- Chat messages.
- Photo previews.

Production requires a backend database and API implementation for global uniqueness, persistence, sync, moderation, abuse handling, and account lifecycle management.

## Production Gaps

Before real users or real funds, PiggyBanq needs:

- Server-backed auth with bcrypt password hashing.
- JWT access tokens and HttpOnly refresh-token cookies.
- Refresh-token rotation and revocation.
- Optional MFA.
- Rate limiting.
- CSRF protections where cookie sessions are used.
- Database-backed unique usernames.
- Secure profile, budget, and social persistence.
- Moderation and reporting for calamity posts and chat.
- File upload storage with content-type and size validation.
- Real-time or polling chat transport.
- Stellar Horizon balance/history reads.
- Stellar transaction builder flows with explicit confirmation screens.
- Destination address validation before payment signing.
- Trustline checks before anchor deposits or non-native asset receives.
- Anchor integration for PHP or USD ramps.
- Legal review of KYC-free thresholds and regulatory posture.
- Security review before mainnet.

## Architecture

### Web App

Location: `apps/web`

Framework: Next.js App Router.

Important files:

- `app/page.tsx`: Landing page.
- `app/(app)/dashboard/page.tsx`: Dashboard page.
- `app/(app)/dashboard/WalletAccessGate.tsx`: Wallet login/create gate.
- `app/(app)/dashboard/WalletSetupPanel.tsx`: Secure wallet creation UI.
- `app/(app)/dashboard/secure-wallet.ts`: Local wallet account, encryption, and login helpers.
- `app/(app)/dashboard/DashboardWalletSummary.tsx`: Wallet state overview cards.
- `app/(app)/dashboard/DashboardFeaturePanels.tsx`: Profile, budget, and community panels.
- `app/components/ThemeToggle.tsx`: Light/dark/system selector.
- `app/globals.css`: Shared palette, dashboard layout, landing page, and responsive styles.

### Mobile App

Location: `apps/mobile`

Framework: Expo.

Important files:

- `app/index.tsx`: Mobile entry screen.
- `src/wallet/local-wallet.ts`: Local wallet storage helpers.
- `src/wallet/create-local-wallet.ts`: Stellar testnet wallet creation helpers.

### Server

Location: `server`

Framework: Fastify.

The server currently exposes route boundaries but several modules intentionally return placeholder responses. This keeps the monorepo architecture clear without pretending production auth or persistence is finished.

Important files:

- `src/server.ts`: Fastify setup and module registration.
- `src/modules/auth/routes.ts`: Auth route placeholders.
- `src/modules/wallet/routes.ts`: Public-key-only wallet linkage placeholder.
- `src/modules/social/routes.ts`: Social module placeholder.
- `prisma/schema.prisma`: Database schema draft for users, wallets, budgets, savings, relief posts, chat, milestones, sessions, MFA, and audit logs.

### Shared Packages

- `packages/stellar-core`: Stellar address validation, network constants, payment confirmation models, polling helpers, and trustline helpers.
- `packages/types`: Shared domain types for wallet, KYC, and ledger concepts.
- `packages/config`: Shared TypeScript/config package.

## Local Setup

Use PowerShell from the repository root.

Install dependencies:

```powershell
pnpm install
```

Run tests:

```powershell
npm.cmd test
```

Build all packages and apps:

```powershell
npm.cmd run build
```

Run the web app in production mode:

```powershell
cd apps\web
npm.cmd run start -- -p 3010 -H 127.0.0.1
```

Run the web app in development mode:

```powershell
cd apps\web
npm.cmd run dev -- -p 3010 -H 127.0.0.1
```

Run the API server:

```powershell
cd server
pnpm dev
```

The server defaults to port `4000`.

## Testing

The repository uses Node's built-in test runner for the current suite.

```powershell
npm.cmd test
```

Current tests cover:

- Stellar testnet boundaries.
- Address validation and masking.
- Pending transaction polling expectations.
- Payment confirmation models.
- Trustline requirement logic.
- Savings pocket ledger behavior.
- Landing/dashboard routing.
- Web secure wallet creation/login requirements.
- Dashboard profile, budget, community, and theme controls.
- Mobile local wallet helper presence.
- Master prompt contract coverage.

## Build Verification

Run:

```powershell
npm.cmd run build
```

This builds/checks:

- Shared config package.
- Shared type package.
- Stellar core package.
- Fastify server source checks.
- Expo mobile TypeScript check.
- Next.js web production build.

## Wallet Security Details

The current web wallet account flow uses browser APIs:

- `@scure/bip39` for 12-word phrase generation.
- WebCrypto PBKDF2 for password-derived key material.
- AES-GCM for encrypted local vault storage.
- Stellar SDK `Keypair` for public/secret key derivation.

Local storage contains:

- Username.
- Stellar public key.
- Password salt.
- Password verifier hash.
- Encrypted vault payload.
- Active session metadata.

Local storage must not contain plaintext recovery phrases or plaintext secret keys. The test suite includes checks around this boundary.

## Stellar Guardrails

Follow these project rules:

- Use `Networks.TESTNET` or `Networks.PUBLIC`; do not hardcode passphrase strings.
- Use Horizon for balance and history reads.
- Use Soroban RPC only for contract calls.
- Use the `rpc` namespace from `@stellar/stellar-sdk` v14+ if Soroban is introduced.
- Simulate Soroban transactions before sending.
- Treat `sendTransaction` returning `PENDING` as incomplete.
- Poll `getTransaction` every second for up to 60 seconds until `SUCCESS` or timeout.
- Validate destination addresses client-side before building transactions.
- Show amount, asset, destination, and fee before every signature prompt.
- Check trustlines before receiving non-native assets.

## Backend Roadmap

Recommended implementation order:

1. Auth database implementation with bcrypt.
2. JWT access tokens and HttpOnly refresh cookies.
3. Refresh-token family rotation and revocation.
4. Username uniqueness and profile persistence.
5. Wallet public-key linkage only.
6. Budget allocation persistence.
7. Social posts, groups, comments, and chats.
8. Photo upload storage and moderation controls.
9. Milestone and perk engine.
10. Horizon reads for balances and history.
11. Add-money anchor flow with trustline checks.
12. Payment send flow with confirmation screen and local signing.

## Deployment Notes

Do not deploy to production with mainnet or real funds until:

- Security review is complete.
- Legal/KYC thresholds are validated.
- Backend auth is implemented.
- Secrets are configured outside the repository.
- Rate limits and audit logs are active.
- Data retention and moderation policies are defined.

## License

PiggyBanq is licensed under the MIT License. See `LICENSE`.
