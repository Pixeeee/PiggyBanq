# PiggyBanq Agentic Payments, Stellar Yield, and Dashboard Design

## Status

Approved for local-first implementation on 2026-09-08.

## Source of truth

The user's request is authoritative. `PiggyBanq_AI_Blockchain_Savings_Architecture.md` is reference material only; its architectural recommendations are adopted only where they fit the current codebase and the project's self-custody guardrails.

## Product outcome

PiggyBanq becomes a two-rail savings workspace:

- **Stellar** owns wallet identity, savings pockets, testnet swaps, and the yield experience.
- **Circle CCTP** is the approved cross-chain route for native USDC between Stellar Testnet and Base Sepolia.
- **Binance Agentic Wallet and Binance x402** own agent-authorized payment and on-chain payment experiences after assets reach a supported Binance wallet network.
- **PiggyBanq Core** owns intent parsing, policy checks, previews, explicit approval, execution state, receipts, and audit history.

No Binance or Circle integration may receive a Stellar secret key. No provider may silently sign or move funds.

## Local-first execution boundary

The first release must work without funded wallets, Binance credentials, or a production database.

- Stellar operations use `TESTNET` configuration only.
- Base destinations use Base Sepolia semantics in the local CCTP route.
- Binance x402 uses a deterministic sandbox adapter when partner credentials are absent.
- The sandbox creates realistic quotes, approval states, receipts, and audit events but never claims a real blockchain settlement.
- UI labels must say `Sandbox`, `Testnet`, or `Simulation` wherever a result is not on-chain.
- Live provider adapters remain disabled unless their required environment variables and explicit feature flags are present.

## Provider boundaries

### Stellar yield rail

The existing savings-pocket ledger remains the source for local savings positions. Locked-earn positions become explicitly sourced as a `stellar-testnet-simulation` strategy until an audited Soroban vault exists.

Supported local assets:

- XLM: native Stellar Testnet asset.
- USDC: testnet asset that requires an issuer and trustline when a live transaction is introduced.

Yield screens must show:

- strategy source;
- whether the rate is simulated or live;
- APR rather than a guaranteed return;
- principal, duration, estimated return, and maturity;
- confirmation before position creation;
- a warning that testnet assets have no monetary value.

### Stellar swap rail

The local swap flow supports XLM to USDC and USDC to XLM quote intents. A quote contains:

- input and estimated output;
- minimum received;
- exchange-rate source;
- slippage tolerance;
- network fee estimate;
- quote expiry;
- `TESTNET` label.

Local execution records a sandbox receipt. A later live adapter must use Stellar path payments, validate trustlines, build a transaction for client-side signing, and poll until terminal success.

### CCTP bridge rail

Only native USDC is bridgeable in the approved route:

```text
XLM -> Stellar swap to USDC -> Circle CCTP -> USDC on Base
```

The local route is:

- source: Stellar Testnet, CCTP domain 27;
- destination: Base Sepolia, CCTP domain 6;
- asset: native USDC only;
- method: Standard Transfer simulation;
- destination: validated EVM address;
- execution: sandbox receipt with burn, attestation, and mint stages.

Stellar-to-BSC USDC bridging is unavailable in this release. The UI must explain that Circle CCTP does not currently support USDC on BSC and must not offer an invented route.

### Binance agentic payment rail

The local agent can interpret a narrow, deterministic command vocabulary:

- `Pay <amount> USDC to <recipient>`
- `Swap <amount> XLM to USDC`
- `Bridge <amount> USDC to Base`

Unrecognized commands are rejected with examples. The command interpreter is not presented as unrestricted AI reasoning.

Every x402 payment uses:

```text
Intent -> policy -> quote -> user approval -> sandbox settle -> receipt
```

Policy defaults:

- USDC only for local x402 payments;
- maximum 20 USDC per sandbox payment;
- no external withdrawal capability;
- no autonomous approval;
- recipient and service URL required;
- HTTPS required outside localhost;
- idempotency key per intent;
- approval expires with the quote.

When a live x402 adapter is later enabled, supported tokens and networks must come from Binance's `/papi/v2/b402/supported` endpoint rather than hardcoded assumptions.

## Data model

Add an additive Prisma migration with:

