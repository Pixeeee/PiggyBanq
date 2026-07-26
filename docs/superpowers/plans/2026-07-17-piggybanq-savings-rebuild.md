# PiggyBanq Savings Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current PiggyBanq multi-feature product with a savings-only, self-custodial web and mobile app for real Stellar testnet `XLM` and `USDT` savings flows.

**Architecture:** Keep wallet creation and signing on-device, reduce the backend to auth plus savings metadata/preparation APIs, and replace the current dashboard/community surface with a compact savings workspace. Introduce a shared savings strategy layer so `XLM` and `USDT` routes are allowlisted and testnet-only instead of being hardcoded into page code.

**Tech Stack:** Next.js 15 App Router, React 19, Expo Router, Fastify 5, Prisma/PostgreSQL, Zod, `@stellar/stellar-sdk`, local encrypted wallet storage on web, SecureStore on mobile.

## Global Constraints

- Product scope: savings only
- Platforms: web and mobile
- Wallet model: PiggyBanq creates the wallet in-app
- Custody model: self-custodial, device-only key storage
- Signing model: in-app local signing
- Network target: Stellar testnet only
- Savings assets in v1: `XLM` and `USDT`
- Execution model: real on-chain savings flows, not simulated balances
- Backend must not store private keys, seed phrases, or raw secret keys
- `USDT` must be pinned to one exact configured testnet asset definition or be disabled
- Old community, budget, milestones, anchor, and social surfaces must be removed or retired from the active product

---

## File Structure

### Web client

- `apps/web/app/page.tsx`: replace landing copy and links with savings-only messaging and pig palette direction.
- `apps/web/app/components/WalletAuthFlow.tsx`: keep in-app wallet creation/login, but change post-auth flow and copy for savings-only onboarding.
- `apps/web/app/(app)/dashboard/page.tsx`: replace general dashboard with savings workspace.
- `apps/web/app/(app)/dashboard/_lib/session.ts`: keep session guard and target the rebuilt dashboard.
- `apps/web/app/lib/wallet-auth-api.ts`: remove community/budget/profile calls; add savings, assets, strategies, and transaction preparation calls.
- `apps/web/app/(app)/dashboard/secure-wallet.ts`: keep encrypted local wallet helpers and extend the interface needed for deposit/withdraw signing.
- `apps/web/app/globals.css`: remove unused dashboard/community styling and add savings workspace styles.

### Mobile client

- `apps/mobile/app/index.tsx`: replace the wallet-only demo screen with savings-first onboarding/dashboard shell.
- `apps/mobile/app/_layout.tsx`: define the savings screens if routing expands beyond the current single screen.
- `apps/mobile/src/wallet/create-local-wallet.ts`: replace plaintext SecureStore secret handling with encrypted local-wallet storage and recovery-confirmed state.
- `apps/mobile/src/*` new savings modules: asset catalog, strategy reads, deposit/withdraw preparation, local signing helpers.

### Shared packages

- `packages/types/src/wallet.ts`: keep public-key-only constraints and add wallet/savings DTOs.
- `packages/types/src/ledger.ts`: retire pocket/community semantics and add savings transaction/position types.
- `packages/types/src/savings.ts` new: shared asset, strategy, portfolio, and transaction types.
- `packages/stellar-core/src/address.ts`, `network.ts`, `trustline.ts`, `polling.ts`: keep and extend for savings strategy validation and transaction lifecycle.
- `packages/stellar-core/src/savings-strategies.ts` new: allowlisted strategy adapters for `XLM` and `USDT`.

### Backend

- `server/src/server.ts`: register only auth and savings-relevant routes.
- `server/src/modules/auth/routes.ts`: keep challenge/signup/login/logout and align success flow with the savings-only product.
- `server/src/modules/auth/wallet-auth.ts`: keep Stellar signature verification and testnet enforcement.
- `server/src/modules/savings/routes.ts`: replace placeholder response with asset catalog, strategy catalog, portfolio reads, and transaction preparation endpoints.
- `server/src/modules/*` old routes for `anchor`, `budget`, `milestones`, `profile`, `social`, `wallet`: remove from active registration, then retire or delete after tests are updated.
- `server/prisma/schema.prisma`: shrink the schema to savings-oriented metadata and audit records.

