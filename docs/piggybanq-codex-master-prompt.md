# PiggyBanq - Codex Master Build Prompt

Paste this entire prompt into Codex.

## Product

Title: PiggyBanq

Idea: No-KYC Micro Savings Account

Problem: Many Filipinos remain unbanked because onboarding and KYC requirements are too heavy for small, urgent savings needs.

Solution: Build a self-custodial Stellar wallet that lets users start saving with zero custodial banking dependency, while enforcing configurable regulatory-limit placeholders and clear mainnet/legal gates.

Why Stellar:
- Self-custodial wallet model: users control keys, not PiggyBanq.
- Low-cost payments and fast settlement.
- Horizon can read balances and account history.
- Stellar RPC can submit and poll transactions.
- SEP-24 anchors can support PHP and USD deposit or withdrawal flows through licensed providers.
- Stellar Consensus Protocol provides the network consensus foundation.

Primary reference: use the Stellar Fullstack App guide at https://github.com/StellarX26/stellarX-workshop/blob/main/stellar-fullstack-cheatsheet.md. Follow its current `@stellar/stellar-sdk` patterns, especially the `rpc` namespace, fresh account sequence loading, Horizon balance reads, explicit transaction confirmation, and pending transaction polling.

## Build Target

Create a production-grade monorepo for synced web and mobile:
- Web: Next.js App Router, TypeScript, server components where appropriate, Playwright tests.
- Mobile: Expo with Expo Router, TypeScript, SecureStore for local sensitive mobile storage.
- API: Node.js TypeScript service with structured validation, authentication, rate limiting, and audit logging.
- Database: Postgres through Prisma or Drizzle.
- Cache and realtime: Redis plus WebSocket or managed realtime service for chat and social updates.
- Shared packages: domain types, Stellar utilities, validation schemas, auth contracts, wallet models, and design tokens.

Web and mobile must sync through the same server API and database. Device-local storage is only for private keys, refresh/session material where platform appropriate, and offline cache. Never fork business logic between web and app.

## UI Direction

Use the same font system and color palette everywhere:
- Cream: `#FFF7CD`
- Peach: `#FDC3A1`
- Salmon: `#FB9B8F`
- Rose: `#F57799`
- Text dark: `#4A2C2A`
- Text mid: `#7A4A45`
- Surface: `#FFF0E0`

Use `public/piggy.png` as the landing page hero background. The landing page must be the first route at `/`, and the authenticated app dashboard must live separately at `/dashboard` or under an app shell route.

The dashboard style should keep the PiggyBanq reference feel: compact side navigation, dense finance cards, thin borders, sharp 8px cards, pixel/mono display typography, and utility-first information hierarchy. Apply the same palette as the landing page.

No fake dashboard data. Empty users must see real empty states such as "No wallet linked", "No pockets created yet", and "No ledger events yet". Only display balances, transactions, relief posts, messages, profile data, perks, and budgets that come from the API, local wallet state, Horizon, or Stellar RPC.

Avoid marketing-only screens. Build usable product surfaces first.

## Core Features

1. Authentication and sessions
- Register and login with email or phone.
- Hash passwords with bcrypt using a current cost factor.
- Issue short-lived JWT access tokens.
- Rotate refresh tokens.
- Store web refresh tokens in Secure, HttpOnly, SameSite cookies.
- Store mobile refresh material in Expo SecureStore.
- Detect refresh-token reuse and revoke the session family.
- Add rate limiting for auth routes.
- Add optional MFA using TOTP.
- Add account recovery flows that never recover Stellar secret keys.

2. Self-custodial Stellar wallet
- Generate wallet keys on device only.
- Backend stores public keys only.
- Never send secret keys, recovery phrases, or unsigned secrets to the backend.
- Web storage must encrypt local wallet material before persistence.
- Mobile storage must use SecureStore plus platform biometrics when available.
- Require backup confirmation before activating high-risk actions.
- Support Testnet first with Friendbot funding.
- Mainnet must remain disabled until security audit and legal review are complete.

3. Stellar payments and balances
- Use `@stellar/stellar-sdk`.
- Use `rpc.Server` from the SDK, not deprecated `SorobanRpc`.
- Use `Networks.TESTNET` for testnet passphrase configuration.
- Use Horizon for account balances and transaction history.
- Load the source account fresh before building a payment transaction so sequence numbers are current.
- Build XDR locally, show a confirmation screen, sign locally, submit through RPC, then poll pending status every second up to a defined timeout.
- Handle `PENDING`, `SUCCESS`, timeout, failed transaction, and network errors explicitly.
- Add trustline preflight for anchored PHP or USD assets. Native XLM must not require a trustline.

4. Savings pockets
- Let users create named savings pockets.
- Track allocations in an append-only app-layer ledger tied to the user's public key.
- Support budget allocations by pesos, dollars, and supported crypto assets.
- Do not imply bank deposits, insurance, or guaranteed returns.
- Add monthly budget allocation rules for expense categories.
- Let users customize profile, display name, avatar, privacy settings, and budget preferences.

5. Anchors and fiat rails
- Add SEP-24 deposit and withdrawal integration behind a provider abstraction.
- Support PHP and USD anchor configuration.
- Confirm the anchor is licensed and configured before production use.
- Keep deposits and withdrawals auditable.
- Never hardcode a production anchor until legal/compliance approval exists.

