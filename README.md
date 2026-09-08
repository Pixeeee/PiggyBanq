# PiggyBanq

PiggyBanq is a self-custodial, testnet-first savings workspace. Stellar powers wallet identity, swaps, savings pockets, and the yield simulation; Circle CCTP defines the native-USDC route from Stellar Testnet to Base Sepolia; Binance x402 powers approval-gated agentic payment simulations.

The web app includes a landing page, secure local wallet access, an allocation workspace, Sell/Swap/Bridge/Stake tools, and a deterministic agent command center. Local demo mode does not require funded wallets, provider credentials, or a running API.

## Current Status

This repository is working as a local development build.

- Web landing page: implemented.
- Web dashboard: implemented with Stellar, Circle CCTP, and Binance x402 rail separation.
- Secure local wallet creation: implemented with a 12-word recovery phrase, local username uniqueness, strong password rules, PBKDF2, and AES-GCM encrypted local vault storage.
- Wallet login gate: implemented with username and password.
- Allocation and savings-pocket tools: API-backed with a development-only browser fallback.
- Agentic commands: local preview → approval → sandbox receipt for x402 payments, Stellar swaps, and CCTP bridge intents.
- Cross-chain route: native USDC from Stellar Testnet (domain 27) to Base Sepolia (domain 6) only.
- Community tools: implemented as local browser state.
- Expo mobile app: scaffolded with secure local Stellar testnet wallet helpers.
- Backend API: scaffolded, with several routes intentionally returning placeholder status until the production database/auth implementation is completed.

Important: sandbox receipts are not blockchain settlements, displayed APR is not a real or guaranteed return, and no Stellar-to-BSC USDC route is offered. Production signing, audited Soroban yield contracts, Circle CCTP submission, Binance partner onboarding, compliance review, and monitoring remain required before real users or real funds.

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
http://127.0.0.1:3010/dashboard/allocations
http://127.0.0.1:3010/dashboard/pockets#sell
http://127.0.0.1:3010/dashboard/pockets#swap
http://127.0.0.1:3010/dashboard/pockets#bridge
http://127.0.0.1:3010/dashboard/pockets#stake
```

The development demo account automatically falls back to non-sensitive browser storage if the Fastify API is offline. To exercise the agent command center, try:

```text
Pay 5 USDC to weather-api
Swap 25 XLM to USDC
Bridge 10 USDC to Base
```

Every command creates a five-minute preview and requires explicit approval. The x402 sandbox cap is 20 USDC.

Run the Expo mobile app for local development:

```powershell
npm.cmd run mobile:web
```

Open the live mobile web preview:

```text
http://localhost:8087
```

For native Android emulator/device development:

```powershell
npm.cmd run mobile:android
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
