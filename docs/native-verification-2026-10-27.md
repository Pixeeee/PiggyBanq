# Native shared-data verification — 2026-10-27

The native application is `apps/mobile` (Expo/React Native). The selected approach preserves native screens and existing local data, while adding a Sync tab connected to the same Render API and Supabase records as web. No backend deployment or schema migration was needed.

## Verified

- Native TypeScript check passed.
- Full repository suite after swap/agent additions: 148 tests, 139 passed, nine optional integration tests skipped, zero failures.
- Separately enabled live mobile Stellar Testnet tests: two passed. Disposable accounts proved XLM payment signing/confirmation, activity, USDC trustline setup, an actual XLM-to-USDC swap meeting its slippage minimum, and expiry reconciliation.
- Separately enabled native cloud tests: eight passed, including real signed authentication and cross-reading native allocations/profile through the deployed Vercel web API.
- Standalone release APK and instrumentation APK built successfully with Node 24, JBR 21, Android SDK/Build Tools 36.
- Fresh Android API 33 x86_64 emulator (`PiggyBanq_QA`): instrumentation printed `PASS:` after native wallet creation/backup, Friendbot funding, reviewed on-device USDC trustline signing and ledger confirmation, reviewed/password-approved XLM-to-USDC swap and ledger confirmation, agent preview/approval/sandbox execution and receipt persistence, native HTTP cookie authentication, shared allocations/pockets/profile, manual lock/password unlock, reconnect persistence and automatic background lock. Only a disposable public address was sent to Friendbot; the test never exported its phrase or secret key.
- New native recovery phrases restore the same public/secret key on web. Protected-record reload preserves the phrase; mismatched stored phrases fail closed without overwriting records. Existing secret-key wallets remain unchanged.
- Wrong-domain/network/purpose/wallet/expired challenges, different-wallet sessions and post-lock responses are rejected. A verified refresh is required between writes. A new connection waits for previous native cookie cleanup.
- Swap tests reject unsupported/foreign issuers and paths, missing liquidity/trustlines, invalid slippage and tampered review fields. Agent tests prove the 20 USDC sandbox cap, separate approval, expiry after approval, wallet isolation, saved receipts, duplicate-execution rejection and storage failure/corruption behavior.
- The web signup/recovery card now inherits the login card's padding, border radius and surface styling. Desktop 2394×1132 and phone 390×844 layout checks passed against both local and production web. The CSS fix is deployed in production commit `5cc3b80`.

## APK

`apps/mobile/android/app/build/outputs/apk/release/app-release.apk` (about 68 MiB).

SHA-256: `2bc75ae00c350d217c05ab8f1aa7677ca8055c13aca0b72b7627fd0d99c81d61`.

This is a Testnet APK signed with the existing development key, suitable for review/testing. It is not a store-signed production release. The test-only instrumentation code/password is in a separate APK, not the app APK. Install the app APK, open Sync, and approve sign-in with the same wallet used on web. For an existing web wallet, import its phrase into a clean native installation; never erase an existing wallet without a verified backup.

## Limits

This does not establish universal device compatibility or enable every integration. Native Send now includes Swap and Agent screens. Swap is a real Testnet operation through native Horizon/local signing, sharing existing native pending-hash recovery. Server quote/emergency controls do not govern these direct Horizon operations. Agent uses the same sandbox parser/providers as web and never signs or moves wallet funds; its wallet-scoped history is device-local. Hosted live x402 remains disabled. Native pocket credits, demo interest and withdrawals change planning records, not actual blockchain assets. Device-only Save plans remain separate and are never silently merged into shared data. Older secret-only wallets cannot be converted to the original web mnemonic.

iOS compilation, physical-device biometrics, real-device lifecycle/secure-hardware behavior and store signing were not verified on this Linux host. Both the native helper and the actual Android swap screen were exercised against real Testnet, but this does not prove a human flow on every device. Native authentication cookies are managed by the OS HTTP client. Remote logout is best effort if the network fails; local access still locks immediately and requires fresh reviewed authentication to reconnect. No guarantee of provider uptime or Testnet liquidity is implied.

Cloud tests create clearly named disposable accounts and planning records. They never use a real user's wallet, deposit real funds, or alter existing application records. The QA emulator was stopped after verification.
