# PiggyBanq Savings Rebuild Frontend Spec

## Scope

This frontend spec covers the rebuilt web and mobile clients for the savings-only PiggyBanq product.

## Product Surfaces

The rebuilt frontend should contain these surfaces only:

1. Landing page
2. Signup / login
3. Wallet creation
4. Recovery phrase confirmation
5. Local unlock
6. Savings dashboard
7. Deposit flow
8. Withdraw flow
9. Position and transaction history
10. Settings / recovery guidance

All community, budget, milestones, pledges, social feeds, and chat surfaces should be removed from the primary navigation and from the implementation plan.

## Landing Page Direction

The landing page keeps the pig identity and color palette as the brand anchor. It should stop advertising unrelated features and instead frame PiggyBanq as a simple, self-custodial savings product on Stellar testnet.

Required landing themes:

- pig-led visual identity
- savings-first messaging
- `XLM` and `USDT` testnet savings
- self-custodial local wallet
- real on-chain execution

## App Experience

After login, the user should land on a single savings dashboard. The dashboard should show:

- wallet status
- available assets
- total savings balance
- current positions
- yield/APR display from the configured strategy
- deposit action
- withdraw action
- recent activity

The dashboard should not present unrelated feature panels.

## Shared Frontend Model

Web and mobile should share the same conceptual state model:

- wallet state
- lock/unlock state
- recovery-confirmed state
- portfolio state
- supported asset catalog
- strategy availability
- transaction draft state
- transaction submission state

The clients may differ in storage implementation and interaction details, but they must not diverge in product behavior.

## Wallet UX

Wallet creation must:

- generate a Stellar wallet locally
- display the recovery phrase once
- require explicit recovery confirmation
- block access to savings actions until confirmation is completed

Unlock flow must:

- require a local passcode or equivalent device protection
- never round-trip secrets to the backend
- restore only encrypted local key material

## Deposit / Withdraw UX

Deposit and withdraw flows must:

- make the selected asset explicit
- show the exact savings route being used
- validate amount before transaction preparation
- display confirmation before signing
- show pending, success, and failure states clearly

No savings transaction should be signed silently.

## Web-Specific Requirements

- Browser storage must use encrypted local storage for wallet secrets
- Session state must be separate from wallet authorization
- API base URL handling must stay production-safe for cross-origin deployment
- Redirect after successful login must land on the rebuilt savings dashboard

## Mobile-Specific Requirements

- Wallet secrets must use device secure storage
- Recovery confirmation and unlock flows must be optimized for smaller screens
- Mobile must share the same asset catalog and strategy rules as web

## Frontend Testing

Frontend tests should cover:

- landing page savings copy and navigation
- wallet creation gating
- recovery confirmation requirement
- login redirect to dashboard
- deposit confirmation rendering
- withdraw confirmation rendering
- disabled state for unsupported assets or unavailable strategies
