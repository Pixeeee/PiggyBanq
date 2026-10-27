# Android testnet release

Use Node24, pnpm11.7.0, JDK17 and Android SDK36/BuildTools36.0.0. Set JAVA_HOME and ANDROID_HOME; install NDK27.1.12297006 and CMake3.22.1 and accept SDK licenses.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm mobile:build
pnpm mobile:android
```

The Android launch command synchronizes checked-in native files with Expo Prebuild. For a standalone APK without Metro:

```sh
pnpm --filter @piggybanq/mobile exec expo prebuild --platform android --no-install
cd apps/mobile/android
NODE_ENV=production ./gradlew :app:assembleRelease --max-workers=4 --console=plain
```

Windows: use gradlew.bat and set NODE_ENV=production separately. APK: apps/mobile/android/app/build/outputs/apk/release/app-release.apk. Install with `adb install -r <apk>`. The checked-in development signing key allows updating this test build. Store distribution requires a private release keystore/EAS signing setup, reviewed store metadata and device testing; no private signing key is included. CI builds the test APK after these changes are pushed.

## Implemented behavior

Wallet keys stay in native SecureStore. A salted PBKDF2-SHA256 verifier gates local password unlock; SecureStore provides native encryption of the record. Launch and background transitions lock the wallet and hide secret/password inputs. Screenshot/app-preview capture is blocked. Backup confirmation persists and is required before the dashboard or transactions. Existing/corrupt records cannot be overwritten by create/import; legacy wallets can receive password protection without changing their keys. If a password is lost, use backed-up key/phrase on a separate clean device; do not erase the only copy of a wallet without its backup.

New wallets generate a 12-word BIP39 recovery phrase with the same Stellar m/44'/148'/0' derivation as web. The phrase is kept in SecureStore and revealed only through the existing backup controls. Import a secret key or web phrase; all existing wallet keys and records are preserved. An older secret-key wallet cannot be converted into the original mnemonic. Passwords remain local device credentials; Sync offers separate backend account registration/authentication.

Overview reads actual Testnet balances and payment activity. Send supports reviewed XLM/official USDC payments and USDC trustline setup. Each review shows destination, amount, asset/issuer, memo, fee and expiry; signing requires the local password. The transaction hash is saved before submission. Uncertain outcomes preserve the hash and block new submissions until ledger reconciliation. PENDING/UNKNOWN is not success. No secret or password is sent to Horizon.

Pending records include the reviewed expiry. A missing transaction is cleared as expired only after the official Horizon service has ingested a ledger closed at or after that expiry and a fresh transaction lookup still returns 404. An unavailable or lagging service keeps the outcome unknown. This also recovers safely when the app closes between saving the signed hash and posting it.

Save contains editable allocations and goals persisted per wallet via AsyncStorage. These existing device-only records are never silently uploaded, merged, or deleted. Sync uses the same Render API and Supabase records as web. Connect with the same wallet, review the domain/Testnet authentication message, and approve local signing; only a signature and public account information leave the device. Existing web accounts are detected automatically. New accounts require an available username. The native HTTP cookie session is checked against the unlocked wallet. Cloud responses are discarded after lock, and reconnect requires fresh approval.

Sync supports shared goal/allocation create, edit, delete and per-month ordering; shared profile edits; flexible/demo locked pockets, credits/debits, maturity and demo withdrawal. The web Goals and Allocations pages currently use the same budget categories, so native reflects that data model. Pocket balances and forecast interest are planning/demo records, not live blockchain assets or yield. Refresh after an interrupted write before attempting another change. No API/database secrets are bundled.

Send → Swap supports actual XLM ↔ official Testnet USDC path payments back to the same wallet. It uses the existing native Horizon client, local signing, password confirmation, fee/reserve checks and persisted pending-hash reconciliation. A trustline and live supported route are required. Slippage choices match web (0.5%, 1%, 2%). Reviews show the quoted output, minimum received, issuers, path, source/destination, fee and expiry. Before signing, the client independently checks decoded XDR against those fields, rejects hidden operations/foreign issuers, and requires the reviewed slippage floor. Closing the review or locking the wallet before persistence/broadcast prevents submission. As with existing native transfers, these direct Horizon operations do not use server-side quote/emergency controls.

Send → Agent uses the same command parser, policy checks and deterministic sandbox providers as the web command center. Preview, approval and execution are separate actions. Simulated payment commands retain the 20 USDC cap; quotes expire after five minutes, including approved-but-unexecuted quotes. History and clearly labeled sandbox receipts persist per wallet via AsyncStorage and remain local, as the web command center's browser history does. Storage failures/corruption block changes without inventing successful receipts. It never signs a wallet transaction, calls an AI model, or turns on real x402/bridge/fiat settlement.

Hosted live x402 stays disabled; native paid-API screens are therefore not exposed as functioning payments. Fiat, actual yield, real bridges, mainnet and native social SDK connections remain unavailable. This release implements the web's available swap and sandbox-agent flows, not a claim that every integration is enabled. Unconfigured social provider buttons remain hidden in release builds.

## Verification and dependency compatibility

Run `RUN_MOBILE_STELLAR_TESTNET=1 node --test tests/mobile-stellar-live.test.mjs` for disposable live Testnet balance/payment/trustline proof. Emulator verification must additionally test password unlock, backup, manual/background lock, app restart, plans persistence and real UI transaction review. Tests contain public disposable fixture keys, never real wallets.

`RUN_MOBILE_CLOUD_LIVE=1 node --test tests/mobile-cloud.test.mjs` checks the deployed signed-auth client and verifies that native writes are visible through Vercel's web API. Its cookie jar adapter is a Node test helper; the Android instrumentation check below additionally exercises actual native cookie behavior.

For a **disposable, empty QA emulator only**, build `:app:assembleRelease :app:assembleAndroidTest`, install both generated APKs, and run:

```sh
adb shell am instrument -w com.anonymous.piggybanq.test/com.anonymous.piggybanq.test.NativeParityInstrumentation
```

This creates a random unfunded wallet, a cloud test account and test planning records. Never run it against a phone holding a real wallet. A successful run must print `PASS:`; the custom runner can return process exit zero even when its result text says `FAIL:`. It never dumps recovery phrases or the accessibility tree. Linux cannot build or verify iOS; physical-device biometrics, background behavior and store release signing still require separate verification.

Metro0.83 requires image-size1's file-path API. Native codegen requires brace-expansion1/2 APIs; keep overrides within those major versions. expo-constants resolves to a single compatible SDK54 version. Use the pnpm lockfile. Four Expo/Metro build-tool advisory exceptions are tracked in docs/DEPENDENCY-SECURITY.md; do not expose dev servers or bundle untrusted patterns/assets. Expo Doctor's checked-in-native/config warning is addressed by explicit Prebuild in launch/build workflows.
