# Editorial PiggyBanq landing page — 2026-10-27

Adapted the supplied Orvante three-section reference inside the existing Next.js
site: warm editorial hero, scroll-fill belief statement, and bordered ownership /
security / Testnet panel. Kept PiggyBanq artwork, rose/cream/plum palette, persistent
accessible navigation, signup/login routes and the existing wallet application.
No fictional customer counts, awards, endorsements or partner marks were added.
Native screens, database, signing, payment approvals and spending limits were not
changed by this release.

## Motion and accessibility

Browser-native Web Animations and IntersectionObserver reveal hero elements and
cards. A passive scroll listener schedules one animation frame to fill statement
words in reading order with a three-word soft edge. The factual 100% local-signing
counter reaches its final value over 1.4 seconds. Reduced motion shows all content
complete, disables transitions, and fetches no hero video. Without JavaScript the
statement and final counter remain readable. No animation dependency was added.

The fixed shared header remains outside the landing content. Same-page navigation
now explicitly scrolls to sections and respects their header margin; menus retain
Tab wrapping, Escape and focus restoration. Signup controls do not overlap fact
cards at tablet, desktop and wide-desktop sizes. The video control sits inside the
curved image frame.

## Video enhancement

Re-encoded from the original 864×480, 24 fps, 5.041667-second source, rather than
from the earlier 18 fps web encodes. H.264/yuv420p, CRF 18, faststart, Lanczos resize,
and mild unsharp filtering preserve the existing scene and colors. Matching first
frame WebP posters were regenerated. No synthetic frames or new source detail are
claimed: these are upscaled outputs from a lower-resolution original.

| Variant | Dimensions | FPS | MP4 bytes | Poster bytes |
| --- | --- | ---: | ---: | ---: |
| Landscape | 1296×720 | 24 | 3,842,799 | 112,338 |
| Portrait | 720×1280 | 24 | 2,178,389 | 54,338 |

These files favor quality and are larger than the earlier 448,013 / 380,936-byte
clips. File sizes are not loading-speed measurements. Each viewport still selects
only its own variant. Visibility pause, breakpoint cleanup, manual pause/play,
poster-first delivery, reduced-motion/save-data static mode and error fallback
remain in the shared media component (including authentication pages).

## Verification

- Next production build passed; 146 automated tests passed, 9 optional tests skipped.
- Both MP4s fully decoded without FFmpeg errors; metadata confirmed dimensions,
  duration and 24 fps. An enhanced frame and desktop/phone screenshots were inspected.
- `tests/release-editorial-landing.mjs`: 320, 390, 768, 1440 and 1920 pixels;
  no overflow, clear signup action, scroll fill, completed counter, signup routing,
  and static reduced-motion behavior passed.
- `tests/release-site-experience.mjs`: 320×740, 390×844, 430×932, 1440×1000;
  correct-only media requests, pause/play, resize, persistent navigation, keyboard
  focus/Escape, anchor offsets, auth menu, reduced motion and failed video passed.
- Vercel Production deployment `a2401ea` completed successfully. Both landing
  and responsive/navigation suites also passed against the production alias
  https://piggy-banq-web.vercel.app after deployment propagation completed.
- Hosted dashboard desktop/phone/dark/reduced-motion, exact fixture totals,
  balance privacy, persistent authenticated menu and receive/send dialogs passed.
- Preview: `qa-screenshots/editorial-hero-desktop.png`.
- Full phone preview: `qa-screenshots/editorial-page-390.png`.

Physical-device performance and loading speed were not measured. No new native
build was needed for this website-only change. The reference's recorder mode and
fictional agency media/copy were not carried into the product.
