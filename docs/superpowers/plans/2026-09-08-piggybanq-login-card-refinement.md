# PiggyBanq Login Card Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Turn the right-side wallet access area into a cohesive warm-ivory card and move the animated pig into a centered dock directly beneath it.

**Architecture:** Keep the existing `WalletAuthFlow` state machine and handlers unchanged. Move the decorative image from the brand panel into a conditional workspace dock shown only for `choice` and `login`, add a login-specific class, and append narrowly scoped CSS refinements after the existing premium auth layer.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, CSS, Node test runner

## Global Constraints

- Do not change wallet creation, local encryption, recovery phrase validation, Stellar challenge signing, API calls, session behavior, or redirects.
- Remove `/piggy.gif` from the cinematic left panel.
- Center `/piggy.gif` beneath the right-side choice or login card at approximately 110 to 140 CSS pixels wide.
- Display `Encrypted locally · Self-custodial` beside or beneath the mascot.
- Hide the mascot during password creation and recovery phrase confirmation.
- Keep the landing hero source untouched.
- Preserve the cream, peach, rose, dark-brown, Poppins, and Source Serif 4 design system.
- Maintain keyboard focus, responsive behavior, reduced-motion support, and non-obstructive content at 320px width.

---

### Task 1: Move the mascot into the login workspace

**Files:**
- Modify: `tests/web-routing-ui.test.mjs`
- Modify: `apps/web/app/components/WalletAuthFlow.tsx`
- Test: `tests/web-routing-ui.test.mjs`
- Test: `tests/web-wallet-create.test.mjs`

**Interfaces:**
- Consumes: Existing `screen: AuthScreen` state and the `choice` and `login` conditionals.
- Produces: `.stellar-auth-login-card` and `.stellar-auth-mascot-dock` markup hooks without changing authentication behavior.

- [x] **Step 1: Write the failing placement contract**

Add these assertions to the premium auth test in `tests/web-routing-ui.test.mjs`:

```js
assert.match(component, /stellar-auth-mascot-dock/);
assert.match(component, /screen === 'choice' \|\| screen === 'login'/);
assert.match(component, /Encrypted locally · Self-custodial/);
assert.match(component, /stellar-auth-login-card/);
assert.doesNotMatch(component, /stellar-auth-trust-list[\s\S]{0,240}className="stellar-auth-pig"/);
assert.match(css, /\.stellar-auth-mascot-dock \.stellar-auth-pig\s*\{[\s\S]*position:\s*static/);
assert.match(css, /\.stellar-auth-choice,\s*\.stellar-auth-login-card\s*\{[\s\S]*background:\s*var\(--auth-card\)/);
```

Replace the old assertion requiring `.stellar-auth-pig` to use `bottom: 0` with the new static dock assertion above.

- [x] **Step 2: Run the focused test and confirm the new contract fails**

Run: `node --test tests/web-routing-ui.test.mjs`

Expected: FAIL because `.stellar-auth-mascot-dock` and `.stellar-auth-login-card` do not exist.

- [x] **Step 3: Move the mascot markup and label the login form**

Delete this line from the brand panel:

```tsx
<img className="stellar-auth-pig" src="/piggy.gif" alt="" aria-hidden="true" />
```

Change the login form opening tag to:

```tsx
<form className="stellar-auth-card stellar-auth-login-card" aria-labelledby="stellar-login-title" onSubmit={login}>
```

Add this block at the end of `.stellar-auth-stage`, after all four screen conditionals:

```tsx
{screen === 'choice' || screen === 'login' ? (
  <div className="stellar-auth-mascot-dock">
    <img className="stellar-auth-pig" src="/piggy.gif" alt="" aria-hidden="true" />
    <p><span aria-hidden="true" />Encrypted locally <i aria-hidden="true" /> Self-custodial</p>
  </div>
) : null}
```

- [x] **Step 4: Run the wallet source contracts**

Run: `node --test tests/web-wallet-create.test.mjs tests/web-secure-wallet-auth.test.mjs`

Expected: PASS with all wallet security assertions unchanged.

- [x] **Step 5: Commit the mascot placement**

```bash
git add tests/web-routing-ui.test.mjs apps/web/app/components/WalletAuthFlow.tsx
git commit -m "style: move signup mascot beneath login card"
```

---

### Task 2: Strengthen the login-card composition

**Files:**
- Modify: `apps/web/app/globals.css`
- Test: `tests/web-routing-ui.test.mjs`

**Interfaces:**
- Consumes: `.stellar-auth-choice`, `.stellar-auth-login-card`, `.stellar-auth-mascot-dock`, and `.stellar-auth-pig` from Task 1.
- Produces: A complete ivory card surface, an in-flow mascot dock, and mobile-safe layout refinements.

