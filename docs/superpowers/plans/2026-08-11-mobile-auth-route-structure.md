# Mobile Auth Route Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the Expo mobile auth flow into focused route files and shared components so each login path is easier to debug.

**Architecture:** Move global mobile wallet/session state into a shared provider under `apps/mobile/src/auth/`. Keep route files small: root splash/redirect, auth home, import wallet, create local wallet, recovery, provider connection pages, and dashboard. Shared presentational auth components live under `apps/mobile/src/auth/components/`.

**Tech Stack:** Expo Router, React Native, TypeScript, `react-native-safe-area-context`, Expo SecureStore wallet helpers, existing Node test runner.

## Global Constraints

- Keep the current login homepage design.
- Keep provider integrations as placeholder connection pages for this refactor.
- Preserve existing wallet creation/import behavior and SecureStore logic.
- Preserve local wallet recovery/backup handling.
- Do not add external SDK credentials, OAuth setup, native modules, or real provider deep links.
- Avoid an Expo Router duplicate root conflict by keeping `app/index.tsx` as splash and using `app/(tabs)/dashboard.tsx` for the dashboard.
- Verify with `corepack pnpm --filter @piggybanq/mobile build`, `npm test`, `git diff --check`, Android UI dump, and fresh app-process logcat.

---

### Task 1: Update Structure Tests

**Files:**
- Modify: `tests/mobile-wallet-create.test.mjs`

**Interfaces:**
- Consumes: Route files and shared source files created by later tasks.
- Produces: Assertions that guard the new folder structure and copied labels/logic.

- [ ] **Step 1: Aggregate mobile source files**

Replace the current single `screen` read with an array of route/source paths:

```js
  const appIndexPath = 'apps/mobile/app/index.tsx';
  const routePaths = [
    appIndexPath,
    'apps/mobile/app/(auth)/home.tsx',
    'apps/mobile/app/(auth)/import-wallet.tsx',
    'apps/mobile/app/(auth)/create-local-wallet.tsx',
    'apps/mobile/app/(auth)/recovery.tsx',
    'apps/mobile/app/(auth)/connect/freighter.tsx',
    'apps/mobile/app/(auth)/connect/privy.tsx',
    'apps/mobile/app/(auth)/connect/web3auth.tsx',
    'apps/mobile/app/(tabs)/dashboard.tsx',
    'apps/mobile/src/auth/session.tsx',
    'apps/mobile/src/auth/layout.ts',
    'apps/mobile/src/auth/types.ts',
    'apps/mobile/src/auth/components/HomeLogin.tsx',
    'apps/mobile/src/auth/components/ProviderConnectCard.tsx',
    'apps/mobile/src/auth/components/WalletPreviewCard.tsx',
    'apps/mobile/src/dashboard/DashboardHome.tsx'
  ];

  for (const routePath of routePaths) {
    assert.equal(existsSync(routePath), true, `${routePath} should exist`);
  }

  const screen = routePaths.map((routePath) => readFileSync(routePath, 'utf8')).join('\n');
  const appIndex = readFileSync(appIndexPath, 'utf8');
```

- [ ] **Step 2: Update polyfill ordering assertions**

Change:

```js
  const polyfillImportIndex = screen.indexOf("../src/polyfills/stellar-sdk-react-native");
  const walletImportIndex = screen.indexOf("../src/wallet/create-local-wallet");
```

to:

```js
  const polyfillImportIndex = layout.indexOf("../src/polyfills/stellar-sdk-react-native");
  const sessionImportIndex = layout.indexOf("../src/auth/session");
  const walletImportIndex = readFileSync('apps/mobile/src/auth/session.tsx', 'utf8').indexOf("../wallet/create-local-wallet");
```

Assert:

```js
  assert.notEqual(polyfillImportIndex, -1);
  assert.notEqual(sessionImportIndex, -1);
  assert.equal(polyfillImportIndex < sessionImportIndex, true);
  assert.notEqual(walletImportIndex, -1);
```

- [ ] **Step 3: Add structure assertions**

Add:

```js
  assert.doesNotMatch(appIndex, /MobileAuthFlow/);
  assert.doesNotMatch(appIndex, /WalletPanel/);
  assert.match(appIndex, /SplashScreen/);
  assert.match(screen, /ProviderConnectCard/);
  assert.match(screen, /native connection is not wired yet/);
  assert.match(screen, /dashboard/);
```

