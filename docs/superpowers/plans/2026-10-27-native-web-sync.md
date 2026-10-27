# Native Web Sync Implementation Plan

**Goal:** Keep native screens and connect the mobile wallet to the existing web account and shared data, preserving all local records.

**Architecture:** Use the existing signed Stellar challenge and cookie session over HTTPS. Add a native shared workspace for budget categories (also the web's goals), savings pockets, and profile. Existing device planning records remain separate and are never silently uploaded, merged, or deleted. Local unlock and background locking continue to protect signing.

**Tech Stack:** Existing Expo/React Native, Stellar SDK, Render API and Supabase PostgreSQL; no new dependencies or database migrations.

**User decision:** Keep native screens and add shared account/data sync, preserving existing local plans.

## Constraints

- No secret keys, passwords, recovery phrases or database credentials sent to the API.
- Review the authentication message before local signing. Pin the expected application domain and Testnet purpose.
- Abort pending requests and clear visible cloud records on lock/unmount. Require a new approved login after unlock.
- Show failures without substituting sample data. Never automatically retry mutations.
- Pocket balances and interest are planning/demo records, not confirmed blockchain balances or actual yield.
- Hosted x402 remains disabled; do not change deployment, custody or network policy.

## Steps

- [x] Test the native API boundary: auth proof, session expiry, stale requests, validation, HTTPS and exact minor-unit formatting.
- [x] Implement the native client using the existing backend endpoints and cookie semantics.
- [x] Add native account approval, allocations CRUD/order, pockets and profile controls using existing UI components.
- [x] Retain local plans and expose the new shared workspace from the dashboard.
- [x] Run native typecheck, focused and full tests, live Testnet helpers, Android bundle/build and available runtime checks.
- [x] Document verified behavior, outstanding parity gaps, device verification and APK signing limitations in `docs/native-verification-2026-10-27.md`.

## Review focus

Wrong-account responses; wallet locking during authentication; expired sessions; uncertain write outcomes; corrupt local storage; hosted service outages. Testnet network helper tests do not replace physical Android/iOS UI and secure-hardware checks.
