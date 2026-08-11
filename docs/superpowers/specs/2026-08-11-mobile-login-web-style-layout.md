# Mobile Login Web-Style Layout

## Goal

Replace only the first Expo mobile login choice screen with the approved web-style reference layout. The layout should match the provided screenshot structure: a wallet/savings segmented pill, hero headline, wallet preview card, two wallet entry buttons, compact identity options, and the local wallet safety footer.

## Scope

In scope:

- Update `apps/mobile/app/index.tsx` for the `authScreen === 'choice'` view in `MobileAuthFlow`.
- Keep existing auth handlers and navigation behavior:
  - `I have a wallet` opens the existing import/login flow.
  - `Freighter` calls the existing Freighter handler.
  - `Privy` and `Web3Auth` keep the existing identity handler.
  - `Create a local wallet instead` opens the existing local wallet creation flow.
- Reuse existing mobile/web pig assets already copied into the Expo app.
- Keep the later password, recovery, and import screens unchanged.

Out of scope:

- New authentication providers.
- Backend changes.
- Wallet creation/import behavior changes.
- New dependencies unless an already-installed icon source is required and verified.

## Layout

The choice screen will be a single Android-friendly vertical layout:

1. Top segmented pill with `Wallet` active and `Savings` inactive.
2. Centered hero:
   - `A New Way`
   - `To Save`
   - `Your self-custodial Stellar wallet.`
3. Dark rounded wallet preview card:
   - `Est. total value`
   - `114.83 XLM`
   - `+ 13.21 (+5.90%) Today`
   - pig image on the right
   - rows for `XLM / USDC` and `USDC / XLM`
4. Two side-by-side rounded buttons:
   - `I have a wallet`
   - `Freighter`
5. Divider text: `OR CONTINUE WITH`
6. Two side-by-side identity buttons:
   - `Privy`
   - `Web3Auth`
7. Footer:
   - `Create a local wallet instead`
   - `Keys never leave your device. Ever.`

## Visual Rules

- Match the reference proportions on Android rather than stretching the content loosely.
- Avoid large dead space at the bottom.
- Preserve readable, non-overlapping text on the Android emulator.
- Use the existing rose, ink, peach, and warm background palette.
- Keep the pig image pixelated/contained and visible.

## Verification

Run:

- `corepack pnpm --filter @piggybanq/mobile build`
- `npm test`
- `git diff --check`

Then reload Expo on Android and verify:

- The choice screen matches the approved reference structure.
- All expected labels are visible.
- `Create a local wallet instead` still opens the password setup screen.
- No `EventTarget`, route export, or uncaught runtime errors appear in Android logs.
