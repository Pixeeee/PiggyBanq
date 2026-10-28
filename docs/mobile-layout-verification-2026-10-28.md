# Mobile typography and bottom navigation

Desktop retains the sidebar. On mobile web, a plum bottom bar with pink active state provides Home, Save, Send, You and More. More preserves access to Test API payments, Allocations, Swap and Yield Lab. Selecting a same-page tool closes the menu. A ResizeObserver reserves the actual bar height below page content, including enlarged text and safe-area padding. Native keeps Home, Save, Send, Sync and You at the bottom with matching colors and flexible tab heights.

Enlarged text exposed two layout constraints, now fixed:
- Web sign-up grid items used intrinsic minimum widths, letting the heading widen the card beyond a 360px phone. The grid items can now shrink and headings wrap.
- Native transaction headings beside an icon could extend beyond their card at 200% text. The heading now takes the available space and wraps.

Verification:
- Production web and Android builds and native TypeScript passed.
- Node suite: 161 passed, 9 optional tests skipped, zero failures.
- Browser checks at 360px and 390px, with normal and 200% text-only enlargement: sign-up, dashboard, More, all feature routes at 200%, viewport bounds, clipped controls, whole bottom-navigation labels, measured bottom spacing and same-page More selection. Desktop sidebar visibility is checked separately.
- Android emulator at 360dp width with system font scales 1.0, 1.5 and 2.0: unlock, home, send, swap, agent, savings, sync, profile, receive-sheet navigation and light/dark themes. Instrumentation checks native TextView line extents, ellipsizing, vertical clipping and parent/phone width containment. Horizontal carousels and editable horizontal text fields retain their normal scrolling behavior.
- Native screenshots remain protected. No payment, faucet request or wallet signature was performed by these checks.

Limits: web enlargement is a controlled text-only simulation, not a physical browser's operating-system font preference. Native line measurements inspect the activity view hierarchy; modal interaction is exercised separately. Physical Android devices, iOS, text scales above 200%, and every possible user-supplied name/content were not checked.
