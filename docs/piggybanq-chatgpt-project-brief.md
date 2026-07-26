# PiggyBanq Project Brief

Use this as the project context for ChatGPT.

## Product Summary

PiggyBanq is a savings-focused fintech wallet app built around simple money allocation. The product should focus only on helping users organize money into:

- Overview
- Allocations
- Pockets
- Goals
- Profile

The app should remove unnecessary community/social features and stay focused on saving, budgeting, and token-based earning pockets.

## Core Direction

PiggyBanq is currently testnet-first. The app should support savings and allocation workflows before any real-money or mainnet behavior.

The first supported yielding assets are:

- XLM
- USDT

Future assets can be added later, but the current priority is XLM and USDT only.

## Design Direction

The UI should use a soft, friendly PiggyBanq visual style:

- Pig-themed warm palette
- Soft pink, cream, peach, lilac, and gentle green accents
- Rounded but clean dashboard panels
- Consistent typography across landing, auth, and dashboard
- Web and mobile responsive layout
- Dashboard style should feel like a savings/finance control panel, not a social network

The dashboard should be clean, fast, and smooth. Loading states should feel responsive and lightweight.

## Dashboard Pages

### Overview

Overview should display a combined summary of the user-created data from:

- Allocations
- Pockets
- Goals

It should not include profile settings.

### Allocations

Allocations should show daily inflow and outflow of account assets.

Users should be able to allocate money into categories like:

- Food
- Bills
- Emergency
- Savings
- Custom categories

The page should show saved allocation records from the backend database.

### Pockets

Pockets are earning/savings containers for tokens.

Current supported assets:

- XLM
- USDT

Users should be able to:

- Create an XLM or USDT pocket
- Add money to a pocket
- Record planned withdrawals
- See token balance
- See estimated PHP value

The app should use a Stellar testnet-first approach. Any future real Stellar transaction must show confirmation details before signing.

### Goals

Goals are budget targets for things the user wants to buy or pay for.

Examples:

- Rent
- Internet bill
- Food budget
- Phone
- Tuition
- Emergency fund

Users should be able to create goals and track saved money for each goal.

### Profile

Profile replaces the old Security page.

Users should be able to:

- Update profile name
- Add or edit bio
- Choose preferred currency
- Choose theme

## Backend

The backend should provide real database-backed APIs for:

- Wallet auth session
- User profile
- Budget allocations
- Savings pockets
- Pocket ledger events

Savings pocket balances should be calculated from append-only ledger events, not from editable balance fields.

## Database

The database should persist:

- Users
- Sessions
- Wallet auth challenges
- User profiles
- Budget plans
- Budget categories
- Savings pockets
- Ledger events

Ledger events should be append-only for important money movement records.

## Security Requirements

PiggyBanq is self-custodial. The app must not expand custody without explicit approval.

Security rules:

- Do not store wallet secret keys on the backend.
- Do not silently sign transactions.
- Always require user confirmation before any transaction.
- Show amount, asset, destination, and fee before signing.
- Use secure session cookies.
- Store only hashed session tokens.
- Use server-verified sessions for dashboard access.
- Keep testnet-first until explicitly changed.

## Stellar Requirements

Current focus is Stellar testnet.

Rules:

- Use `Networks.TESTNET` or `Networks.PUBLIC`, not hardcoded passphrase strings.
- Use Horizon for balances and history reads.
- Use Soroban RPC only for contract calls when contracts are introduced.
- If Soroban is used later, simulate transactions before sending.
- `sendTransaction` returning `PENDING` is not final success.
- Poll transaction status until `SUCCESS` or timeout.
- Validate Stellar destination addresses before building transactions.
- Check trustlines before receiving non-native assets like USDT.

## Current Implementation Direction

The project is a monorepo with:

- Next.js web app
- Node/Fastify backend
- Prisma database layer
- Shared packages for Stellar and types

The current local ports are:

- Web: `http://127.0.0.1:3011`
- Backend: `http://127.0.0.1:4000`

## Main Goal

Build PiggyBanq into a simple, secure, savings-first wallet dashboard where users can organize money into allocations, XLM/USDT earning pockets, and savings goals with a polished pig-themed UI.
