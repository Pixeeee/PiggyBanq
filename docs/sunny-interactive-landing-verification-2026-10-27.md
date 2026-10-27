# Sunny interactive PiggyBanq landing

The selected Meadowbell direction is adapted to PiggyBanq: sunny video scenery, rounded display type, sage navigation, pink savings illustrations, scroll chapters, and an interactive savings playground. Existing local landscape/portrait videos and posters are reused. No external art, models, AI services, or generated media are required. The landscape remains video; the separate playground contains original procedural Three.js geometry.

## Interaction and safety

- One primary signup CTA, a distinct playground link, accessible navigation dialog, and real sign-in/dashboard links.
- Desktop scroll pins four savings chapters; phone layouts use keyboard-accessible chapter tabs and swipeable cards.
- Three savings goals, exact integer-money projections, adjustable contributions/time, demo deposits, Plan/Grow/Review modes, constrained opt-in 3D rotation, and reset.
- The planning companion is a scripted demonstration. Its preview requires explicit approval before showing a clearly labeled sample receipt. It never calls the payment API, signs transactions, or creates a verified blockchain receipt. Existing account/payment routes are unchanged.
- No interest or investment returns are assumed. Testnet and self-custody limitations remain visible.
- The timed introduction counter is a short presentation, not measured asset-download progress. It appears once per tab and can be skipped.

## Motion and rendering

GSAP 3.15.0, Three.js 0.186.1, React Three Fiber 9.8.2, Drei 10.7.9, and Tailwind 4.3.3 are pinned. Tailwind utilities/theme are imported without preflight to preserve existing account/dashboard styles.

The 3D bundle loads near the playground. Rendering uses demand mode and stops after changes settle or while offscreen/hidden; DPR is capped at 1.5. Scroll triggers, timelines, observers, and event listeners clean up on navigation. Reduced motion skips video, intro, pinned choreography, and WebGL. Unsupported/lost WebGL and the manual simple-view toggle retain working SVG controls. Existing CSP/security headers are unchanged.

## Verification

Production Next.js build passed. Unit suite: 149 passed, 9 optional skipped, 0 failed. Browser regression scripts cover:

- Sunny interactions at 360, 390, 768, 1024, and 1440 pixels, including exact totals, explicit approval, reset, no backend requests, and signup navigation cleanup.
- Actual 3D canvas rendering and pointer rotation; desktop pinned chapter changes.
- Reduced motion and WebGL-disabled interactive fallback.
- Video selection/pause, responsive media transitions, menu focus/Escape, anchors, and failure fallback at 320, 390, 430, and 1440 pixels.
- Existing dashboard desktop/phone, dark mode, reduced motion, exact fixture totals, balance privacy, and receive/send dialogs.

Commands from repository root:

```bash
pnpm test
pnpm --filter @piggybanq/web build
node tests/release-sunny-landing.mjs
node tests/release-site-experience.mjs
node tests/release-clean-dashboard.mjs
```

Browser checks require a running production server on port 3010 and Chrome at `/usr/bin/google-chrome`. Set `RELEASE_WEB_URL` to test another origin. Dashboard regression creates a disposable Testnet QA account and intercepts layout fixtures in its browser; it performs no payment.

## Run and deploy

Use Node 24 and pnpm 11.7.0. On the existing workstation, first run:

```bash
export PATH=/home/dev1/.local/share/piggybanq-runtime/node_modules/.bin:$PATH
cd /home/dev1/Documents/ChatGPT/practice/PiggyBanq
pnpm install --frozen-lockfile
API_BASE_URL=https://piggybanq-api.onrender.com pnpm --filter @piggybanq/web build
API_BASE_URL=https://piggybanq-api.onrender.com pnpm --filter @piggybanq/web exec next start --hostname 127.0.0.1 --port 3010
```

Open http://127.0.0.1:3010. Vercel uses the existing project rooted at `apps/web`, Node 24, and the existing API base URL; no new secrets are needed. A push to `main` triggers production deployment. Leave unrelated BuildMindz builds alone if the free build slot is occupied.

## Limits

Reference motion on ZEGGO was not directly inspected; the implementation follows the supplied interaction brief and selected screenshot direction. Physical iOS/Android hardware, Safari, and hardware frame rates have not been measured. Browser 3D checks use software rendering, so they prove behavior rather than a hardware performance guarantee.

Dependency audit reports no unignored production findings; three existing ignored high advisories remain documented in [DEPENDENCY-SECURITY.md](DEPENDENCY-SECURITY.md). No new exceptions were added. GitHub Actions is currently blocked by the account billing lock; local verification does not imply remote CI passed.
