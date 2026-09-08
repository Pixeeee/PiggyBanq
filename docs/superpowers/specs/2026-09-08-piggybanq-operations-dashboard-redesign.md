# PiggyBanq Operations Dashboard Redesign

## Goal

Rebuild `/dashboard` as a compact financial operations workspace that follows the supplied staking-dashboard layout while retaining PiggyBanq's identity, testnet safety, and existing functionality.

## Scope

- Change only the authenticated dashboard overview composition and its scoped styles.
- Preserve the landing-page hero, authentication surfaces, allocations page, and Sell/Swap/Bridge/Stake workspaces.
- Preserve the agentic preview, explicit approval, execution, and sandbox receipt lifecycle.
- Keep all balances, rates, yield, and activity clearly labeled as illustrative testnet data.

## Layout

1. The existing dark-chocolate navigation remains the left rail on desktop and becomes a compact five-item header navigation on mobile.
2. A slim dashboard header shows the page title, `Stellar Testnet` status, wallet label, and quick navigation to Stake.
3. Four equal KPI cards show total savings, available balance, estimated yield, and active pockets.
4. The primary grid mirrors the reference: a savings-lock and maturity card on the left, and a larger weekly savings activity chart on the right.
5. The secondary grid contains a compact quick-action panel and an XLM/USDC rate panel.
6. The existing token portfolio table and agentic command center remain available below the primary operational view, but with less visual priority.

## Visual System

- Canvas: warm ivory (`#fffaf0`).
- Navigation and strongest ink: dark chocolate (`#2b1c1c`).
- Primary action/status: PiggyBanq rose (`#f57799`).
- Secondary accent: peach (`#fdc3a1`).
- Success: muted mint used only for positive states.
- Display headings: the landing-page serif face; controls and body text: the landing-page sans face; financial values: tabular numerals.
- Shape language: compact 14–18px cards, restrained shadows, and clear border hierarchy rather than large marketing cards.

## Interaction and Accessibility

- Balance visibility remains keyboard operable and retains its accessible label.
- Quick-action links use the existing `/dashboard/pockets` hash routes.
- Chart information has a text summary and day/value labels; color is not the only signal.
- Focus-visible states remain present for links, buttons, and controls.
- Mobile layouts stack the primary and secondary grids without horizontal content overflow.
- Reduced-motion preferences continue to disable nonessential transitions.

## Verification

- Add source-contract assertions for the four KPIs, maturity panel, weekly chart, quick actions, rate panel, and retained command center.
- Run the full Node test suite and the Next.js production build.
- Browser-check `/dashboard` at 1440px and 500px widths and exercise balance visibility plus agentic preview/approval/execution.
