# Web dashboard alignment with Android

Completed 2026-10-05. Baseline: aef59603ef36cd512d8b9826e53a68e5dfc0033f.

## Result

The authenticated web dashboard uses the Android banking design: cool neutral surfaces, navy balance card, coral accents, compact greeting, Send/Receive/Save/Refresh actions, original interactive piggy GIF, saved plan cards, and Home/Save/Send/You navigation. Desktop retains a sidebar and secondary tools; phone and tablet widths use fixed bottom navigation with safe-area padding. Light and dark themes retain readable forms and transaction sheets.

Budget and goal pages use persisted planning managers and compact headings. Sample budget figures, agent caps, bridge policies and sample goal progress were removed from these routes. Plan previews show backend planning amounts, not money deposited or invented progress. Web plans remain backend records; Android plans remain device-local.

Balances come from Horizon through the existing authenticated API. Formatting preserves meaningful seven-decimal Stellar precision using bigint. Ledger balances after selling liabilities are labeled accurately; XLM reserve/fees and USDC trustline/authorization constraints remain explicit. Unfunded/error states do not substitute zero or demo balances.

Receive shows/copies only the complete public address in a native modal. Stale native close events are ignored when React Strict Mode reopens the sheet. Closing Send clears its navigation hash so the primary Send link can reopen it. Transaction review shows complete wrapping source/destination/issuer addresses. Existing local signing, quote validation, read-only limits and unresolved-status handling are preserved.

## Verification

- pnpm test: 125 total; 120 passed, five opt-in integrations skipped, zero failures. The new amount-format test failed before implementation and passed afterward.
- Workspace pnpm lint passed. Final Next production build passed with a local API upstream for preview verification.
- Focused code review: receive lifecycle and misleading balance wording corrected; final recheck found no remaining consequential issue.
- In-app browser against the production Next build and local API/Postgres: disposable encrypted Testnet wallet signup, verified session/protected reload, synthetic profile save, actual budget save/reload and matching Home preview.
- Horizon displayed actual 10,000 XLM Friendbot funding for a disposable Testnet fixture; USDC zero/missing-trustline state was verified. No new payment was signed or submitted during this design phase.
- Balance privacy, public-address copy, piggy tap reaction, Receive dismissal with Escape, repeated mobile Send opening and full payment review were verified.
- Desktop 1280px, phone 320px/390px and tablet 768px had no horizontal document overflow. Light/dark Home and planning screens were visually inspected. Sample browser console had no warning/error entries.
- Screenshots are in the adjacent outputs directory: web-aligned-desktop.jpg, web-aligned-mobile.jpg, web-aligned-dark.jpg, web-aligned-budget-mobile.jpg and web-aligned-transaction-review.jpg.

## Release boundary

This is a locally verified Testnet dashboard update. No public deployment or store promotion occurred. Existing hosting, production database, backup/restore, monitoring, shared-limiter and Android release-signing requirements still apply. Native APK and Android source were not changed. The four documented Expo/Metro advisory exceptions were not reassessed by this visual phase.
