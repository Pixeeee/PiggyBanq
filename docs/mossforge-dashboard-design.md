# PiggyBanq dashboard — Mossforge adaptation

## Selected direction

Apply Mossforge's public visual language to every authenticated dashboard screen on web and native: soft bordered cards, quiet cream canvas, pill controls, clear metrics, compact status badges, consistent fields and restrained interaction feedback. Keep PiggyBanq pink and cream, with deep plum for prominent panels and rose for actions. Keep the existing light/dark theme choice.

The other approach was Mossforge's original evergreen/lime palette. The user selected PiggyBanq's existing palette instead. A new component framework is unnecessary: reuse and update the current shared components and theme values.

## Reach

- Home: wallet summary, activity chart/list, planning cards and companion.
- Savings goals, allocations and pockets; swap and Yield Lab presentation.
- Agent and x402 paid API screens, including previews, approval states and receipt presentation.
- Profile/settings, desktop/sidebar navigation, phone navigation and dashboard site menu.
- Transaction, receive, confirmation and native sheet dialogs; loading, empty, error, disabled and success states.
- Shared buttons, inputs, selectors, tabs, badges and cards on both platforms. Native components use React Native styles rather than copying browser CSS.

## Component decisions

- Cream paper canvas; flat soft-bordered cards with consistent spacing and rounded corners.
- Dark plum wallet/panel surfaces; rose emphasis and readable light text. Metric figures use tabular numerals.
- Pill buttons/segments with clear selection, keyboard focus, disabled and pressed states. Standardize dashboard actions to this kit, replacing the previous raised wallet-only treatment so controls form one family.
- Clearly labeled fields with quiet fills, visible borders and focus/error states. Retain existing labels and validation messages.
- Desktop keeps its sidebar and multi-column overview. Phones keep bottom navigation, stack cards and use equal-size action controls without horizontal page overflow.
- Preserve 44–48px touch targets, text scaling, reduced motion and light/dark contrast.

## Boundaries

This is a presentation change. Preserve account/session behavior, saved plans, calculation code, wallet protection, approval/signing requirements, spending limits and receipt verification. Keep the sunny landing page and authentication/recovery screens outside this dashboard-only redesign. No database, infrastructure, credential or payment-protocol changes.

The Uiverse kit page and component previews are public; full design-system source/download currently requires sign-in. Recreate the visible treatments with existing components, cite the reference and preserve any attribution for copied public component code. Do not claim a full source-kit import.

## Verification and delivery

Run the production web build, relevant unit tests and native TypeScript checks. Browser-check authenticated overview and every dashboard route at phone/desktop widths, light/dark themes, focus/disabled states, dialogs, and overflow. Reuse disposable QA accounts and isolated layout fixtures; no test payments. Inspect screenshots of web and the available native preview. Report physical-device checks separately rather than claiming they passed.

Commit and push the reviewed implementation to the existing deployment path. Verify live availability when Vercel completes; preserve the user's instruction to leave unrelated builds alone if queued.