6. Social relief layer
- Add Facebook-like community features, but keep finance controls explicit:
  - Global feed.
  - Calamity help posts with photo upload.
  - Community groups.
  - Topic discussions.
  - Global chat.
  - Private chat.
  - Donation or pledge flow.
- Donations must require an explicit transaction confirmation before funds move.
- Add content moderation, abuse reporting, privacy controls, and blocked-user handling.
- Store media through signed upload URLs and scan uploads.

7. Milestones and perks
- Track milestones such as first wallet backup, first pocket created, first completed savings goal, consistent monthly saving, and community help participation.
- Perks must be utility or cosmetic unless legal review approves financial incentives.
- Record perk grants in an auditable table.
- Prevent duplicate grants with idempotency keys.

## Data Model

Implement at minimum:
- User
- AuthSession
- RefreshTokenFamily
- MfaFactor
- WalletAccount
- SavingsPocket
- PocketLedgerEntry
- BudgetPlan
- BudgetAllocation
- AnchorProvider
- AnchorTransfer
- StellarTransactionRecord
- ReliefPost
- ReliefPostMedia
- DonationPledge
- CommunityGroup
- GroupMembership
- FeedPost
- ChatThread
- ChatMessage
- UserProfile
- Milestone
- Perk
- PerkGrant
- AuditLog
- RateLimitEvent

All tables must have created and updated timestamps where relevant. Finance and auth events require audit records.

## Security Requirements

Implement a secure authentication system using JWT access tokens, refresh tokens, HttpOnly cookies, bcrypt password hashing, rate limiting, and optional MFA.

Also implement:
- HTTPS-only production configuration.
- HSTS in production.
- Strict CORS allowlist.
- CSRF protection for cookie-backed web routes.
- Input validation with shared schemas.
- Output encoding and safe rendering for user content.
- Server-side authorization checks on every protected API route.
- Object-level access control for wallets, pockets, posts, chats, and profile data.
- Structured audit logs without secrets.
- Secret scanning in CI.
- Dependency update workflow.
- Security headers.
- File upload size/type validation.
- Malware or content scanning hook for uploaded images.
- Database encryption strategy for sensitive profile and auth metadata.
- No logs containing JWTs, refresh tokens, passwords, Stellar secrets, recovery phrases, or private messages.

## Phased Delivery

Phase 0 - Foundations
- Monorepo scaffold.
- Shared TypeScript config and linting.
- Shared design tokens.
- Web landing page at `/` using `public/piggy.png` as background.
- App shell dashboard at `/dashboard`.
- API health route.
- Database schema and migrations.
- Unit test harness.

Phase 1 - Auth and profiles
- Register, login, logout.
- JWT access token and refresh token rotation.
- HttpOnly cookie web sessions.
- SecureStore mobile sessions.
- Rate limiting.
- Optional MFA.
- Profile customization.

Phase 2 - Wallet and Stellar testnet
- Generate or import testnet wallet locally.
- Backup confirmation.
- Public key registration.
- Friendbot funding for testnet.
- Horizon balance read.
- Payment confirmation, local signing, RPC submission, and status polling.
- No server-side signing.

Phase 3 - Savings pockets and budgets
- Create pockets.
- Append-only pocket ledger.
- Monthly allocation rules.
- Budget categories.
- Multi-currency display preferences.
- Real dashboard cards fed only by API and Stellar state.

Phase 4 - Anchor rails
- SEP-24 provider abstraction.
- PHP and USD anchor config.
- Deposit and withdrawal initiation.
- Transfer status tracking.
- Compliance gates before production.

Phase 5 - Social and relief communities
- Feed posts.
- Photo help posts.
- Groups.
- Global and private chat.
- Donation pledge flow with explicit transaction confirmation.
- Moderation and reporting.

Phase 6 - Milestones and perks
- Milestone event tracking.
- Perk rules.
- Idempotent perk grants.
- User-facing milestone history.

Phase 7 - Hardening
- Threat model.
- Security tests.
- Playwright web flows.
- Expo mobile smoke tests.
- Load tests for feed and chat.
- Accessibility checks.
- Audit log review.
- Production readiness checklist.

## Testing Requirements

Use test-driven development for risky changes:
- Unit tests for domain rules, validation, auth token rotation, Stellar transaction builders, trustline preflight, and pocket ledger math.
- Integration tests for auth, wallet registration, pockets, budgets, anchor transfers, relief posts, chats, and milestones.
- Playwright tests for landing, dashboard empty state, auth flows, wallet connect, and transaction confirmation.
- Mobile smoke tests for Expo navigation, secure storage, wallet backup, and session restore.
- Security tests for rate limits, CSRF, authz, upload validation, and secret redaction.

Every dashboard value that looks financial must have a traceable source. Do not use placeholder balances, placeholder transaction rows, or synthetic users in production UI.

## Acceptance Criteria

- `/` is a real landing page using `public/piggy.png` as the background.
- `/dashboard` renders a usable app dashboard with the shared palette and fonts.
- A brand-new user sees honest empty states, not sample balances.
- Web and mobile share schemas, auth contracts, and API data.
- Secret keys never leave the device.
- Auth uses JWT access tokens, refresh token rotation, HttpOnly cookies on web, bcrypt password hashing, rate limiting, and optional MFA.
- Stellar integration follows the Stellar Fullstack App guide's current SDK patterns.
- SEP-24 support is provider-based and gated for compliance.
- Social relief donations require explicit confirmation before payment.
- Milestones and perks are tracked with idempotency and auditability.
- Tests and build pass before completion.
