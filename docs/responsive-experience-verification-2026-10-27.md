# Responsive web and native experience — 2026-10-27

Applied the supplied MOBILE EXPERIENCE requirements to desktop web, phone web,
and the existing native app. Web uses one responsive codebase. Native retains its
own screens and shared account/data flows.

## Changes

- Persistent safe-area-aware brand header outside web page content and native
  Stack; usable on auth and dashboard screens after scrolling.
- Web modal navigation supports focus entry/return, Tab/Shift+Tab wrapping,
  Escape, link selection, skip-to-content, and header-aware anchor offsets.
- Native modal navigation supports close, Android Back, accessibility focus,
  and existing dashboard sections without recreating the cloud workspace.
- Smaller hero copy and one main CTA; normal scroll, visible explore/skip controls.
- One selected video source, responsive WebP poster, pause/play, visibility pause,
  breakpoint cleanup, reduced-motion/save-data static mode and error fallback.
- Phone asset is a deliberate 9:16 reframe of the existing PiggyBanq scene.
  Landscape is 864×480; portrait is 540×960; both run at 18 fps.

This product has a five-second looping video, not a pinned frame-sequence story.
No new generated cinematic narrative, clip-to-clip transitions, scroll-to-frame
mapping, rotations or zoom story was introduced. Those conditional requirements
therefore do not apply. Posters render immediately while browser-native video
streaming loads; the page never waits for all media bytes.

## Measured asset bytes (not loading-speed measurements)

| Asset | Bytes |
| --- | ---: |
| Landscape MP4 | 448,013 |
| Portrait MP4 | 380,936 |
| Landscape WebP | 47,460 |
| Portrait WebP | 24,952 |
| Header mark WebP | 1,524 |

No real-device loading-speed or 60 fps performance claim is made.

## Verification

- Production Next build and mobile TypeScript check passed.
- Automated suite: 146 passed, 9 optional checks skipped, 0 failed.
- `tests/release-site-experience.mjs`: 320×740, 390×844, 430×932,
  1440×1000, initial scroll cue, no horizontal overflow, correct-only MP4
  requests, pause, persistent header, menu focus/Tab/Escape, anchors,
  phone-to-desktop resize, auth menu, reduced-motion zero-video requests,
  and aborted-video poster fallback passed locally.
- `tests/release-clean-dashboard.mjs`: desktop/phone/dark/reduced-motion,
  exact fixture totals, persistent authenticated menu, balance privacy,
  and receive/send dialogs passed. Data fixtures stay inside the QA browser.
- Production Vercel deployment of `e364151` succeeded; the responsive and
  authenticated dashboard browser checks also passed against
  https://piggy-banq-web.vercel.app.
- Android release on the disposable PiggyBanq_QA emulator: persistent auth
  menu, Home/Save menu selection, backup, real Testnet trustline and swap,
  agent preview/approval, real x402 payment with verified receipt recovery,
  signed API login, shared data persistence, unlock/reconnect and background
  lock all passed.
- Separate Android run with system animation scales disabled passed dashboard,
  tabs and receive-sheet checks; emulator settings were restored afterward.
- Portrait first and end frames and actual 320/1440 screenshots inspected.
  Full-bleed environment and pig identity remain consistent.
- Mobile review image: `qa-screenshots/persistent-hero-390.png`.

## Android artifact

`apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

SHA-256: `a98583fde3539a6f56fa9ab1751d1f819ed8d387731ec663852ce424420bff4c`

Physical phones, iOS builds, VoiceOver/TalkBack hands-on review, and real-device
network/GPU profiling were not performed. Android screenshot protection remains
on. Database schema, restricted roles, encrypted backups and payment limits were
not changed.