### Tests

- `tests/web-routing-ui.test.mjs`: update landing and dashboard assertions.
- `tests/web-wallet-create.test.mjs`: keep wallet-first auth coverage and retarget dashboard expectations.
- `tests/web-dashboard-features.test.mjs`: rewrite from community/budget/dashboard assertions to savings workspace assertions.
- `tests/mobile-wallet-create.test.mjs`: rewrite from wallet-only demo to wallet + savings shell expectations.
- `tests/phase-0-2-core.test.mjs`: replace pocket-focused logic with savings strategy and trustline checks.
- `tests/prompt-contract.test.mjs`: update any product-contract language that no longer matches the rebuilt scope.
- `tests/deployment-config.test.mjs`: keep API base URL normalization coverage.
- `tests/savings-strategy.test.mjs` new: asset allowlist and strategy behavior.

### Docs

- `README.md`: rewrite product description and quick-start expectations.
- `docs/DEVELOPER_GUIDE.md`: rewrite around savings-only architecture and testnet-first behavior.

## Task 1: Define shared savings types and strategy interfaces

**Files:**
- Create: `packages/types/src/savings.ts`
- Modify: `packages/types/src/ledger.ts`
- Modify: `packages/types/src/wallet.ts`
- Modify: `packages/types/package.json`
- Create: `packages/stellar-core/src/savings-strategies.ts`
- Modify: `packages/stellar-core/package.json`
- Test: `tests/savings-strategy.test.mjs`
- Test: `tests/phase-0-2-core.test.mjs`

