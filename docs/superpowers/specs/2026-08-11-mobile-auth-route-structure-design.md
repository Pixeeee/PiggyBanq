# Mobile Auth Route Structure Design

## Goal

Split the Expo mobile auth flow into clear route files and small shared components so each login path is easier to debug.

## Scope

- Restructure `apps/mobile/app/` from one large `index.tsx` auth file into separate Expo Router pages.
- Keep the current login homepage design.
- Add dedicated pages for importing an existing wallet, creating a local wallet, and provider connection flows.
- Add a splash/entry route that decides whether to show auth or the main dashboard.
- Keep provider integrations as placeholder connection pages for this refactor. Real Freighter, Privy, and Web3Auth SDK/deep-link wiring will be added after the page structure is clean.
- Preserve existing wallet creation/import behavior and SecureStore logic.

## Route Structure

```text
apps/mobile/app/
  _layout.tsx
  index.tsx
  (auth)/
    _layout.tsx
    home.tsx
    import-wallet.tsx
    create-local-wallet.tsx
    recovery.tsx
    connect/
      freighter.tsx
      privy.tsx
      web3auth.tsx
  (tabs)/
    dashboard.tsx
```

## Shared Source Structure

```text
apps/mobile/src/auth/
  components/
    AuthButton.tsx
    AuthCard.tsx
    AuthShell.tsx
    HomeLogin.tsx
    ProviderConnectCard.tsx
    WalletPreviewCard.tsx
  layout.ts
  types.ts
```

The shared auth components own presentation only. Route files own navigation and page-specific behavior. Existing wallet helpers stay in `apps/mobile/src/wallet/`.

## Page Responsibilities

- `app/index.tsx`: splash/entry route. It checks for a stored wallet and redirects to either `/(auth)/home` or `/(tabs)`.
- `app/(auth)/home.tsx`: login homepage with the current wallet preview layout.
- `app/(auth)/import-wallet.tsx`: page opened by `I have a wallet`; imports a Stellar secret key.
- `app/(auth)/create-local-wallet.tsx`: page opened by `Create a local wallet instead`; handles password setup and local wallet creation.
- `app/(auth)/recovery.tsx`: page opened after local wallet creation; lets the user reveal and confirm the Stellar secret key backup.
- `app/(auth)/connect/freighter.tsx`: placeholder Freighter connection page. It explains that native connection detection will be wired later and gives a back action.
- `app/(auth)/connect/privy.tsx`: placeholder Privy connection page.
- `app/(auth)/connect/web3auth.tsx`: placeholder Web3Auth connection page.
- `app/(tabs)/dashboard.tsx`: main wallet/dashboard screen after auth.

## Navigation Behavior

- App launch starts at `/`.
- If no wallet/session is available, `/` redirects to `/(auth)/home`.
- If a wallet is available, `/` redirects to `/(tabs)/dashboard`.
- `I have a wallet` routes to `/(auth)/import-wallet`.
- `Freighter` routes to `/(auth)/connect/freighter`.
- `Privy` routes to `/(auth)/connect/privy`.
- `Web3Auth` routes to `/(auth)/connect/web3auth`.
- `Create a local wallet instead` routes to `/(auth)/create-local-wallet`.
- Successful import routes to `/(tabs)/dashboard`.
- Successful local wallet creation routes to `/(auth)/recovery`, then confirmed backup routes to `/(tabs)/dashboard`.

## Placeholder Provider Behavior

Provider connection pages use a shared `ProviderConnectCard` component. For now each page shows:

- Provider name.
- Connection status copy.
- A primary action that simulates/checks availability with placeholder logic.
- A secondary action to return to the auth home page.

No real external SDK credentials, OAuth setup, native modules, or deep links are added in this refactor.

## Error Handling

- Failed wallet import remains visible on the import page.
- Failed local wallet creation remains visible on the local wallet page.
- Provider placeholders show a clear unavailable/not-yet-wired state without crashing.
- Splash route handles wallet-load failure by sending the user to auth home.

## Testing

Verification should include:

- `corepack pnpm --filter @piggybanq/mobile build`
- `npm test`
- `git diff --check`
- Android build/reload
- Android UI dump showing homepage labels and at least one provider route label
- Fresh app-process logcat check for no React Native runtime errors

## Acceptance Criteria

- `apps/mobile/app/index.tsx` is no longer the giant auth/home/dashboard file.
- Each auth path has a dedicated route file.
- Shared auth UI lives under `apps/mobile/src/auth/`.
- Existing wallet creation/import tests still pass.
- App still launches in Expo Android without redbox errors.
