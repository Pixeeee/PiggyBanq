# PiggyBanq Premium Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium split-screen PiggyBanq signup experience that matches the landing hero while preserving the existing self-custodial wallet flow.

**Architecture:** Keep `WalletAuthFlow` as the single owner of authentication state and wallet operations, but wrap its existing screens in a persistent brand panel and a focused workspace panel. Add one final, signup-scoped CSS layer after the legacy Maxi overrides so the visual cascade is deterministic without changing dashboard styling or landing hero markup.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, CSS, Node test runner

## Global Constraints

- Preserve wallet creation, local encryption, recovery phrase validation, Stellar challenge signing, session behavior, API calls, and route destinations.
- Use `/piggy_bg.mp4` with `/piggy.png` as its poster and fallback in the cinematic panel.
- Anchor `/piggy.gif` at the bottom of the branded area without obstructing interactive controls.
- Use Poppins for primary typography, Source Serif 4 for sparse editorial accents, and the existing mono family for metadata.
- Use the landing palette: cream `#fff7cd`, peach `#ffc3a5`, the active rose token, dark-brown `#4a2c2a`, and warm white.
- Do not modify the landing hero on `/`.
- Keep the experience usable at 320px width, with WCAG AA contrast, visible keyboard focus, 44px controls, and reduced-motion support.
- Keep Stellar behavior testnet-only and maintain the security rules in `AGENTS.md`.

---

### Task 1: Lock the premium signup layout contract

**Files:**
- Modify: `tests/web-routing-ui.test.mjs`
- Test: `tests/web-routing-ui.test.mjs`

**Interfaces:**
- Consumes: Static source text from `WalletAuthFlow.tsx` and `globals.css`.
- Produces: A regression contract for the brand panel, hero media reuse, bottom pig placement, typography, responsive layout, and reduced-motion treatment.

- [ ] **Step 1: Replace the legacy Stellar auth visual assertions with the approved design contract**

Replace the existing `Stellar auth login uses Geist...` test with:

```js
test('Stellar auth uses the premium PiggyBanq split-screen design', () => {
  const landing = readFileSync('apps/web/app/page.tsx', 'utf8');
  const css = readFileSync('apps/web/app/globals.css', 'utf8');
  const component = readFileSync('apps/web/app/components/WalletAuthFlow.tsx', 'utf8');

  assert.match(component, /stellar-auth-brand-panel/);
  assert.match(component, /stellar-auth-workspace/);
  assert.match(component, /stellar-auth-progress/);
  assert.match(component, /src="\/piggy_bg\.mp4"/);
  assert.match(component, /poster="\/piggy\.png"/);
  assert.match(component, /className="stellar-auth-pig" src="\/piggy\.gif"/);
  assert.match(component, /Private keys stay encrypted on this device/);
  assert.match(component, /Stellar testnet/);
  assert.doesNotMatch(component, /stellar-auth-language/);

  assert.match(css, /Premium PiggyBanq auth experience/);
  assert.match(css, /\.stellar-auth-page\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1\.08fr\) minmax\(28rem, 0\.92fr\)/);
  assert.match(css, /\.stellar-auth-page\s*\{[\s\S]*font-family:\s*"Poppins", var\(--font-body\)/);
  assert.match(css, /\.stellar-auth-display[\s\S]*font-family:\s*"Source Serif 4", Georgia, serif/);
  assert.match(css, /\.stellar-auth-pig\s*\{[\s\S]*bottom:\s*0/);
  assert.match(css, /@media \(max-width:\s*900px\)[\s\S]*\.stellar-auth-page\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);

  assert.match(landing, /className="landing-hero-section"/);
  assert.match(landing, /src="\/piggy_bg\.mp4"/);
});
```

- [ ] **Step 2: Run the focused test to verify the contract fails**

Run: `node --test tests/web-routing-ui.test.mjs`

Expected: FAIL because `stellar-auth-brand-panel`, `stellar-auth-workspace`, and the premium auth CSS layer do not exist yet.

- [ ] **Step 3: Commit the failing contract**

```bash
git add tests/web-routing-ui.test.mjs
git commit -m "test: define premium signup design contract"
```

---

### Task 2: Build the persistent signup shell

**Files:**
- Modify: `apps/web/app/components/WalletAuthFlow.tsx`
- Test: `tests/web-wallet-create.test.mjs`
- Test: `tests/web-routing-ui.test.mjs`

**Interfaces:**
- Consumes: Existing `AuthScreen`, screen setters, form handlers, provider modal state, and `isNavigating` state.
- Produces: `.stellar-auth-brand-panel`, `.stellar-auth-workspace`, `.stellar-auth-progress`, `.stellar-auth-stage`, and `.stellar-auth-pig` presentation hooks.

- [ ] **Step 1: Add display metadata derived only from the existing screen state**

Inside `WalletAuthFlow`, after `isWorking`, add:

```tsx
  const screenMeta = {
    choice: { step: '01', label: 'Choose access', title: 'Start securely' },
    'create-password': { step: '02', label: 'Local encryption', title: 'Protect your wallet' },
    recovery: { step: '03', label: 'Recovery phrase', title: 'Secure your backup' },
    login: { step: '01', label: 'Welcome back', title: 'Unlock your wallet' }
  } satisfies Record<AuthScreen, { step: string; label: string; title: string }>;
  const activeScreenMeta = screenMeta[screen];
```

This metadata must remain presentation-only and must not enter any authentication branch.

- [ ] **Step 2: Add the persistent cinematic brand panel as the first child of the auth page**

Use this structure inside `<main className="stellar-auth-page">`:

```tsx
<aside className="stellar-auth-brand-panel" aria-label="PiggyBanq wallet introduction">
  <video className="stellar-auth-brand-video" aria-hidden="true" autoPlay loop muted playsInline poster="/piggy.png">
    <source src="/piggy_bg.mp4" type="video/mp4" />
  </video>
  <div className="stellar-auth-brand-shade" aria-hidden="true" />
  <a className="stellar-auth-brand" href="/" aria-label="PiggyBanq home">
    <img src="/piggy_icon.png" alt="" aria-hidden="true" />
    <span>PiggyBanq</span>
  </a>
  <div className="stellar-auth-brand-copy">
    <p className="stellar-auth-kicker">Self-custodial savings · Stellar testnet</p>
    <h1>Build your savings.<br /><em className="stellar-auth-display">Keep the keys.</em></h1>
    <p>Create focused savings pockets while your wallet stays encrypted on the device in your hands.</p>
  </div>
  <ul className="stellar-auth-trust-list" aria-label="Wallet security principles">
    <li><span>01</span> Private keys stay encrypted on this device</li>
    <li><span>02</span> Only you hold the recovery phrase</li>
    <li><span>03</span> Built for Stellar testnet</li>
  </ul>
  <img className="stellar-auth-pig" src="/piggy.gif" alt="" aria-hidden="true" />
</aside>
```

- [ ] **Step 3: Wrap the existing interactive screens in the focused workspace**

Use this structure around the existing conditional choice, password, recovery, and login screens:

```tsx
<section className="stellar-auth-workspace" aria-label="Wallet access">
  <header className="stellar-auth-progress">
    <div>
      <span>{activeScreenMeta.step}</span>
      <p>{activeScreenMeta.label}</p>
    </div>
    <strong>{activeScreenMeta.title}</strong>
  </header>
  <div className="stellar-auth-stage" key={screen}>
    {/* Move the four existing screen conditionals here without changing their handlers. */}
  </div>
  {status || error ? (
    <p className={error ? 'stellar-auth-toast is-error' : 'stellar-auth-toast'} role={error ? 'alert' : 'status'}>
      {error || status}
    </p>
  ) : <div className="stellar-auth-toast-space" aria-hidden="true" />}
  <p className="stellar-auth-legal">PiggyBanq is testnet-only and is not a bank. Never share your recovery phrase.</p>
</section>
```

Move the provider modal and navigation transition after the two main columns so they remain page-level overlays. Remove the old standalone bottom pig render because the pig now belongs to the brand panel.

- [ ] **Step 4: Refine only presentation copy and hierarchy inside the existing screens**

Keep these tested strings and actions unchanged: `I have an existing wallet`, `Create a local wallet`, `Open demo account`, `Privy identity login`, `Web3Auth identity login`, `Save your Secret Recovery Phrase`, and `Unlock and log in`.

Add a meaningful eyebrow to the initial choice:

```tsx
<p className="stellar-auth-card-eyebrow">Wallet access</p>
<h2 id="stellar-auth-choice-title">How would you like to continue?</h2>
<p className="stellar-auth-choice-intro">Create an encrypted wallet on this device or unlock one you already use.</p>
```

Change card screen headings from `h1` to `h2` so the page's brand-panel `h1` remains the single top-level heading. Preserve each existing `aria-labelledby` relationship.

- [ ] **Step 5: Run wallet behavior tests before styling**

Run: `node --test tests/web-wallet-create.test.mjs tests/web-secure-wallet-auth.test.mjs`

Expected: PASS, demonstrating that the source-level wallet creation and authentication contracts remain intact.

- [ ] **Step 6: Commit the shell markup**

```bash
git add apps/web/app/components/WalletAuthFlow.tsx
git commit -m "feat: add premium signup shell"
```

---

### Task 3: Apply the landing-aligned premium visual system

**Files:**
- Modify: `apps/web/app/globals.css`
- Test: `tests/web-routing-ui.test.mjs`

**Interfaces:**
- Consumes: The structural class names created in Task 2 and global landing tokens `--cream`, `--peach`, `--rose`, `--text-dark`, `--font-body`, and `--font-mono`.
- Produces: The final desktop, mobile, focus, state, and reduced-motion treatment for the auth experience.

- [ ] **Step 1: Add one final scoped auth layer after all legacy auth and Maxi rules**

Append a section headed `/* Premium PiggyBanq auth experience */`. Define `.stellar-auth-page` as:

```css
.stellar-auth-page {
  --auth-ink: #4a2c2a;
  --auth-ink-soft: #765d58;
  --auth-paper: #fffdf7;
  --auth-card: #fffaf0;
  --auth-line: rgb(74 44 42 / 14%);
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(28rem, 0.92fr);
  min-height: 100svh;
  overflow: hidden;
  background: var(--auth-paper);
  color: var(--auth-ink);
  font-family: "Poppins", var(--font-body);
}
```

The brand panel must use `position: relative`, `isolation: isolate`, a minimum height of `100svh`, and hidden overflow. Put the video at `position: absolute; inset: -0.5rem; width: calc(100% + 1rem); height: calc(100% + 1rem); object-fit: cover; filter: blur(3px); transform: scale(1.02)`. Layer a dark-brown multi-stop gradient over it through `.stellar-auth-brand-shade`.

- [ ] **Step 2: Style the brand narrative and bottom pig as an integrated composition**

Use cream for the wordmark and main headline, peach for `.stellar-auth-display`, Poppins at weight 500 for the headline, Source Serif 4 italic for the display accent, and mono uppercase styling for the kicker and trust indices.

Ground the pig with this positioning contract:

```css
.stellar-auth-pig {
  position: absolute;
  right: clamp(-2rem, -2vw, -0.5rem);
  bottom: 0;
  z-index: 3;
  width: min(44%, 25rem);
  height: auto;
  max-height: 36svh;
  object-fit: contain;
  object-position: right bottom;
  filter: drop-shadow(0 1.5rem 2.5rem rgb(42 22 19 / 28%));
  pointer-events: none;
  user-select: none;
}
```

Reserve the bottom-right visual area by limiting the trust list to `max-width: min(25rem, 66%)` on wide screens.

- [ ] **Step 3: Style the focused signup workspace and every interactive state**

Make `.stellar-auth-workspace` a vertically scrollable grid with warm-white background, `clamp(1.25rem, 4vw, 4rem)` padding, and a centered `max-width: 38rem` content column. Restyle choice and form cards as borderless transparent containers inside the workspace; use warm-card backgrounds only for secondary provider and recovery-phrase surfaces.

Use the active rose token for primary buttons with cream text, warm white and dark-brown borders for secondary buttons, and text links for tertiary actions. Keep all controls at least `3.25rem` high. Add coherent hover (`translateY(-1px)`), active (`translateY(0)`), disabled (reduced saturation and opacity), error, loading, and `:focus-visible` states using a rose focus ring with at least 3px visual thickness.

- [ ] **Step 4: Add responsive and reduced-motion behavior**

At `max-width: 900px`, set `.stellar-auth-page { grid-template-columns: 1fr; overflow: visible; }`, make the brand panel a compact header between `17rem` and `22rem` tall, hide the trust list, shrink the headline, and scale the pig to no more than `12rem` wide. Keep `.stellar-auth-workspace` naturally sized and remove its independent scrollbar.

At `max-width: 520px`, stack social providers, reduce card padding, and keep all interactive content within the viewport width. Add:

```css
@media (prefers-reduced-motion: reduce) {
  .stellar-auth-brand-video { display: none; }
  .stellar-auth-stage,
  .stellar-auth-page button,
  .stellar-auth-page a { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 5: Run the focused UI contract**

Run: `node --test tests/web-routing-ui.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the premium styling**

```bash
git add apps/web/app/globals.css tests/web-routing-ui.test.mjs
git commit -m "style: align signup with PiggyBanq landing"
```

---

### Task 4: Verify behavior, build output, and route health

**Files:**
- Verify: `apps/web/app/components/WalletAuthFlow.tsx`
- Verify: `apps/web/app/globals.css`
- Verify: `apps/web/app/page.tsx`
- Verify: `tests/web-routing-ui.test.mjs`

**Interfaces:**
- Consumes: Completed premium signup markup and CSS.
- Produces: Evidence that the complete repository contract, production build, route, and landing-hero isolation remain healthy.

- [ ] **Step 1: Confirm only approved files changed relative to the design-spec commit**

Run: `git diff --stat e268c9e..HEAD && git diff --check`

Expected: Only the plan, signup component, global CSS, and routing UI test are present; `git diff --check` prints no whitespace errors.

- [ ] **Step 2: Run the complete repository test suite**

Run: `pnpm test`

Expected: All tests pass with zero failures.

- [ ] **Step 3: Run the production web build**

Run: `pnpm --filter @piggybanq/web build`

Expected: Next.js completes compilation, type checking, static generation, and route output with exit code 0.

- [ ] **Step 4: Verify the local signup route**

Start or reuse the development server at port 3010, then run:

```bash
curl -I http://127.0.0.1:3010/signup
curl -I http://127.0.0.1:3010/
```

Expected: Both routes return HTTP 200. If the production build interrupted the dev server's `.next` output, restart the dev server before checking.

- [ ] **Step 5: Confirm the landing hero source remained untouched**

Run: `git diff e268c9e..HEAD -- apps/web/app/page.tsx`

Expected: No output.

- [ ] **Step 6: Record final repository state**

Run: `git status --short && git log --oneline -5`

Expected: The worktree is clean and the layout contract, shell, and styling commits appear in recent history.
