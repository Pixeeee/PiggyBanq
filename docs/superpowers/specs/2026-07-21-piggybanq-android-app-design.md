# PiggyBanq Android App Design

## Goal

Create an Android-first Expo app surface for PiggyBanq that mirrors the web savings workspace while preserving the self-custodial Stellar safety boundary.

## Scope

- Replace the single-screen mobile scaffold with a usable mobile app shell.
- Keep the app local-first and testnet-only.
- Strengthen wallet activation by requiring explicit backup confirmation before the wallet is considered active.
- Add transaction preparation screens that validate Stellar recipients, require a visible confirmation model, detect non-native trustline needs, and show polling expectations before signing.
- Do not introduce production custody, mainnet defaults, hidden signing, or server-side secret storage.

## Architecture

The mobile app stays in `apps/mobile` and uses Expo Router with React Native primitives. Wallet persistence remains in `expo-secure-store`, while pure guard logic lives in small TypeScript modules so Node tests can verify it without launching Expo. Existing shared Stellar helpers in `packages/stellar-core` remain the authority for address validation, trustline detection, payment confirmation, and transaction polling status.

## Security Requirements

- Store only locally generated Stellar secret material in SecureStore.
- Show the public key freely, but mask it in dashboard summaries.
- Require the user to acknowledge that they backed up the secret key before activation.
- Require biometric/device reauthentication when the platform supports it before showing secret material.
- Never treat `PENDING` as success.
- Always show amount, asset, destination, and fee before a transaction can be signed.
- Keep the network label as `TESTNET`.

## Intentional Limitation

The current mobile package does not include mnemonic or WebCrypto-compatible derivation dependencies. This pass improves the Android app with the installed dependency set and keeps the existing Stellar keypair model, but labels backup as a Stellar secret key backup rather than falsely claiming a BIP39 recovery phrase.