**Interfaces:**
- Consumes: existing `normalizeStellarPublicKey`, `ensureTrustlineRequired`, and polling helpers from `packages/stellar-core`
- Produces:
  - `SavingsAssetCode = 'XLM' | 'USDT'`
  - `type SavingsStrategyDefinition`
  - `type SavingsPositionSnapshot`
  - `type PreparedSavingsTransaction`
  - `getSupportedSavingsAssets(): SavingsAssetCode[]`
  - `getSavingsStrategies(): SavingsStrategyDefinition[]`
  - `getSavingsStrategyByAsset(assetCode: SavingsAssetCode): SavingsStrategyDefinition | null`

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('shared savings types are constrained to XLM and USDT for v1', () => {
  const savingsTypes = readFileSync('packages/types/src/savings.ts', 'utf8');

  assert.match(savingsTypes, /export type SavingsAssetCode = 'XLM' \| 'USDT';/);
  assert.match(savingsTypes, /export type SavingsStrategyDefinition = \{/);
  assert.match(savingsTypes, /requiresTrustline: boolean/);
});

test('stellar-core exposes allowlisted testnet savings strategies only', () => {
  const strategies = readFileSync('packages/stellar-core/src/savings-strategies.ts', 'utf8');

  assert.match(strategies, /const SUPPORTED_SAVINGS_ASSETS = \['XLM', 'USDT'\]/);
  assert.match(strategies, /network: 'TESTNET'/);
  assert.match(strategies, /getSavingsStrategyByAsset/);
  assert.doesNotMatch(strategies, /PUBLIC/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd test -- tests/savings-strategy.test.mjs`
Expected: FAIL with missing file or missing exported type/strategy definitions.

- [ ] **Step 3: Write the minimal implementation**

```ts
// packages/types/src/savings.ts
export type SavingsAssetCode = 'XLM' | 'USDT';

export type SavingsStrategyDefinition = {
  assetCode: SavingsAssetCode;
  network: 'TESTNET';
  routeKey: string;
  displayName: string;
  requiresTrustline: boolean;
  enabled: boolean;
};

export type SavingsPositionSnapshot = {
  assetCode: SavingsAssetCode;
  routeKey: string;
  walletPublicKey: string;
  depositedAmount: string;
  accruedYield: string;
  totalValue: string;
  aprBps: number;
  asOfIso: string;
};

export type PreparedSavingsTransaction = {
  assetCode: SavingsAssetCode;
  routeKey: string;
  network: 'TESTNET';
  xdr: string;
  fee: string;
  summary: {
    action: 'DEPOSIT' | 'WITHDRAW';
    amount: string;
    destinationLabel: string;
  };
};
```

```ts
// packages/stellar-core/src/savings-strategies.ts
import type { SavingsAssetCode, SavingsStrategyDefinition } from '@piggybanq/types/src/savings';

const SUPPORTED_SAVINGS_ASSETS = ['XLM', 'USDT'] as const satisfies readonly SavingsAssetCode[];

const STRATEGIES: SavingsStrategyDefinition[] = [
  {
    assetCode: 'XLM',
    network: 'TESTNET',
    routeKey: 'xlm-testnet-savings',
    displayName: 'XLM Testnet Savings',
    requiresTrustline: false,
    enabled: true
  },
  {
    assetCode: 'USDT',
    network: 'TESTNET',
    routeKey: 'usdt-testnet-savings',
    displayName: 'USDT Testnet Savings',
    requiresTrustline: true,
    enabled: true
  }
];

export function getSupportedSavingsAssets(): SavingsAssetCode[] {
  return [...SUPPORTED_SAVINGS_ASSETS];
}

export function getSavingsStrategies(): SavingsStrategyDefinition[] {
  return STRATEGIES.filter((strategy) => strategy.enabled);
}

export function getSavingsStrategyByAsset(assetCode: SavingsAssetCode): SavingsStrategyDefinition | null {
  return STRATEGIES.find((strategy) => strategy.assetCode === assetCode && strategy.enabled) ?? null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm.cmd test -- tests/savings-strategy.test.mjs tests/phase-0-2-core.test.mjs`
Expected: PASS for new allowlist coverage and updated shared-core expectations.

- [ ] **Step 5: Commit**

```bash
git add packages/types/src/savings.ts packages/types/src/ledger.ts packages/types/src/wallet.ts packages/stellar-core/src/savings-strategies.ts tests/savings-strategy.test.mjs tests/phase-0-2-core.test.mjs
git commit -m "feat: add shared savings strategy contracts"
```

### Task 2: Reduce the backend to auth plus savings APIs

**Files:**
- Modify: `server/src/server.ts`
- Modify: `server/src/modules/savings/routes.ts`
- Create: `server/src/modules/savings/strategies.ts`
- Create: `server/src/modules/savings/portfolio.ts`
- Modify: `server/src/modules/auth/routes.ts`
- Modify: `server/prisma/schema.prisma`
- Test: `tests/web-dashboard-features.test.mjs`
- Test: `tests/stellar-wallet-auth.test.mjs`

**Interfaces:**
- Consumes:
  - `getSavingsStrategies()`
  - `getSavingsStrategyByAsset(assetCode)`
  - existing auth session helpers
- Produces:
  - `GET /api/savings/assets`
  - `GET /api/savings/strategies`
  - `GET /api/savings/portfolio`
  - `POST /api/savings/prepare-deposit`
  - `POST /api/savings/prepare-withdraw`

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('server registers only auth and savings-first product routes', () => {
  const server = readFileSync('server/src/server.ts', 'utf8');

  assert.match(server, /registerAuthRoutes\(server\)/);
  assert.match(server, /registerSavingsRoutes\(server\)/);
  assert.doesNotMatch(server, /registerSocialRoutes/);
  assert.doesNotMatch(server, /registerBudgetRoutes/);
  assert.doesNotMatch(server, /registerMilestoneRoutes/);
});

test('savings routes expose asset catalog and transaction preparation endpoints', () => {
  const routes = readFileSync('server/src/modules/savings/routes.ts', 'utf8');

  assert.match(routes, /server\.get\('\/api\/savings\/assets'/);
  assert.match(routes, /server\.get\('\/api\/savings\/strategies'/);
  assert.match(routes, /server\.post\('\/api\/savings\/prepare-deposit'/);
  assert.match(routes, /server\.post\('\/api\/savings\/prepare-withdraw'/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd test -- tests/web-dashboard-features.test.mjs tests/stellar-wallet-auth.test.mjs`
Expected: FAIL because old route registrations and placeholder savings routes are still present.

- [ ] **Step 3: Write the minimal implementation**

```ts
// server/src/server.ts
import { registerAuthRoutes } from './modules/auth/routes.ts';
import { registerSavingsRoutes } from './modules/savings/routes.ts';

// ...

registerAuthRoutes(server);
registerSavingsRoutes(server);
```

```ts
// server/src/modules/savings/routes.ts
server.get('/api/savings/assets', async () => ({
  assets: getSupportedSavingsAssets()
}));

server.get('/api/savings/strategies', async () => ({
  strategies: getSavingsStrategies()
}));

server.get('/api/savings/portfolio', async (request, reply) => {
  const user = await requireAuthUser(request, reply);
  if (!user) return;

  return {
    walletPublicKey: user.stellarPublicKey,
    positions: await getSavingsPortfolioSnapshot(user.stellarPublicKey)
  };
});

server.post('/api/savings/prepare-deposit', async (request, reply) => {
  const user = await requireAuthUser(request, reply);
  if (!user) return;

  const body = prepareDepositSchema.parse(request.body);
  return prepareSavingsDeposit(user.stellarPublicKey, body);
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm.cmd test -- tests/web-dashboard-features.test.mjs tests/stellar-wallet-auth.test.mjs`
Expected: PASS for savings route registration and auth compatibility.

- [ ] **Step 5: Commit**

```bash
git add server/src/server.ts server/src/modules/savings/routes.ts server/src/modules/savings/strategies.ts server/src/modules/savings/portfolio.ts server/src/modules/auth/routes.ts server/prisma/schema.prisma tests/web-dashboard-features.test.mjs tests/stellar-wallet-auth.test.mjs
git commit -m "feat: rebuild backend around savings routes"
```

### Task 3: Rebuild the web landing page, auth flow, and savings dashboard

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/components/WalletAuthFlow.tsx`
- Modify: `apps/web/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/app/(app)/dashboard/_lib/session.ts`
- Modify: `apps/web/app/lib/wallet-auth-api.ts`
- Modify: `apps/web/app/globals.css`
- Test: `tests/web-routing-ui.test.mjs`
- Test: `tests/web-wallet-create.test.mjs`
- Test: `tests/deployment-config.test.mjs`

**Interfaces:**
- Consumes:
  - `GET /api/savings/assets`
  - `GET /api/savings/strategies`
  - `GET /api/savings/portfolio`
  - `POST /api/savings/prepare-deposit`
  - `POST /api/savings/prepare-withdraw`
- Produces:
  - savings-only landing page
  - signup/login redirect into savings dashboard
  - `loadSavingsPortfolio()`
  - `prepareSavingsDeposit()`
  - `prepareSavingsWithdraw()`

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('landing page markets PiggyBanq as a savings-only product', () => {
  const landing = readFileSync('apps/web/app/page.tsx', 'utf8');

  assert.match(landing, /XLM/);
  assert.match(landing, /USDT/);
  assert.match(landing, /testnet savings/i);
  assert.doesNotMatch(landing, /community|groups|calamity|chat/i);
});

test('dashboard is a savings workspace instead of a multi-feature portal', () => {
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');
  const api = readFileSync('apps/web/app/lib/wallet-auth-api.ts', 'utf8');

  assert.match(dashboard, /Savings Dashboard|Savings Workspace|Portfolio/i);
  assert.match(dashboard, /Deposit/i);
  assert.match(dashboard, /Withdraw/i);
  assert.doesNotMatch(dashboard, /Community|Budget|Milestone/i);
  assert.match(api, /\/api\/savings\/portfolio/);
  assert.match(api, /\/api\/savings\/prepare-deposit/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd test -- tests/web-routing-ui.test.mjs tests/web-wallet-create.test.mjs tests/deployment-config.test.mjs`
Expected: FAIL because landing/dashboard still contain community and old product copy.

- [ ] **Step 3: Write the minimal implementation**

```ts
// apps/web/app/lib/wallet-auth-api.ts
export async function getSavingsAssets() {
  return apiRequest<{ assets: Array<'XLM' | 'USDT'> }>('/api/savings/assets', { method: 'GET' });
}

export async function getSavingsStrategies() {
  return apiRequest<{ strategies: SavingsStrategyDefinition[] }>('/api/savings/strategies', { method: 'GET' });
}

export async function getSavingsPortfolio() {
  return apiRequest<{ walletPublicKey: string | null; positions: SavingsPositionSnapshot[] }>('/api/savings/portfolio', { method: 'GET' });
}

export async function prepareSavingsDeposit(input: { assetCode: 'XLM' | 'USDT'; amount: string }) {
  return apiRequest<{ transaction: PreparedSavingsTransaction }>('/api/savings/prepare-deposit', { method: 'POST', body: input });
}
```

```tsx
// apps/web/app/components/WalletAuthFlow.tsx
await completeWalletLogin({ challengeId: challenge.challengeId, publicKey: account.publicKey, signature });
router.push('/dashboard');
router.refresh();
```

```tsx
// apps/web/app/(app)/dashboard/page.tsx
<section aria-labelledby="savings-dashboard-title">
  <h1 id="savings-dashboard-title">Savings Workspace</h1>
  <p>Real Stellar testnet savings for XLM and USDT with local signing.</p>
  <div>
    <button type="button">Deposit</button>
    <button type="button">Withdraw</button>
  </div>
</section>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm.cmd test -- tests/web-routing-ui.test.mjs tests/web-wallet-create.test.mjs tests/deployment-config.test.mjs`
Expected: PASS for savings-only landing, auth redirect, and API URL handling.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/page.tsx apps/web/app/components/WalletAuthFlow.tsx apps/web/app/(app)/dashboard/page.tsx apps/web/app/(app)/dashboard/_lib/session.ts apps/web/app/lib/wallet-auth-api.ts apps/web/app/globals.css tests/web-routing-ui.test.mjs tests/web-wallet-create.test.mjs tests/deployment-config.test.mjs
git commit -m "feat: replace web dashboard with savings workspace"
```

### Task 4: Harden web local wallet storage and savings transaction signing

**Files:**
- Modify: `apps/web/app/(app)/dashboard/secure-wallet.ts`
- Create: `apps/web/app/(app)/dashboard/_lib/savings-wallet.ts`
- Create: `apps/web/app/(app)/dashboard/_components/SavingsActionPanel.tsx`
- Create: `apps/web/app/(app)/dashboard/_components/SavingsPositionsPanel.tsx`
- Test: `tests/web-secure-wallet-auth.test.mjs`
- Test: `tests/web-dashboard-features.test.mjs`

**Interfaces:**
- Consumes:
  - `unlockWalletAccount(username, password)`
  - `PreparedSavingsTransaction`
- Produces:
  - `signPreparedSavingsTransaction(secretKey, xdr): string`
  - reusable dashboard components for positions and actions

- [ ] **Step 1: Write the failing tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('secure wallet helpers support local savings transaction signing only after unlock', () => {
  const walletHelper = readFileSync('apps/web/app/(app)/dashboard/secure-wallet.ts', 'utf8');

  assert.match(walletHelper, /unlockWalletAccount/);
  assert.match(walletHelper, /signPreparedSavingsTransaction/);
  assert.doesNotMatch(walletHelper, /fetch\(.*secretKey/);
});

test('dashboard feature panels are savings-only and render action components', () => {
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');

  assert.match(dashboard, /SavingsActionPanel/);
  assert.match(dashboard, /SavingsPositionsPanel/);
  assert.doesNotMatch(dashboard, /DashboardFeaturePanels|CommunityDashboard/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd test -- tests/web-secure-wallet-auth.test.mjs tests/web-dashboard-features.test.mjs`
Expected: FAIL because the dashboard still references old feature panels and signing helper is missing.

- [ ] **Step 3: Write the minimal implementation**

```ts
// apps/web/app/(app)/dashboard/_lib/savings-wallet.ts
import { TransactionBuilder } from '@stellar/stellar-sdk';

export function signPreparedSavingsTransaction(secretKey: string, xdr: string): string {
  const tx = TransactionBuilder.fromXDR(xdr, 'Test SDF Network ; September 2015');
  tx.sign({ secret: () => secretKey } as never);
  return tx.toXDR();
}
```

```tsx
// apps/web/app/(app)/dashboard/_components/SavingsActionPanel.tsx
export function SavingsActionPanel() {
  return (
    <section>
      <h2>Move funds</h2>
      <button type="button">Deposit</button>
      <button type="button">Withdraw</button>
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm.cmd test -- tests/web-secure-wallet-auth.test.mjs tests/web-dashboard-features.test.mjs`
Expected: PASS for local-signing boundaries and savings-only dashboard composition.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(app)/dashboard/secure-wallet.ts apps/web/app/(app)/dashboard/_lib/savings-wallet.ts apps/web/app/(app)/dashboard/_components/SavingsActionPanel.tsx apps/web/app/(app)/dashboard/_components/SavingsPositionsPanel.tsx tests/web-secure-wallet-auth.test.mjs tests/web-dashboard-features.test.mjs
git commit -m "feat: add local savings transaction signing"
```

### Task 5: Rebuild the mobile app around the same savings model

**Files:**
- Modify: `apps/mobile/app/index.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/src/wallet/create-local-wallet.ts`
- Create: `apps/mobile/src/wallet/mobile-wallet-vault.ts`
- Create: `apps/mobile/src/savings/mobile-savings-api.ts`
- Create: `apps/mobile/src/savings/mobile-savings-state.ts`
- Test: `tests/mobile-wallet-create.test.mjs`

**Interfaces:**
- Consumes:
  - shared savings types and strategies
  - mobile secure storage
- Produces:
  - encrypted mobile wallet vault with recovery-confirmed state
  - mobile savings shell using the same `XLM`/`USDT` catalog

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('mobile app exposes savings-first wallet creation and asset actions', () => {
  const screen = readFileSync('apps/mobile/app/index.tsx', 'utf8');
  const wallet = readFileSync('apps/mobile/src/wallet/create-local-wallet.ts', 'utf8');

  assert.match(screen, /XLM/);
  assert.match(screen, /USDT/);
  assert.match(screen, /Deposit|Withdraw/);
  assert.match(wallet, /recoveryConfirmedAt|recoveryConfirmed/);
  assert.doesNotMatch(screen, /global chat|community/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- tests/mobile-wallet-create.test.mjs`
Expected: FAIL because the mobile app is still a wallet-only demo without savings flows.

- [ ] **Step 3: Write the minimal implementation**

```ts
// apps/mobile/src/wallet/create-local-wallet.ts
export type MobileStoredWallet = {
  publicKey: string;
  encryptedSecretKey: string;
  createdAt: string;
  recoveryConfirmedAt: string | null;
};
```

```tsx
// apps/mobile/app/index.tsx
<Text>Testnet savings for XLM and USDT</Text>
<Pressable><Text>Deposit</Text></Pressable>
<Pressable><Text>Withdraw</Text></Pressable>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- tests/mobile-wallet-create.test.mjs`
Expected: PASS for savings-first mobile shell and recovery state tracking.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/index.tsx apps/mobile/app/_layout.tsx apps/mobile/src/wallet/create-local-wallet.ts apps/mobile/src/wallet/mobile-wallet-vault.ts apps/mobile/src/savings/mobile-savings-api.ts apps/mobile/src/savings/mobile-savings-state.ts tests/mobile-wallet-create.test.mjs
git commit -m "feat: rebuild mobile app as savings shell"
```

### Task 6: Rewrite product docs and prune remaining old-scope tests

**Files:**
- Modify: `README.md`
- Modify: `docs/DEVELOPER_GUIDE.md`
- Modify: `tests/prompt-contract.test.mjs`
- Modify: `tests/web-dashboard-features.test.mjs`
- Modify: `tests/web-routing-ui.test.mjs`
- Test: `tests/prompt-contract.test.mjs`
- Test: `npm.cmd test`
- Test: `npm.cmd run build`

**Interfaces:**
- Consumes: completed savings-first frontend/backend/mobile implementation
- Produces: accurate repo docs and green test/build verification

- [ ] **Step 1: Write the failing documentation test updates**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('README describes PiggyBanq as a savings-only self-custodial testnet product', () => {
  const readme = readFileSync('README.md', 'utf8');

  assert.match(readme, /savings-only/i);
  assert.match(readme, /XLM/);
  assert.match(readme, /USDT/);
  assert.doesNotMatch(readme, /community|budget|calamity help/i);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd test -- tests/prompt-contract.test.mjs tests/web-routing-ui.test.mjs tests/web-dashboard-features.test.mjs`
Expected: FAIL because docs and contract tests still reflect the retired product scope.

- [ ] **Step 3: Write the minimal implementation**

```md
<!-- README.md -->
PiggyBanq is a self-custodial Stellar testnet savings product for XLM and USDT.

The current repository targets:
- in-app wallet creation
- local signing
- savings-only web dashboard
- aligned mobile savings shell
```

```md
<!-- docs/DEVELOPER_GUIDE.md -->
The rebuilt product removes community, budget, milestones, and social features from the active scope. Backend custody remains forbidden, and all savings execution is testnet-only.
```

- [ ] **Step 4: Run verification**

Run: `npm.cmd test`
Expected: PASS across updated savings-first tests.

Run: `npm.cmd run build`
Expected: PASS for web and server builds after the rewrite.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/DEVELOPER_GUIDE.md tests/prompt-contract.test.mjs tests/web-dashboard-features.test.mjs tests/web-routing-ui.test.mjs
git commit -m "docs: align repo documentation with savings rebuild"
```

## Self-Review

### Spec coverage

- Savings-only scope: covered by Tasks 2, 3, 5, and 6
- Web + mobile support: covered by Tasks 3 and 5
- In-app wallet creation: covered by Tasks 3, 4, and 5
- Device-only key storage and local signing: covered by Tasks 4 and 5
- Real testnet `XLM` and `USDT` flows: covered by Tasks 1, 2, 3, and 5
- Backend non-custodial boundary: covered by Tasks 2 and 6
- Allowlisted strategies and `USDT` trustline gating: covered by Tasks 1 and 2

No spec sections are unassigned.

### Placeholder scan

- No `TBD`, `TODO`, or “implement later” markers remain in the plan.
- Each task includes exact files, interfaces, test commands, and commit targets.

### Type consistency

- Shared asset type is consistently `SavingsAssetCode = 'XLM' | 'USDT'`
- Shared strategy and prepared transaction names are consistent across Tasks 1 through 5
- Savings API paths are consistent between Task 2 and Task 3

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-17-piggybanq-savings-rebuild.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