- `AgentAction`: user-owned intent, provider, action type, status, request payload, policy result, approval and execution timestamps.
- `ProviderReceipt`: one-to-one execution receipt with network, external reference, and provider payload.

No API key, access token, private signing key, mnemonic, or wallet secret is stored in these records.

Local demo mode stores non-sensitive sandbox actions in browser storage so all flows remain usable when the Fastify API is offline. Production mode uses authenticated backend routes.

## API contracts

Authenticated Fastify routes:

- `GET /agentic/capabilities`
- `POST /agentic/intents/preview`
- `POST /agentic/intents/:id/approve`
- `POST /agentic/intents/:id/execute`
- `GET /agentic/intents`

The sandbox provider implements the same domain contract as future live adapters.

Errors use stable codes:

- `UNSUPPORTED_ACTION`
- `UNSUPPORTED_ROUTE`
- `POLICY_REJECTED`
- `QUOTE_EXPIRED`
- `APPROVAL_REQUIRED`
- `INTENT_NOT_FOUND`
- `PROVIDER_UNAVAILABLE`

## Dashboard information architecture

The dashboard adopts shadcn-style composition using the existing CSS stack rather than introducing Tailwind solely for this change. Reusable primitives include cards, badges, tabs, alerts, progress, field groups, and confirmation panels.

Visual language is inherited from the landing page:

- white and warm-ivory canvas;
- dark brown ink;
- rose primary actions;
- peach/salmon highlights;
- warm borders and restrained shadows;
- Geist for dense interface text;
- editorial serif accents only for high-level headings;
- tabular numerals for balances, quotes, and rates.

The hero section is out of scope and must not change.

### `/dashboard`

- Account summary and combined testnet balances.
- Rail status cards for Stellar Yield, CCTP Bridge, and Binance x402 Sandbox.
- Agent command center with examples and preview/approval flow.
- Recent cross-rail activity with status badges.
- Clear next action for empty/demo states.

### `/dashboard/allocations`

- Preserve create, edit, delete, reorder, and drag/drop behavior.
- Replace the visually dense board with warm shadcn-style cards and a clearer allocation composer.
- Keep inflow/outflow context, but visually subordinate static sample metrics to editable allocations.
- Include loading, empty, success, and actionable error states.

### `/dashboard/pockets#sell`

- Open the Sell tab on load/hash change.
- Provide a local testnet off-ramp intent preview with amount, asset, estimate, fees, and confirmation.
- Label the action as sandbox until a licensed anchor is integrated.

### `/dashboard/pockets#swap`

- Open the Swap tab on load/hash change.
- Support XLM/USDC local quote and confirmation.
- Show estimated output, minimum received, slippage, and network fee.

### Stake

- Preserve pocket creation, balance events, maturity checks, and withdrawal controls.
- Rename generic yield claims to sourced Stellar Testnet simulation language.
- Group creation, forecast, positions, and safety information into a tabbed, responsive layout.

## Interaction and accessibility

- Every mutation has a distinct preview and approval step.
- Buttons expose loading and disabled states.
- Errors state what failed and how to recover.
- Partial provider failures do not blank the whole dashboard.
- Hash tabs update the URL and respond to browser navigation.
- Focus indicators are visible and match the rose palette.
- Status is conveyed by text and iconography, never color alone.
- Motion respects `prefers-reduced-motion`.
- Mobile layouts remain operable at 320px without horizontal page scrolling.

## Out of scope

- Production or mainnet settlement.
- Real yield or guaranteed returns.
- A new Soroban vault contract.
- Live Stellar-to-BSC bridging.
- Autonomous trading, futures, margin, or external withdrawals.
- Storing provider credentials in the browser.
- Modifying the landing-page hero.

## Acceptance criteria

- All three sandbox commands produce a preview, require approval, and create a receipt locally.
- Stellar-to-Base is the only bridge route shown as available.
- No Stellar-to-BSC USDC route is offered.
- Dashboard, allocations, sell, swap, and stake surfaces share the landing palette and responsive component language.
- Existing allocation and pocket mutations remain wired.
- New pure domain tests cover parsing, policy rejection, quote expiry, and route constraints.
- Prisma migration is additive and Prisma validation passes.
- Full tests and the web production build pass.
- Visual verification covers desktop and mobile for every requested URL.