---

### Task 2: Create Shared Auth Session And Layout Modules

**Files:**
- Create: `apps/mobile/src/auth/types.ts`
- Create: `apps/mobile/src/auth/layout.ts`
- Create: `apps/mobile/src/auth/session.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Produces: `MobileSessionProvider`, `useMobileSession`, `palette`, `createLoginFitLayout`, and shared auth types.

- [ ] **Step 1: Create shared types**

Create `apps/mobile/src/auth/types.ts` with:

```ts
export type ProviderId = 'freighter' | 'privy' | 'web3auth';

export type SocialIdentityProvider = {
  id: 'privy' | 'web3auth';
  label: string;
  methods: string;
};

export type WalletSetupMode = 'create' | 'import';
```

- [ ] **Step 2: Move palette and login fit helper**

Create `apps/mobile/src/auth/layout.ts` exporting `palette`, `socialIdentityProviders`, `clamp`, and `createLoginFitLayout`.

- [ ] **Step 3: Create session provider**

Create `apps/mobile/src/auth/session.tsx` that:

- Loads stored wallet with `loadStoredLocalWallet()`.
- Holds wallet/import/password/backup/status state.
- Exports `validateMobilePassword`.
- Exports `MobileSessionProvider`.
- Exports `useMobileSession`.
- Exposes async actions `createLocalWallet`, `importWallet`, `revealSecretForBackup`, and sync action `confirmBackup`.

- [ ] **Step 4: Wrap root layout**

Update `apps/mobile/app/_layout.tsx` so the polyfill import is first, then wrap `Stack` with `SafeAreaProvider` and `MobileSessionProvider`.

---

### Task 3: Create Shared Auth Components

**Files:**
- Create: `apps/mobile/src/auth/components/AuthButton.tsx`
- Create: `apps/mobile/src/auth/components/AuthCard.tsx`
- Create: `apps/mobile/src/auth/components/AuthShell.tsx`
- Create: `apps/mobile/src/auth/components/HomeLogin.tsx`
- Create: `apps/mobile/src/auth/components/ProviderConnectCard.tsx`
- Create: `apps/mobile/src/auth/components/WalletPreviewCard.tsx`

**Interfaces:**
- Consumes: `palette`, `createLoginFitLayout`, auth session values, and navigation callbacks.
- Produces: reusable auth UI used by route files.

- [ ] **Step 1: Extract auth controls**

Create `AuthButton.tsx` and `AuthCard.tsx` with the existing `AuthButton`, `AuthInput`, `PasswordInput`, `CheckboxRow`, and card styles.

- [ ] **Step 2: Extract auth shell**

Create `AuthShell.tsx` for safe-area auth pages and toast display.

- [ ] **Step 3: Extract wallet preview**

Create `WalletPreviewCard.tsx` with the wallet preview card and row component.

- [ ] **Step 4: Extract homepage**

Create `HomeLogin.tsx` with the current login homepage layout and callbacks:

```ts
type HomeLoginProps = {
  authError: string;
  authStatus: string;
  isCreating: boolean;
  onCreateLocalWallet: () => void;
  onImportWallet: () => void;
  onProviderConnect: (provider: 'freighter' | 'privy' | 'web3auth') => void;
};
```

- [ ] **Step 5: Create provider placeholder card**

Create `ProviderConnectCard.tsx` using `Alert.alert` for the placeholder connection popup and visible copy containing `native connection is not wired yet`.

---

### Task 4: Create Expo Router Pages

**Files:**
- Replace: `apps/mobile/app/index.tsx`
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/home.tsx`
- Create: `apps/mobile/app/(auth)/import-wallet.tsx`
- Create: `apps/mobile/app/(auth)/create-local-wallet.tsx`
- Create: `apps/mobile/app/(auth)/recovery.tsx`
- Create: `apps/mobile/app/(auth)/connect/freighter.tsx`
- Create: `apps/mobile/app/(auth)/connect/privy.tsx`
- Create: `apps/mobile/app/(auth)/connect/web3auth.tsx`
- Create: `apps/mobile/app/(tabs)/dashboard.tsx`

**Interfaces:**
- Consumes: `useMobileSession`, shared auth components, and dashboard component from Task 5.
- Produces: clean page-level route files.

- [ ] **Step 1: Replace root index with splash redirect**

