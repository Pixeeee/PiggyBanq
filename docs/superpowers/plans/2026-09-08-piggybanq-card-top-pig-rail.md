# PiggyBanq Card-Top Pig Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a small animated pig walk left-to-right along the exact top border of the wallet-choice and login cards.

**Architecture:** Replace the beneath-card mascot dock with a reusable decorative `PigRail` rendered inside each eligible card. Position the rail absolutely against the card border, animate only the image's horizontal position, and park it statically near the right edge for reduced-motion users.

**Tech Stack:** React 19, TypeScript, CSS keyframes, Node test runner

## Global Constraints

- Render `/piggy.gif` between 44 and 52 CSS pixels wide.
- Keep the animation on the card's top border and outside its content box.
- Run the loop left-to-right over 10 to 12 seconds with soft endpoint fades.
- Show the rail only on the wallet-choice and login cards.
- Under `prefers-reduced-motion: reduce`, remove travel and park the pig near the top-right corner.
- Do not change wallet behavior or the landing hero.

---

### Task 1: Replace the mascot dock with a reusable card rail

**Files:**
- Modify: `tests/web-routing-ui.test.mjs`
- Modify: `apps/web/app/components/WalletAuthFlow.tsx`
- Test: `tests/web-routing-ui.test.mjs`

**Interfaces:**
- Consumes: The existing choice section, `.stellar-auth-login-card`, and `/piggy.gif` asset.
- Produces: `PigRail(): JSX.Element` and `.stellar-auth-pig-rail` markup.

- [ ] **Step 1: Write the failing rail contract**

Replace dock assertions in the premium auth test with:

```js
assert.match(component, /function PigRail\(\)/);
assert.match(component, /stellar-auth-pig-rail/);
assert.equal((component.match(/<PigRail \/>/g) || []).length, 2);
assert.doesNotMatch(component, /stellar-auth-mascot-dock/);
assert.match(css, /@keyframes stellar-auth-pig-train/);
assert.match(css, /\.stellar-auth-pig-rail \.stellar-auth-pig[\s\S]*animation:\s*stellar-auth-pig-train 11s linear infinite/);
assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.stellar-auth-pig-rail \.stellar-auth-pig[\s\S]*animation:\s*none/);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/web-routing-ui.test.mjs`

Expected: FAIL because `PigRail` and `stellar-auth-pig-train` do not exist.

- [ ] **Step 3: Add the reusable rail and remove the dock**

Add `<PigRail />` as the first child of the choice section and login form. Remove the conditional `.stellar-auth-mascot-dock` block from `.stellar-auth-stage`. Add this presentation-only component after `normalizePhrase`:

```tsx
function PigRail() {
  return (
    <span className="stellar-auth-pig-rail" aria-hidden="true">
      <img className="stellar-auth-pig" src="/piggy.gif" alt="" />
    </span>
  );
}
```

- [ ] **Step 4: Run wallet and focused UI tests**

Run: `node --test tests/web-routing-ui.test.mjs tests/web-wallet-create.test.mjs tests/web-secure-wallet-auth.test.mjs`

Expected: The UI test still fails only on missing animation CSS; wallet tests pass.

---

### Task 2: Animate the small pig on the card border and verify

**Files:**
- Modify: `apps/web/app/globals.css`
- Test: `tests/web-routing-ui.test.mjs`

**Interfaces:**
- Consumes: `.stellar-auth-pig-rail` and its `.stellar-auth-pig` child.
- Produces: `@keyframes stellar-auth-pig-train`, responsive sizing, endpoint fades, and reduced-motion parking.

- [ ] **Step 1: Replace dock CSS with top-border rail CSS**

Remove every `.stellar-auth-mascot-dock` block. Keep choice and login cards `overflow: visible`, then add:

```css
.stellar-auth-pig-rail {
  position: absolute;
  top: 0;
  right: 1.35rem;
  left: 1.35rem;
  z-index: 4;
  height: 0;
  pointer-events: none;
}

.stellar-auth-pig-rail .stellar-auth-pig {
  position: absolute;
  top: 0;
  left: 0;
  width: clamp(2.75rem, 3.4vw, 3.25rem);
  height: auto;
  max-height: none;
  animation: stellar-auth-pig-train 11s linear infinite;
  filter: drop-shadow(0 0.45rem 0.55rem rgb(74 44 42 / 18%));
  transform: translate(-20%, -56%);
}

@keyframes stellar-auth-pig-train {
  0% { left: 0; opacity: 0; transform: translate(-20%, -56%); }
  5% { opacity: 1; }
  92% { opacity: 1; }
  100% { left: 100%; opacity: 0; transform: translate(-80%, -56%); }
}
```

- [ ] **Step 2: Add responsive and reduced-motion behavior**

At 520px and below, use a 44px pig and 0.85rem rail insets. In the existing reduced-motion block, apply `animation: none`, `left: 100%`, `opacity: 1`, and `transform: translate(-100%, -56%)` so the pig parks near the top-right border.

- [ ] **Step 3: Run the focused UI test**

Run: `node --test tests/web-routing-ui.test.mjs`

Expected: PASS.

- [ ] **Step 4: Commit the rail implementation**

```bash
git add apps/web/app/components/WalletAuthFlow.tsx apps/web/app/globals.css tests/web-routing-ui.test.mjs
git commit -m "style: animate pig along login card border"
```

- [ ] **Step 5: Run full verification**

Run `corepack pnpm test`, followed by `corepack pnpm --filter @piggybanq/web build`. Restart the verified port-3010 dev process if the build invalidates `.next`, then confirm `/login` and `/signup` return HTTP 200 and `git diff 031534a..HEAD -- apps/web/app/page.tsx` prints no output.
