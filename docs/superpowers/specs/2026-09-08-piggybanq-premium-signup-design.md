# PiggyBanq Premium Signup Design

**Date:** 2026-09-08
**Status:** Approved for implementation

## Objective

Redesign `/signup` as a premium PiggyBanq onboarding experience that clearly belongs to the existing landing page. Preserve all wallet-security behavior while replacing the current generic authentication presentation with a cinematic, editorial split-screen layout.

## Scope

The redesign applies to the shared `WalletAuthFlow` experience reached from `/signup`, including the initial wallet choice, local-wallet password creation, recovery phrase confirmation, existing-wallet login, provider placeholder modal, status feedback, and dashboard transition.

The implementation must not change wallet creation, local encryption, recovery phrase validation, Stellar challenge signing, session behavior, API calls, or route destinations.

## Visual Direction

### Desktop composition

Use a full-height 54/46 split-screen composition:

- The left panel is a cinematic brand environment using the landing hero's `/piggy_bg.mp4` video with `/piggy.png` as its poster and fallback.
- A controlled dark-brown overlay keeps cream typography legible and connects the panel to the landing hero.
- PiggyBanq branding, an editorial headline, and three factual self-custody assurances occupy the upper and middle portions of the panel.
- `/piggy.gif` is presented as a small animated character walking along the exact top border of the primary login or wallet-choice card. It must not overlap interactive content.
- The right panel is a warm-white signup workspace containing the active form or choice card.

### Mobile composition

Below the desktop breakpoint, collapse to one column:

- Convert the cinematic panel into a compact branded header.
- Keep the headline brief and preserve strong contrast.
- Reduce `/piggy.gif` and keep its top-border path inside the card width so it remains decorative and cannot obscure form controls.
- Allow the form area to grow naturally instead of forcing the full experience into a fixed viewport height.

## Brand System

Reuse the landing page's established palette and typography:

- Cream: `#fff7cd`
- Peach: `#ffc3a5`
- Rose: the active PiggyBanq rose token
- Dark brown: the established `#4a2c2a` family
- Warm white: a lightly tinted white for the signup workspace
- Primary typeface: Poppins
- Editorial accent: Source Serif 4, italic and used sparingly
- Mono metadata: the existing mono family for step indicators and security labels

Avoid the current cool-blue Maxi auth override inside the signup experience. Blue may remain only where it belongs to a third-party provider's brand mark.

## Information Architecture

### Persistent brand panel

The left panel communicates:

- PiggyBanq wordmark with a route back to the landing page
- A short headline about building savings while keeping custody
- Three concise assurances grounded in current behavior: local encryption, user-held recovery phrase, and Stellar testnet status
- A small current-step indicator that reflects the active onboarding screen

### Signup workspace

The right workspace includes:

- A compact progress header for the active screen
- A single focused card instead of multiple competing surfaces
- Existing field labels, security explanations, validation requirements, and actions
- Clear primary, secondary, and tertiary action hierarchy
- Development-only demo access visually separated from production-facing choices
- Optional identity providers grouped as secondary options and explicitly identified as placeholders where currently required

### Approved card and mascot refinement

- Present the wallet-choice and existing-wallet login content as one cohesive warm-ivory card rather than a collection of floating controls.
- Give the card a subtle rose-tinted border, generous rounded corners, balanced internal padding, and a restrained layered shadow.
- Keep optional identity providers inside the choice card and separate them from primary wallet actions with a clean divider.
- Remove `/piggy.gif` from the cinematic left panel and delete the beneath-card mascot dock.
- Add a dedicated decorative rail on the exact top border of the right-side choice or login card.
- Render the GIF between 44 and 52 CSS pixels wide and animate it continuously from left to right along the top border over 10 to 12 seconds.
- Fade the pig briefly at both ends of the rail so the loop reset is not visually abrupt.
- Keep the pig outside the content box and above the card border so it never covers headings, fields, or buttons.
- Hide the rail during password creation and recovery phrase confirmation so security-sensitive forms remain focused.
- Under `prefers-reduced-motion: reduce`, stop the travel animation and park the pig near the top-right corner of the card.

## Interaction and State Design

- Preserve the existing screen state machine: `choice`, `create-password`, `recovery`, and `login`.
- Use short opacity and vertical-position transitions only when the screen state changes.
- Provide visible hover, focus, active, disabled, loading, success, and error states.
- Respect `prefers-reduced-motion` by removing nonessential transitions and pausing decorative motion where practical.
- Keep status and error messages in reserved space or stable toast placement to avoid layout shifts.
- Keep the recovery phrase deliberately protected until the user reveals it.

## Accessibility

- Maintain semantic headings, labels, buttons, forms, live regions, and dialog roles.
- Preserve keyboard access and visible focus indicators.
- Ensure body text and interactive controls meet WCAG AA contrast.
- Keep touch targets at least 44 by 44 CSS pixels.
- Mark video and pig animation as decorative so they do not add screen-reader noise.
- Ensure content remains usable at 320px width and at increased text zoom.

## Technical Approach

- Refactor only the presentation markup in `WalletAuthFlow.tsx`; retain its authentication and wallet functions.
- Add signup-specific structural classes for the brand panel, workspace, progress header, trust items, and decorative media.
- Replace conflicting auth styling in `globals.css` with one coherent PiggyBanq auth layer placed after legacy overrides so the cascade is deterministic.
- Reuse existing assets from `apps/web/public`; do not add new generated imagery.
- Update static UI tests to assert the new layout contract while preserving existing wallet-flow contracts.

## Acceptance Criteria

- `/signup` visually matches the landing hero's palette and font system.
- Desktop displays a polished two-panel layout; mobile displays a clean single-column layout.
- `/piggy.gif` walks left-to-right along the exact top border of the right-side choice or login card and remains non-obstructive at all supported sizes.
- The choice and login surfaces read as complete warm-ivory cards with consistent borders, padding, dividers, and shadows.
- The hero section on `/` is not modified.
- All existing signup, login, wallet creation, recovery confirmation, provider modal, demo, and redirect behavior remains intact.
- Keyboard focus, form labels, status messages, and reduced-motion behavior remain accessible.
- Relevant tests and the production web build pass.