`apps/mobile/app/index.tsx` should export a small `Index` route and local `SplashScreen` component. It redirects to `/(auth)/home` if no wallet exists and `/(tabs)/dashboard` if a wallet exists.

- [ ] **Step 2: Add auth stack layout**

Create `apps/mobile/app/(auth)/_layout.tsx` with a headerless `Stack`.

- [ ] **Step 3: Add auth home route**

Create `home.tsx` that renders `HomeLogin` and routes buttons to import, create, and provider pages.

- [ ] **Step 4: Add import route**

Create `import-wallet.tsx` that renders `AuthShell` + `AuthCard`, uses `importWallet`, and redirects to `/(tabs)/dashboard` after success.

- [ ] **Step 5: Add create route**

Create `create-local-wallet.tsx` that renders password setup, uses `createLocalWallet`, and redirects to `/(auth)/recovery` after success.

- [ ] **Step 6: Add recovery route**

Create `recovery.tsx` that renders secret-key backup UI, uses `revealSecretForBackup`, and redirects to `/(tabs)/dashboard` after `confirmBackup`.

- [ ] **Step 7: Add provider routes**

Create three provider routes rendering `ProviderConnectCard`.

- [ ] **Step 8: Add dashboard route**

Create `dashboard.tsx` that redirects back to auth if no wallet exists, otherwise renders `DashboardHome`.

---

### Task 5: Move Dashboard UI

**Files:**
- Create: `apps/mobile/src/dashboard/DashboardHome.tsx`

**Interfaces:**
- Consumes: `useMobileSession`, `createMobilePaymentReview`, `MobileStoredWallet`, and existing wallet state/actions.
- Produces: `DashboardHome` component used by `app/(tabs)/dashboard.tsx`.

- [ ] **Step 1: Move dashboard constants and components**

Move existing dashboard UI from `apps/mobile/app/index.tsx` into `DashboardHome.tsx`: `Header`, `WalletPanel`, `SavingsWorkspace`, `PocketsPanel`, `GoalsPanel`, `TransactionReview`, `SecurityPanel`, `BottomNav`, `PanelTitle`, `InfoRow`, `SummaryCard`, `ActionButton`, `activationStatusLabel`, and dashboard styles.

- [ ] **Step 2: Wire dashboard to session**

`DashboardHome` reads state/actions from `useMobileSession()` and preserves the existing dashboard behavior.

---

### Task 6: Verify

**Files:**
- Modify: none

**Interfaces:**
- Consumes: the completed route split.
- Produces: verification evidence.

- [ ] **Step 1: Static verification**

Run:

```bash
corepack pnpm --filter @piggybanq/mobile build
npm test
git diff --check
```

Expected: all pass.

- [ ] **Step 2: Android verification**

Run:

```bash
export JAVA_HOME=/home/kimz/.jdks/jbr-17.0.14
export ANDROID_HOME=/home/kimz/Android/Sdk
export ANDROID_SDK_ROOT=/home/kimz/Android/Sdk
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
corepack pnpm --filter @piggybanq/mobile android
adb shell uiautomator dump /sdcard/piggybanq-route-structure.xml >/dev/null
adb exec-out cat /sdcard/piggybanq-route-structure.xml | rg "A New Way|To Save|Freighter|Create a local wallet instead|Keys never leave"
```

Expected: homepage labels appear.

- [ ] **Step 3: Provider route verification**

Open the Freighter route and verify label visibility:

```bash
adb shell am start -a android.intent.action.VIEW -d "piggybanq://expo-development-client/?url=http%3A%2F%2F192.168.0.247%3A8081%2F--%2Fconnect%2Ffreighter" com.anonymous.piggybanq
sleep 3
adb shell uiautomator dump /sdcard/piggybanq-freighter-route.xml >/dev/null
adb exec-out cat /sdcard/piggybanq-freighter-route.xml | rg "Freighter|native connection is not wired yet"
```

Expected: Freighter placeholder labels appear.

- [ ] **Step 4: Fresh app logs**

Run:

```bash
adb logcat -c
sleep 3
pid=$(adb shell pidof -s com.anonymous.piggybanq | tr -d '\r')
adb logcat -d --pid="$pid" -t 500 | rg "ReferenceError|EventTarget|Uncaught Error|Route \"\\./index\\.tsx\"|ReactNativeJS|ERROR|AndroidRuntime|FATAL EXCEPTION" || true
```

Expected: no matching app runtime errors.
