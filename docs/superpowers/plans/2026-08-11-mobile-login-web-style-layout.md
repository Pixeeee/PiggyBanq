# Mobile Login Web-Style Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Expo mobile first login choice screen with the approved web-style wallet login layout.

**Architecture:** Keep the existing `MobileAuthFlow` state machine and handlers. Replace only the `authScreen === 'choice'` JSX and its supporting styles in `apps/mobile/app/index.tsx`, reusing the existing pig asset and auth callbacks.

**Tech Stack:** Expo Router, React Native, TypeScript, existing local image assets, Node test runner.

## Global Constraints

- Update only the first mobile login choice screen in `MobileAuthFlow`.
- Keep password, recovery, and import screens unchanged.
- Do not add backend behavior or authentication provider behavior.
- Reuse existing pig assets already present in `apps/mobile/assets`.
- Verify with `corepack pnpm --filter @piggybanq/mobile build`, `npm test`, and `git diff --check`.
- Reload Expo Android and check for visible labels and no app runtime errors.

---

### Task 1: Guard The New Mobile Login Surface

**Files:**
- Modify: `tests/mobile-wallet-create.test.mjs`

**Interfaces:**
- Consumes: Existing source-string assertions for `apps/mobile/app/index.tsx`.
- Produces: Test coverage that requires the new choice-screen labels and preview copy.

- [ ] **Step 1: Add source assertions**

Add assertions inside `test('Expo app exposes secure local Stellar testnet wallet creation', () => { ... })`:

```js
  assert.match(screen, /A New Way/);
  assert.match(screen, /To Save/);
  assert.match(screen, /Your self-custodial Stellar wallet\./);
  assert.match(screen, /Est\. total value/);
  assert.match(screen, /114\.83/);
  assert.match(screen, /XLM \/ USDC/);
  assert.match(screen, /USDC \/ XLM/);
  assert.match(screen, /OR CONTINUE WITH/);
```

- [ ] **Step 2: Run test to verify it fails before implementation**

Run: `npm test`

Expected before implementation: FAIL because the new labels are not yet in `apps/mobile/app/index.tsx`.

---

### Task 2: Replace The Choice Screen Markup

**Files:**
- Modify: `apps/mobile/app/index.tsx`

**Interfaces:**
- Consumes: Existing props in `MobileAuthFlow`: `onContinueWithFreighter`, `onStartLogin`, `onChooseSocialIdentity`, `onStartCreateWallet`, `socialIdentityProviders`, `isCreating`.
- Produces: New JSX blocks using existing handlers.

- [ ] **Step 1: Replace only the `authScreen === 'choice'` inner layout**

Change the choice screen content to this structure:

```tsx
<View style={entryChoiceStyle}>
  <View style={entrySegmentStyle}>
    <Text style={entrySegmentActiveTextStyle}>Wallet</Text>
    <Text style={entrySegmentInactiveTextStyle}>Savings</Text>
  </View>

  <View style={entryHeroStyle}>
    <Text style={entryHeroTitleStyle}>
      A New Way{'\n'}
      <Text style={entryHeroAccentStyle}>To Save</Text>
    </Text>
    <Text style={entryHeroSubtitleStyle}>Your self-custodial Stellar wallet.</Text>
  </View>

  <View style={walletPreviewCardStyle}>
    <View style={walletPreviewTopStyle}>
      <View style={{ flex: 1 }}>
        <Text style={walletPreviewLabelStyle}>Est. total value</Text>
        <Text style={walletPreviewValueStyle}>
          114.83 <Text style={walletPreviewUnitStyle}>XLM</Text>
        </Text>
        <Text style={walletPreviewGainStyle}>+ 13.21 (+5.90%) Today</Text>
      </View>
      <Image resizeMode="contain" source={piggyImage} style={walletPreviewPigStyle} />
    </View>
    <View style={walletPreviewRowsStyle}>
      <WalletPreviewRow change="+0.12%" pair="XLM / USDC" />
      <WalletPreviewRow change="+9.25%" pair="USDC / XLM" />
    </View>
  </View>

  <View style={entryWalletButtonsStyle}>
    <Pressable accessibilityRole="button" onPress={onStartLogin} style={entryWalletButtonStyle}>
      <Text style={entryWalletButtonTextStyle}>I have a wallet</Text>
    </Pressable>
    <Pressable
      accessibilityRole="button"
      disabled={isCreating}
      onPress={onContinueWithFreighter}
      style={[entryFreighterButtonStyle, isCreating ? entryDisabledButtonStyle : null]}
    >
      <Text style={entryFreighterButtonTextStyle}>{isCreating ? 'Opening...' : 'Freighter'}</Text>
    </Pressable>
  </View>

  <View style={entryDividerStyle}>
    <View style={entryDividerLineStyle} />
    <Text style={entryDividerTextStyle}>OR CONTINUE WITH</Text>
    <View style={entryDividerLineStyle} />
  </View>

  <View style={entryIdentityGridStyle}>
    {socialIdentityProviders.map((provider) => (
      <Pressable
        accessibilityRole="button"
        key={provider.id}
        onPress={() => onChooseSocialIdentity(provider)}
        style={entryIdentityCompactButtonStyle}
      >
        <View style={entryIdentityCompactIconStyle}>
          <Text style={entryIdentityCompactIconTextStyle}>{provider.id === 'privy' ? 'P' : 'W'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={entryIdentityCompactLabelStyle}>
            {provider.id === 'privy' ? 'Privy' : 'Web3Auth'}
          </Text>
          <Text numberOfLines={1} style={entryIdentityCompactMetaStyle}>
            Google, X, email, o...
          </Text>
        </View>
      </Pressable>
    ))}
  </View>

  <View style={entryFooterStyle}>
    <Pressable accessibilityRole="button" onPress={onStartCreateWallet} style={entryFooterLinkStyle}>
      {({ pressed }) => (
        <Text style={[entryFooterLinkTextStyle, pressed ? linkButtonPressedTextStyle : null]}>
          Create a local wallet instead
        </Text>
      )}
    </Pressable>
    <Text style={entryFooterSafetyTextStyle}>+ Keys never leave your device. Ever.</Text>
  </View>
</View>
```

