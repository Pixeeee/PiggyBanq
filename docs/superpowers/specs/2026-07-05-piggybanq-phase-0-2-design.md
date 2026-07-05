# PiggyBanq Phase 0-2 Design

## Scope

This spec covers PiggyBanq Phase 0 through Phase 2 from the master build prompt. The landing page, anchor integration, budget features, social layer, milestones, and production mainnet behavior are out of scope until Phase 0-2 are stable and demoable.

## Architecture

PiggyBanq starts as a pnpm/Turborepo TypeScript monorepo with separate boundaries for web, mobile, server, shared Stellar logic, shared API types, and shared configuration. The backend stores only app data and public Stellar addresses; plaintext secret keys and mnemonics never cross the client boundary.

The first runnable slice emphasizes correctness over breadth:

- Shared `packages/types` defines constants, DTO shapes, and validators used by clients and server.
- Shared `packages/stellar-core` owns Stellar network constants, destination validation, transaction polling state, payment confirmation models, and trustline preflight logic.
- `server` owns auth/session schemas, wallet public-key linkage, ledger events, savings pockets, and Prisma schema inventory.
- `apps/web` and `apps/mobile` are scaffolded as clients but only contain enough structure to consume shared packages in this phase.

## Data Flow

Auth creates a user and refresh-token family server-side. Wallet creation happens client-side: the client generates or imports key material, forces mnemonic backup confirmation, stores the secret locally, then links only the public key to the backend. Wallet reads use Horizon testnet. Signing happens locally after an explicit confirmation model containing amount, asset, destination, and estimated fee.

Savings pockets are app-layer sub-ledger records over one Stellar account in v1. Pocket transfers are represented by append-only ledger events and never imply separate on-chain accounts. This is documented in code and README because the future path is account multiplexing or sponsored-reserve smart wallets.

## Security Decisions

- `KYC_FREE_LIMIT_PHP` is a placeholder constant set to `50000`; README flags that current BSP/AMLC thresholds must be verified before production.
- Stellar development uses `Networks.TESTNET`, Horizon testnet, Friendbot, and Soroban RPC testnet.
- `sendTransaction` `PENDING` is not success; polling must continue until success, failure, timeout, or unknown status.
- Backend models and APIs store public keys only.
- Relief pledges, social features, automated deposits, and E2EE claims remain out of scope.

## Error Handling

Shared helpers return typed results rather than throwing for expected validation failures. Server routes use schemas at the boundary, centralized error handling, structured redaction rules, and explicit audit-log models for financial actions.

## Testing

Phase 0-2 starts with dependency-free Node tests for security-sensitive helpers. Framework-level tests can be added after dependencies are installed. The initial test surface covers KYC constants, public-key validation, transaction polling state handling, payment confirmations, trustline requirements, and savings ledger math.

## Implementation Order

1. Create root monorepo metadata, docs, and AI guardrails.
2. Write failing tests for shared constants and Stellar/wallet helpers.
3. Implement shared `types` and `stellar-core`.
4. Add Prisma schema inventory and server module skeleton.
5. Add web/mobile app skeletons without landing page.
6. Run tests and build checks available without network dependencies.

