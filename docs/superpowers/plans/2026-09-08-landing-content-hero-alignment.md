# Landing Content Hero Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the landing page content beneath the hero as a warm, Poppins-led continuation of the hero without changing its structure or behavior.

**Architecture:** The change stays confined to the existing landing-content selector block in `apps/web/app/globals.css`. A static Node test in the established landing-page test file protects the warm palette, type family, shared surface treatment, and retention of desktop/mobile layout rules.

**Tech Stack:** Next.js, React, CSS, Node.js built-in test runner.

## Global Constraints

- Modify only `apps/web/app/globals.css` and `tests/web-routing-ui.test.mjs`.
- Keep the existing strip, steps, security section, CTAs, markup, routes, links, and responsive grid behavior.
- Use `Poppins, var(--font-body)` in `.landing-content-sections`.
- Use the existing `--cream`, `--peach`, and `--rose` tokens with a dark warm background; do not use wallet-green tokens inside the content-section styling block.
- Maintain readable contrast and existing semantic/focus behavior.

---

### Task 1: Protect the hero-aligned content styling contract

**Files:**
- Modify: `tests/web-routing-ui.test.mjs`

**Interfaces:**
- Consumes: CSS source read by `readFileSync('apps/web/app/globals.css', 'utf8')`.
- Produces: a test named `landing content continues the hero palette and typography` that asserts the intended CSS contract.

- [ ] **Step 1: Write the failing test**

Add this test after the existing landing-page test:

```js
test('landing content continues the hero palette and typography', () => {
  const css = readFileSync('apps/web/app/globals.css', 'utf8');

  assert.match(css, /\.landing-content-sections\s*\{[\s\S]*font-family:\s*"Poppins", var\(--font-body\)/);
  assert.match(css, /\.landing-content-sections\s*\{[\s\S]*var\(--cream\)/);
  assert.match(css, /\.landing-content-sections \.landing-step\s*\{[\s\S]*rgb\(255 247 205 \/ 6%\)/);
  assert.match(css, /\.landing-content-sections \.landing-step span\s*\{[\s\S]*color:\s*var\(--rose\)/);
  assert.match(css, /\.landing-content-sections \.landing-primary\s*\{[\s\S]*background:\s*var\(--rose\)/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --test --test-name-pattern="landing content continues" tests/web-routing-ui.test.mjs
```

Expected: FAIL because the current content block uses `var(--wallet-*)` tokens and has no Poppins declaration.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/web-routing-ui.test.mjs
git commit -m "test: define landing content hero style contract"
```

### Task 2: Apply the hero palette to the landing content area

**Files:**
- Modify: `apps/web/app/globals.css:3246-3350`
- Test: `tests/web-routing-ui.test.mjs`

**Interfaces:**
- Consumes: `--cream`, `--peach`, and `--rose` defined at the CSS root; existing `.landing-content-sections` child selectors.
- Produces: warm, frosted content containers with Poppins typography, while retaining the existing `min-width: 760px` three-step grid and mobile layout rules.

- [ ] **Step 1: Replace wallet-theme declarations in the content-section block**

Update the `.landing-content-sections` selector and its direct child selectors to use these values:

```css
.landing-content-sections {
  background:
    radial-gradient(circle at 88% 8%, rgb(245 119 153 / 16%), transparent 28rem),
    linear-gradient(180deg, #120d0e 0%, #1b1114 52%, #120d0e 100%);
  color: var(--cream);
  font-family: "Poppins", var(--font-body);
}

.landing-content-sections .landing-step,
.landing-content-sections .landing-security ul,
.landing-content-sections .landing-cta {
  border-color: rgb(255 247 205 / 18%);
  background: rgb(255 247 205 / 6%);
}
```

Use `rgb(255 247 205 / 4%)` through `rgb(255 247 205 / 9%)` for other warm glass surfaces, `rgb(255 247 205 / 18%)` through `rgb(253 195 161 / 30%)` for borders, `var(--cream)` for headings and key list text, `rgb(255 247 205 / 72%)` or `var(--peach)` for supporting text, and `var(--rose)` for labels, step numbers, and the primary CTA background. Remove all `var(--wallet-*)` declarations from the `.landing-content-sections` selector block.

- [ ] **Step 2: Keep interaction and responsive behavior intact**

Retain these existing rules unchanged:

```css
@media (min-width: 760px) {
  .landing-content-sections .landing-step-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 759px) {
  .landing-content-sections {
    padding-top: 1rem;
  }
}
```

Add visible keyboard focus styling for content links:

```css
.landing-content-sections .landing-primary:focus-visible {
  outline: 2px solid var(--cream);
  outline-offset: 3px;
}
```

- [ ] **Step 3: Run the focused test to verify it passes**

Run:

```bash
node --test --test-name-pattern="landing content continues" tests/web-routing-ui.test.mjs
```

Expected: PASS with one matching test and no failures.

- [ ] **Step 4: Run the full test suite**

Run:

```bash
npm test
```

Expected: all Node test files pass with zero failures.

- [ ] **Step 5: Inspect the running page at desktop and mobile widths**

Open `http://127.0.0.1:3010/` and inspect the lower section at a desktop viewport and a viewport narrower than 760px. Confirm warm background, cream/peach/rose hierarchy, Poppins typography, readable text, a functioning horizontal pill strip, and preserved stack/grid behavior.

- [ ] **Step 6: Commit the completed styling**

```bash
git add apps/web/app/globals.css tests/web-routing-ui.test.mjs
git commit -m "style: align landing content with hero"
```
