# Mobile Login Safe-Area Fit Design

## Goal

Keep the Expo mobile login screen visually aligned with the approved wallet layout while making it fit on Android devices without scrolling. The screen must not overlap the status bar at the top or the Android gesture/navigation area at the bottom.

## Scope

- Update the first mobile auth choice screen and its app-level safe-area wrapper.
- Preserve the existing auth flow, button handlers, wallet creation/import behavior, and pig asset.
- Keep the first login screen non-scrollable.
- Leave password, recovery, import, dashboard, and transaction screens functionally unchanged.

## Layout Behavior

The root Expo layout will provide safe-area context. The login screen will consume safe-area insets and apply top and bottom padding based on the actual device cutouts/system bars.

The first login screen will use responsive sizing instead of fixed large vertical gaps. Device height will determine a compactness scale:

- Normal/tall devices keep the current visual proportions.
- Medium devices tighten vertical gaps and slightly reduce card/button heights.
- Short devices tighten gaps more and reduce hero/card typography enough for every element to remain visible without scrolling.

The footer link and safety text must sit above the bottom inset. The top Wallet/Savings control must sit below the top inset.

## Components

- `RootLayout`: wraps Expo Router with `SafeAreaProvider`.
- `MobileAuthFlow`: uses `useSafeAreaInsets` and `useWindowDimensions`.
- Choice-screen styles: become generated from a compact layout profile instead of relying only on static constants.
- Other auth screens: continue using their existing card/scroll behavior where appropriate.

## Error Handling

If safe-area values are zero on an emulator or web preview, fallback padding keeps the layout away from the physical edges.

## Testing

Verification should include:

- `corepack pnpm --filter @piggybanq/mobile build`
- `npm test`
- `git diff --check`
- Android launch/reload
- Android UI dump confirming the login labels are visible
- Fresh app-process logcat confirming no React Native redbox/runtime errors

## Acceptance Criteria

- No first-login content overlaps the Android status bar.
- No footer content overlaps the Android navigation/gesture bar.
- The first-login screen fits without scrolling on short, medium, and tall Android displays.
- Existing auth behavior remains unchanged.
