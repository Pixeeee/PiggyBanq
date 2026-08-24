# Web Portfolio Dashboard Design

## Purpose

Make the PiggyBanq web dashboard feel like a modern crypto portfolio workspace while keeping PiggyBanq's own brand palette, self-custodial guardrails, and no borrowed proprietary logos or assets.

## Scope

- Redesign the `/dashboard` overview page.
- Expand the left sidebar navigation to the requested portfolio items.
- Add portfolio summary, action buttons, tabs, filters, and token table/list.
- Keep existing authenticated dashboard routes reachable.
- Make the dashboard dark-first and responsive.

## Layout

- Fixed left sidebar on desktop with PiggyBanq logo placeholder at the top.
- Mobile collapses the sidebar into a horizontally scrollable navigation rail.
- Main workspace starts with a large `Dashboard` title.
- Action row uses rounded pills: Buy, Swap, Bridge, Send, Sell, Stake.
- Portfolio card includes account label, large balance, visibility toggle, daily change, tabs, filters, and token table.

## Data

Static portfolio display data is stored in dashboard data. It includes token symbol, name, portfolio percent, price, 24h change, balance, and a local color for the circular icon. No fake transaction execution or wallet balance sync is introduced.

## Guardrails

- Do not use MetaMask names, fox icon, logos, or proprietary assets.
- Do not imply real asset custody or live trading.
- Keep self-custodial safety copy visible.
- Action buttons are navigation-style UI affordances; no silent signing or fund movement.

## Testing

- Update dashboard tests to assert the requested portfolio UI labels and token table fields.
- Keep auth/session tests intact.
- Run `pnpm test` and `pnpm build`.