- [x] **Step 1: Add a final `Login card and mascot refinement` CSS section**

Append the following structural rules after the current premium auth layer:

```css
/* Login card and mascot refinement */
.stellar-auth-stage {
  gap: clamp(0.8rem, 1.8vh, 1.2rem);
}

.stellar-auth-choice,
.stellar-auth-login-card {
  border: 1px solid rgb(245 119 153 / 20%);
  border-radius: clamp(1.35rem, 2.4vw, 1.8rem);
  background: var(--auth-card);
  padding: clamp(1.25rem, 2.8vw, 2.15rem);
  box-shadow:
    0 1.6rem 4rem rgb(74 44 42 / 11%),
    0 0.25rem 0.8rem rgb(245 119 153 / 7%),
    inset 0 1px 0 rgb(255 255 255 / 88%);
}

.stellar-auth-mascot-dock {
  display: flex;
  min-height: 7.5rem;
  align-items: flex-end;
  justify-content: center;
  gap: 0.8rem;
  padding-inline: 1rem;
}

.stellar-auth-mascot-dock .stellar-auth-pig {
  position: static;
  width: clamp(6.9rem, 10vw, 8.75rem);
  height: auto;
  max-height: none;
  object-fit: contain;
  filter: drop-shadow(0 0.9rem 1.25rem rgb(74 44 42 / 18%));
  transform: none;
}
```

- [x] **Step 2: Style the mascot caption and refine the card interior**

Add a small mono caption using `--auth-ink-soft`, a rose status dot, and a short divider between its two phrases. Reduce the choice action margin to `1rem`, keep social providers inside the card, and use `overflow: hidden` on the card to prevent shadows or child surfaces from visually breaking the rounded edge.

Use these exact caption rules:

```css
.stellar-auth-mascot-dock p {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 1.6rem;
  color: var(--auth-ink-soft);
  font-family: var(--font-mono);
  font-size: 0.56rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stellar-auth-mascot-dock p span {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: var(--rose);
  box-shadow: 0 0 0 0.2rem rgb(245 119 153 / 12%);
}

.stellar-auth-mascot-dock p i {
  width: 1rem;
  height: 1px;
  background: var(--auth-line-strong);
}
```

- [x] **Step 3: Add mobile and reduced-motion refinements**

At `max-width: 520px`, stack the mascot and caption tightly, cap the pig at `7.25rem`, reduce card padding to `1.15rem`, and keep the dock below the card in normal flow. Under `prefers-reduced-motion: reduce`, set `.stellar-auth-mascot-dock .stellar-auth-pig { content: url("/piggy.png"); }` so the placement remains visible without GIF animation.

- [x] **Step 4: Run the focused UI contract**

Run: `node --test tests/web-routing-ui.test.mjs`

Expected: PASS.

- [x] **Step 5: Commit the card styling**

```bash
git add apps/web/app/globals.css tests/web-routing-ui.test.mjs
git commit -m "style: enhance signup login card"
```

---

### Task 3: Verify the complete refinement

**Files:**
- Verify: `apps/web/app/components/WalletAuthFlow.tsx`
- Verify: `apps/web/app/globals.css`
- Verify: `apps/web/app/page.tsx`

**Interfaces:**
- Consumes: The completed card and mascot refinement.
- Produces: Test, build, route-health, and landing-isolation evidence.

- [x] **Step 1: Run the complete repository test suite**

Run: `corepack pnpm test`

Expected: 32 tests pass with zero failures.

- [x] **Step 2: Run the production web build**

Run: `corepack pnpm --filter @piggybanq/web build`

Expected: Next.js compilation, type checking, static generation, and route output complete with exit code 0.

- [x] **Step 3: Restart the port-3010 dev server if the build replaced its `.next` artifacts**

Inspect the response body first. If it reports a missing `.next/server` chunk, stop only the verified port-3010 Next process and restart:

```bash
corepack pnpm --filter @piggybanq/web exec next dev --port 3010 --hostname 127.0.0.1
```

- [x] **Step 4: Verify route health and landing isolation**

Run:

```bash
curl -sS -o /dev/null -w 'login=%{http_code}\n' http://127.0.0.1:3010/login
curl -sS -o /dev/null -w 'signup=%{http_code}\n' http://127.0.0.1:3010/signup
git diff 2408ea7..HEAD -- apps/web/app/page.tsx
```

Expected: Both routes return 200 and the landing page diff is empty.

- [x] **Step 5: Record the final clean state**

Run: `git diff --check && git status --short && git log --oneline -6`

Expected: No whitespace errors, a clean worktree, and both refinement commits in recent history.
