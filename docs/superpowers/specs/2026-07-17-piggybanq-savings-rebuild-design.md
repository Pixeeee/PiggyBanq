# PiggyBanq Savings Rebuild Design

## Purpose

This spec replaces PiggyBanq's current multi-feature product direction with a savings-only product. The rebuilt PiggyBanq focuses on self-custodial savings for `XLM` and `USDT`, real on-chain execution, in-app wallet creation, local signing, and `testnet-only` operation for v1.

The landing page should preserve the pig-led brand identity and palette, but the application after signup/login becomes a compact savings workspace instead of a social-finance dashboard.

## Approved Product Decisions

- Product scope: savings only
- Platforms: web and mobile
- Wallet model: PiggyBanq creates the wallet in-app
- Custody model: self-custodial, device-only key storage
- Signing model: in-app local signing
- Network target: Stellar testnet only
- Savings assets in v1: `XLM` and `USDT`
- Execution model: real on-chain savings flows, not simulated balances

## Product Boundary

PiggyBanq removes or disables the current community, calamity help, groups, chat, budget allocation, milestone, and general-purpose dashboard features. The rebuilt app exposes only the flows needed for a savings product:

1. Create wallet
2. Back up and confirm recovery phrase
3. Unlock wallet locally
4. Fund wallet on Stellar testnet
5. Choose savings asset: `XLM` or `USDT`
6. Deposit into a configured savings strategy
7. View position, yield, and history
8. Withdraw from the savings strategy

This keeps the product narrow enough to secure and implement well on both web and mobile.

## Architecture Summary

PiggyBanq should be rebuilt as one shared savings product model with two clients:

- `apps/web`
- `apps/mobile`

The server is reduced to a coordination and metadata layer. It can provide authenticated app access, public account linkage, supported asset metadata, configured strategy definitions, cached portfolio reads, and transaction-preparation payloads. It must not act as custodian and must not store wallet secrets, seed phrases, or raw secret keys.

The chain integration layer should be strategy-based from day one, even though v1 supports only two savings assets. This prevents the rebuild from hardcoding one route directly into UI code and makes later expansion possible without another structural rewrite.

## Protocol Constraint

The implementation must use one allowlisted testnet savings strategy per supported asset. The exact yield protocol route is an implementation gate, not a user choice.

Because real protocol support can vary by asset and by testnet availability, PiggyBanq must enforce the following rule:

- `XLM` and `USDT` are only enabled if a validated testnet route exists for that asset
- unsupported routes must not appear in the UI
- the backend must reject any asset, contract, issuer, or pool outside the configured allowlist

If implementation discovery proves that no valid testnet yield route exists for one of the two approved assets, PiggyBanq should still ship the rebuild with the supported live asset and explicitly mark the other as unavailable on testnet. The UI and docs must state this plainly rather than simulating a live protocol position.

## Data Ownership

The source of truth for balances and savings positions is Stellar plus the configured protocol route. The app database stores only application metadata and cached public state needed for UX, observability, and support workflows.

PiggyBanq owns:

- public wallet address linkage
- local-wallet setup state
- recovery confirmation state
- supported asset preferences
- savings position references
- transaction history cache
- audit and event logs

PiggyBanq does not own:

- private keys
- seed phrases
- canonical savings balances
- canonical protocol position state

## Security Model

PiggyBanq is self-custodial. Wallet secrets stay on-device only.

- On web, the secret is encrypted in browser storage.
- On mobile, the secret is encrypted and stored with device secure storage.
- The user must confirm the recovery phrase before moving past wallet creation.
- Every deposit and withdrawal requires an explicit confirmation screen showing asset, amount, route, and fee before signing.
- App sessions may control application access, but they never authorize funds movement on their own.

## UX Direction

The first page keeps the pig identity and palette, but the signed-in surfaces should be quieter and more operational. The rebuilt dashboard becomes a savings workspace instead of a feature catalog.

The primary surfaces are:

- landing page
- signup/login
- recovery backup
- wallet home / savings dashboard
- deposit flow
- withdraw flow
- transaction history
- settings and recovery guidance

## Testing Focus

The highest-risk paths define the initial test plan:

- wallet creation and recovery confirmation gating
- encrypted local wallet storage
- login and redirect into the savings dashboard
- transaction preparation correctness
- asset allowlist enforcement
- testnet-only configuration
- trustline checks for `USDT`
- explicit confirmation before signing
- successful deposit and withdrawal completion states

## Delivery Strategy

This rebuild should replace the current product surface instead of layering new savings behavior onto the existing app. The implementation can prioritize web completeness first, but the architecture, docs, and API contracts must be shared across web and mobile from the start.

## Focused Specs

The following companion documents define the implementation boundaries in more detail:

- [Frontend Spec](D:/PiggyBanq/docs/superpowers/specs/2026-07-17-piggybanq-savings-rebuild-frontend.md)
- [Backend Spec](D:/PiggyBanq/docs/superpowers/specs/2026-07-17-piggybanq-savings-rebuild-backend.md)
- [Database Spec](D:/PiggyBanq/docs/superpowers/specs/2026-07-17-piggybanq-savings-rebuild-database.md)
- [Security Spec](D:/PiggyBanq/docs/superpowers/specs/2026-07-17-piggybanq-savings-rebuild-security.md)
- [Stellar Spec](D:/PiggyBanq/docs/superpowers/specs/2026-07-17-piggybanq-savings-rebuild-stellar.md)