- [ ] **Step 2: Add `WalletPreviewRow` helper**

Add this helper near `AuthButton`:

```tsx
function WalletPreviewRow({ change, pair }: { change: string; pair: string }) {
  return (
    <View style={walletPreviewRowStyle}>
      <Text style={walletPreviewPairStyle}>{pair}</Text>
      <Text style={walletPreviewChangeStyle}>{change}</Text>
    </View>
  );
}
```

---

### Task 3: Add Reference-Matching React Native Styles

**Files:**
- Modify: `apps/mobile/app/index.tsx`

**Interfaces:**
- Consumes: JSX style names from Task 2.
- Produces: Style constants used by the new layout.

- [ ] **Step 1: Replace obsolete choice-screen styles**

Remove or stop using the previous choice-only styles that are no longer referenced:

```ts
entryBrandStyle
entryBadgeStyle
entryBadgeIconStyle
entryBadgeTextStyle
entryTitleStyle
entrySubtitleStyle
entryActionsStyle
entryPigStageStyle
entryPigImageStyle
entrySafetyTextStyle
identityPanelStyle
entryIdentityPanelOffsetStyle
identityTitleStyle
identityButtonStyle
identityIconStyle
identityIconTextStyle
identityButtonLabelStyle
identityButtonMetaStyle
identityArrowStyle
identityFootnoteStyle
choiceLinkButtonStyle
```

Keep shared styles still used by later screens, including `linkButtonStyle`, `linkButtonTextStyle`, and `linkButtonPressedTextStyle`.

- [ ] **Step 2: Add new style constants**

Add compact React Native style constants matching the approved reference. Use warm background, dark wallet card, rose accent, rounded buttons, two-column identity buttons, and a footer near the bottom without large dead space.

---

### Task 4: Verify Android Behavior

**Files:**
- Modify: none

**Interfaces:**
- Consumes: Updated app and tests.
- Produces: Verification evidence.

- [ ] **Step 1: Run static verification**

Run:

```bash
corepack pnpm --filter @piggybanq/mobile build
npm test
git diff --check
```

Expected: all pass.

- [ ] **Step 2: Reload Expo Android**

Run or use existing Metro:

```bash
export ANDROID_HOME=/home/kimz/Android/Sdk
export ANDROID_SDK_ROOT=/home/kimz/Android/Sdk
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
adb shell uiautomator dump /sdcard/piggybanq-web-style-login.xml >/dev/null
adb exec-out cat /sdcard/piggybanq-web-style-login.xml | rg "A New Way|To Save|Est\\. total value|Freighter|OR CONTINUE WITH|Create a local wallet instead|Keys never leave|Uncaught Error|Log [0-9]+ of [0-9]+"
```

Expected: target labels appear and no error overlay text appears.

- [ ] **Step 3: Check app logs**

Run:

```bash
adb logcat -d -t 500 | rg "ReferenceError|EventTarget|Uncaught Error|Route \"\\./index\\.tsx\"|ERROR" || true
```

Expected: no app runtime errors.
