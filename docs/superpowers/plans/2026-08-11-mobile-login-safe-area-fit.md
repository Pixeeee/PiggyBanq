# Mobile Login Safe-Area Fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Expo mobile login screen fit without scrolling while avoiding Android status bar and navigation bar overlap.

**Architecture:** Provide safe-area context at the Expo Router root. In `MobileAuthFlow`, read safe-area insets and window dimensions, derive a compact login layout profile, and apply that profile only to the first auth choice screen. Keep existing auth behavior and later auth screens unchanged.

**Tech Stack:** Expo Router, React Native, TypeScript, `react-native-safe-area-context`, existing Expo Android toolchain.

## Global Constraints

- Keep the first login screen non-scrollable.
- Preserve the existing auth flow, button handlers, wallet creation/import behavior, and pig asset.
- Do not change password, recovery, import, dashboard, or transaction behavior.
- Top content must clear the Android status bar.
- Footer content must clear the Android gesture/navigation bar.
- Verify with `corepack pnpm --filter @piggybanq/mobile build`, `npm test`, `git diff --check`, Android UI dump, and fresh app-process logcat.

---

### Task 1: Add Safe-Area Context

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Test: `tests/mobile-wallet-create.test.mjs`

**Interfaces:**
- Consumes: Existing Expo Router `Stack`.
- Produces: A `SafeAreaProvider` wrapping the stack so child screens can read insets.

- [ ] **Step 1: Update the mobile source test**

Add assertions to `tests/mobile-wallet-create.test.mjs`:

```js
  assert.match(layout, /SafeAreaProvider/);
  assert.match(screen, /useSafeAreaInsets/);
  assert.match(screen, /useWindowDimensions/);
  assert.match(screen, /createLoginFitLayout/);
```

- [ ] **Step 2: Wrap the router stack**

Change `apps/mobile/app/_layout.tsx` to:

```tsx
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
```

---

### Task 2: Derive Responsive Login Fit Values

**Files:**
- Modify: `apps/mobile/app/index.tsx`

**Interfaces:**
- Consumes: `height`, `width`, `insets.top`, and `insets.bottom`.
- Produces: `createLoginFitLayout({ height, width, insets })`, returning the spacing and sizing values used by the first login choice screen.

- [ ] **Step 1: Import layout APIs**

Update imports in `apps/mobile/app/index.tsx`:

```tsx
import { Image, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

- [ ] **Step 2: Add helper types and clamp function**

Add near the existing auth types:

```tsx
type LoginFitLayoutInput = {
  height: number;
  insets: { bottom: number; top: number };
  width: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
```

- [ ] **Step 3: Add `createLoginFitLayout`**

Add a helper that compresses the screen on shorter displays:

```tsx
function createLoginFitLayout({ height, insets, width }: LoginFitLayoutInput) {
  const safeTop = Math.max(insets.top, 22);
  const safeBottom = Math.max(insets.bottom, 18);
  const compact = height < 720 ? 'short' : height < 820 ? 'medium' : 'regular';
  const horizontal = width < 360 ? 14 : 16;

  return {
    screen: {
      paddingBottom: safeBottom + (compact === 'short' ? 6 : 10),
      paddingHorizontal: horizontal,
      paddingTop: safeTop + (compact === 'short' ? 4 : 10)
    },
    heroMarginTop: compact === 'short' ? 22 : compact === 'medium' ? 34 : 46,
    heroFontSize: compact === 'short' ? 28 : compact === 'medium' ? 31 : 34,
    heroLineHeight: compact === 'short' ? 31 : compact === 'medium' ? 34 : 37,
    walletCardMarginTop: compact === 'short' ? 24 : compact === 'medium' ? 32 : 40,
    walletCardMinHeight: compact === 'short' ? 142 : compact === 'medium' ? 154 : 167,
    walletPigSize: compact === 'short' ? { height: 58, width: 70 } : compact === 'medium' ? { height: 66, width: 78 } : { height: 74, width: 84 },
    buttonMarginTop: compact === 'short' ? 22 : compact === 'medium' ? 32 : 42,
    buttonMinHeight: compact === 'short' ? 44 : 48,
    dividerMarginTop: compact === 'short' ? 24 : compact === 'medium' ? 34 : 43,
    identityMarginTop: compact === 'short' ? 10 : 14,
    identityMinHeight: compact === 'short' ? 44 : 50,
    footerMarginTop: compact === 'short' ? 22 : compact === 'medium' ? 32 : 42,
    maxWidth: clamp(width - horizontal * 2, 288, 430)
  };
}
```

---

### Task 3: Wire Fit Values Into The Choice Screen

**Files:**
- Modify: `apps/mobile/app/index.tsx`

**Interfaces:**
- Consumes: `createLoginFitLayout`.
- Produces: Safe-area aware, non-scrollable first login screen.

- [ ] **Step 1: Read dimensions and insets**

Inside `MobileAuthFlow`, before `return`, add:

```tsx
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const loginFit = useMemo(() => createLoginFitLayout({ height, insets, width }), [height, insets, width]);
```

- [ ] **Step 2: Apply safe screen padding**

Update the outer screen style:

```tsx
<View style={[entryScreenStyle, loginFit.screen]}>
```

- [ ] **Step 3: Apply responsive choice width**

Update the choice wrapper:

```tsx
<View style={[entryChoiceStyle, { maxWidth: loginFit.maxWidth }]}>
```

- [ ] **Step 4: Apply responsive first-screen styles**

Update the affected choice-screen style usage:

```tsx
<View style={[entryHeroStyle, { marginTop: loginFit.heroMarginTop }]}>
...
<Text style={[entryHeroTitleStyle, { fontSize: loginFit.heroFontSize, lineHeight: loginFit.heroLineHeight }]}>
...
<View style={[walletPreviewCardStyle, { marginTop: loginFit.walletCardMarginTop, minHeight: loginFit.walletCardMinHeight }]}>
...
<Image resizeMode="contain" source={piggyImage} style={[walletPreviewPigStyle, loginFit.walletPigSize]} />
...
<View style={[entryWalletButtonsStyle, { marginTop: loginFit.buttonMarginTop }]}>
...
<Pressable ... style={[entryWalletButtonStyle, { minHeight: loginFit.buttonMinHeight }]}>
...
<Pressable ... style={[entryFreighterButtonStyle, { minHeight: loginFit.buttonMinHeight }, isCreating ? entryDisabledButtonStyle : null]}>
...
<View style={[entryDividerStyle, { marginTop: loginFit.dividerMarginTop }]}>
...
<View style={[entryIdentityGridStyle, { marginTop: loginFit.identityMarginTop }]}>
...
style={[entryIdentityCompactButtonStyle, { minHeight: loginFit.identityMinHeight }]}
...
<View style={[entryFooterStyle, { marginTop: loginFit.footerMarginTop }]}>
```

- [ ] **Step 5: Remove static edge padding/margins where overridden**

Keep the base style constants as fallbacks, but make sure the runtime styles above override `paddingTop`, `paddingBottom`, `marginTop`, `minHeight`, and `maxWidth`.

---

### Task 4: Verify Fit And Runtime Health

**Files:**
- Modify: none

**Interfaces:**
- Consumes: Updated mobile app.
- Produces: Verification evidence.

- [ ] **Step 1: Run static checks**

Run:

```bash
corepack pnpm --filter @piggybanq/mobile build
npm test
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 2: Run Android with Java and SDK paths**

Run:

```bash
export JAVA_HOME=/home/kimz/.jdks/jbr-17.0.14
export ANDROID_HOME=/home/kimz/Android/Sdk
export ANDROID_SDK_ROOT=/home/kimz/Android/Sdk
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
corepack pnpm --filter @piggybanq/mobile android
```

Expected: Android build/install succeeds or the already installed app refreshes against Metro.

- [ ] **Step 3: Check Android labels**

Run:

```bash
adb shell uiautomator dump /sdcard/piggybanq-safe-area-fit.xml >/dev/null
adb exec-out cat /sdcard/piggybanq-safe-area-fit.xml | rg "Wallet|A New Way|To Save|Est\\. total value|Freighter|OR CONTINUE WITH|Create a local wallet instead|Keys never leave"
```

Expected: all labels are visible.

- [ ] **Step 4: Check fresh app logs**

Run:

```bash
adb logcat -c
sleep 3
pid=$(adb shell pidof -s com.anonymous.piggybanq | tr -d '\r')
adb logcat -d --pid="$pid" -t 500 | rg "ReferenceError|EventTarget|Uncaught Error|Route \"\\./index\\.tsx\"|ReactNativeJS|ERROR|AndroidRuntime|FATAL EXCEPTION" || true
```

Expected: no matching app runtime errors.
