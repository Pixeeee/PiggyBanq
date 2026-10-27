# Native shared-data verification — 2026-10-27

The native application is `apps/mobile` (Expo/React Native). The selected approach preserves native screens and existing local data, while adding a Sync tab connected to the same Render API and Supabase records as web. No backend deployment or schema migration was needed.

## Verified

- Native TypeScript check passed.
- Full repository suite: 141 tests, 132 passed, nine optional integration tests skipped, zero failures.
- Separately enabled live mobile Stellar Testnet tests: two passed. Disposable accounts proved XLM payment signing/confirmation, activity, USDC trustline setup and expiry reconciliation.
- Separately enabled native cloud tests: eight passed, including real signed authentication and cross-reading native allocations/profile through the deployed Vercel web API.
- Standalone release APK and instrumentation APK built successfully with Node 24, JBR 21, Android SDK/Build Tools 36.
- Fresh Android API 33 x86_64 emulator (`PiggyBanq_QA`): instrumentation printed `PASS:` after actual native wallet creation, 12-word backup acknowledgement, reviewed authentication signing, native HTTP cookie session, allocation save, shared pocket creation/credit, profile update, manual lock/password unlock, reconnect persistence and automatic background lock.
- New native recovery phrases restore the same public/secret key on web. Protected-record reload preserves the phrase; mismatched stored phrases fail closed without overwriting records. Existing secret-key wallets remain unchanged.
- Wrong-domain/network/purpose/wallet/expired challenges, different-wallet sessions and post-lock responses are rejected. A verified refresh is required between writes. A new connection waits for previous native cookie cleanup.

## APK

`apps/mobile/android/app/build/outputs/apk/release/app-release.apk` (about 68 MiB).

SHA-256: `6201e0615a15605a66b2e0f3b8371d4f4ae34ea0f18b31241e1c7617acec0787`.

This is a Testnet APK signed with the existing development key, suitable for review/testing. It is not a store-signed production release. The test-only instrumentation code/password is in a separate APK, not the app APK. Install the app APK, open Sync, and approve sign-in with the same wallet used on web. For an existing web wallet, import its phrase into a clean native installation; never erase an existing wallet without a verified backup.

## Limits

This does not establish 100% web feature parity or universal device compatibility. Native swap and agent/x402 screens remain absent. Hosted x402 is still disabled. Native pocket credits, demo interest and withdrawals change planning records, not actual blockchain assets. Device-only Save plans remain separate and are never silently merged into shared data. Older secret-only wallets cannot be converted to the original web mnemonic.

iOS compilation, physical-device biometrics, real-device lifecycle/secure-hardware behavior and store signing were not verified on this Linux host. The automated mobile transaction proof exercises the native helper against real Testnet; it does not prove a human payment flow on every device. Native authentication cookies are managed by the OS HTTP client. Remote logout is best effort if the network fails; local access still locks immediately and requires fresh reviewed authentication to reconnect. No guarantee of provider uptime is implied.

Cloud tests create clearly named disposable accounts and planning records. They never use a real user's wallet, deposit real funds, or alter existing application records. The QA emulator was stopped after verification.
