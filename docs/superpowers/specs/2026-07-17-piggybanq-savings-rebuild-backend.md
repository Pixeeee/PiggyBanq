# PiggyBanq Savings Rebuild Backend Spec

## Scope

The backend becomes a narrow support layer for a self-custodial savings product. It is not a custody system and not a transaction signer.

## Responsibilities

The backend may own:

- app auth/session state
- public wallet address linkage
- supported asset metadata
- configured savings strategy definitions
- cached public portfolio reads
- transaction-preparation payload generation
- event logging and observability

The backend must not own:

- private keys
- seed phrases
- encrypted wallet secrets
- direct authority to move user funds

## API Surface

The rebuilt backend should expose only the routes required for savings:

- auth/session routes if app auth remains
- wallet linkage/status routes
- supported assets routes
- strategy catalog routes
- portfolio read routes
- transaction preparation routes
- transaction history routes

Existing routes for social, milestones, community, budget, unfinished anchor modules, and unrelated product modules should be removed or retired from the active API surface.

## Strategy Layer

The backend must use a strategy abstraction for savings routes. Each strategy adapter should define:

- supported asset
- network
- route identifier
- availability rules
- required trustline/asset prerequisites
- transaction preparation inputs
- public position read behavior

This keeps the app from hardcoding protocol logic directly into pages and route handlers.

## Testnet-Only Enforcement

The backend must enforce `testnet-only` operation in v1.

Required protections:

- reject non-testnet network configuration
- reject unsupported assets
- reject unsupported route identifiers
- reject arbitrary issuer or contract overrides

## Portfolio Reads

The backend may cache public state for performance, but cached data is advisory. Clients should treat the chain and configured strategy route as the canonical source of position state.

## Sessions

If sessions remain, they are for product access only. A valid session must not be enough to submit a funds movement. Funds movement always requires a client-side signature from the locally held wallet.

## Logging

Structured logs may include:

- public address
- route identifier
- asset code
- transaction hash
- lifecycle status

Logs must never include:

- secret key
- seed phrase
- passcode
- raw encrypted wallet payload

## Backend Testing

Backend tests should cover:

- allowlist enforcement
- testnet-only enforcement
- transaction preparation route validation
- refusal to operate without required asset prerequisites
- route availability toggling when a strategy is disabled
