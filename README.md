# PiggyBanq

PiggyBanq is a self-custodial Stellar testnet wallet and micro-savings product for users who need a low-friction way to start saving without traditional bank onboarding.

The current web app includes a landing page, a secure local wallet gate, a dashboard, profile editing, budget allocation, and a local-first community layer for calamity help posts, pledges, groups, discussions, global chat, and private chat.

## Current Status

This repository is working as a local development build.

- Web landing page: implemented.
- Web dashboard: implemented.
- Secure local wallet creation: implemented with a 12-word recovery phrase, local username uniqueness, strong password rules, PBKDF2, and AES-GCM encrypted local vault storage.
- Wallet login gate: implemented with username and password.
- Profile and budget tools: implemented as local browser state.
- Community tools: implemented as local browser state.
- Expo mobile app: scaffolded with secure local Stellar testnet wallet helpers.
- Backend API: scaffolded, with several routes intentionally returning placeholder status until the production database/auth implementation is completed.

Important: global username uniqueness, durable multi-device sync, production JWT sessions, refresh-token rotation, real-time chat, server-side community persistence, and production Stellar payment flows still require backend implementation before real users or real funds.

## Why Stellar

Stellar is a strong fit for PiggyBanq because it supports self-custodial accounts, low-cost payments, multi-asset balances, and fiat bridge patterns through anchors.

Development currently targets Stellar testnet only:

- Horizon: `https://horizon-testnet.stellar.org`
- Soroban RPC: `https://soroban-testnet.stellar.org`
- Friendbot: `https://friendbot.stellar.org`

## Repository Structure

```text
apps/web          Next.js web app
apps/mobile       Expo mobile app
server            Fastify API scaffold
packages/types    Shared TypeScript domain types
packages/config   Shared config
packages/stellar-core Stellar helper utilities
tests             Node test suite
docs              Product and implementation documentation
```

## Quick Start

Install dependencies:

```powershell
pnpm install
```

Run tests:

```powershell
npm.cmd test
```

Build everything:

```powershell
npm.cmd run build
```

Run the web app after building:

```powershell
cd apps\web
npm.cmd run start -- -p 3010 -H 127.0.0.1
```

Open:

```text
http://127.0.0.1:3010
http://127.0.0.1:3010/dashboard
```

## Security Posture

PiggyBanq is designed around a self-custodial boundary:

- The web wallet vault is encrypted locally.
- The dashboard never needs to send recovery phrases or Stellar secret keys to the backend.
- The backend route comments and logger redaction are written to avoid storing or logging secrets.
- All production payment flows must show a confirmation screen before signing.
- Non-native Stellar assets require trustline checks before receiving.
- Development uses testnet only until legal review, security audit, and production threshold validation are complete.

## Documentation

See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for the detailed setup guide, architecture notes, feature status, and production-readiness checklist.

## License

MIT. See [LICENSE](LICENSE).
