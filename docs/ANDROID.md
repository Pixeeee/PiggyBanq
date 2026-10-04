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

Create wallets and back up their Stellar secret keys. Import a secret key or the web app's12-word BIP39 recovery phrase; the Stellar m/44'/148'/0' derivation matches web. Android-generated secret keys are not a12-word mnemonic. Passwords/usernames are local device credentials, not backend registration.

Overview reads actual Testnet balances and payment activity. Send supports reviewed XLM/official USDC payments and USDC trustline setup. Each review shows destination, amount, asset/issuer, memo, fee and expiry; signing requires the local password. The transaction hash is saved before submission. Uncertain outcomes preserve the hash and block new submissions until ledger reconciliation. PENDING/UNKNOWN is not success. No secret or password is sent to Horizon.

Pending records include the reviewed expiry. A missing transaction is cleared as expired only after the official Horizon service has ingested a ledger closed at or after that expiry and a fresh transaction lookup still returns 404. An unavailable or lagging service keeps the outcome unknown. This also recovers safely when the app closes between saving the signed hash and posting it.

Plans contains editable allocations and goals persisted per wallet via AsyncStorage. These are planning records, not token deposits. They remain on this device and do not synchronize with web. Native swaps, fiat, yield products, bridges, mainnet and social SDK connections are explicitly unavailable; unconfigured provider buttons are hidden in release builds.

## Verification and dependency compatibility

Run `RUN_MOBILE_STELLAR_TESTNET=1 node --test tests/mobile-stellar-live.test.mjs` for disposable live Testnet balance/payment/trustline proof. Emulator verification must additionally test password unlock, backup, manual/background lock, app restart, plans persistence and real UI transaction review. Tests contain public disposable fixture keys, never real wallets.

Metro0.83 requires image-size1's file-path API. Native codegen requires brace-expansion1/2 APIs; keep overrides within those major versions. expo-constants resolves to a single compatible SDK54 version. Use the pnpm lockfile. Four Expo/Metro build-tool advisory exceptions are tracked in docs/DEPENDENCY-SECURITY.md; do not expose dev servers or bundle untrusted patterns/assets. Expo Doctor's checked-in-native/config warning is addressed by explicit Prebuild in launch/build workflows.
