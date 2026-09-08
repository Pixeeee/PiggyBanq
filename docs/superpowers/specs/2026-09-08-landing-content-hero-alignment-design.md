# Landing Content Hero Alignment Design

## Goal

Make `div.landing-content-sections` feel like a direct continuation of the landing hero. The content must use the hero's warm cinematic palette and Poppins-led typography while preserving its existing information, structure, and responsive layout.

## Scope

- Update only the landing content section styling in `apps/web/app/globals.css`.
- Keep the existing strip, steps, security section, CTAs, markup, routes, and interaction behavior.
- Do not alter wallet/dashboard styling or the hero itself.

## Visual direction

- Use the hero's near-black/burgundy foundation, with cream foreground text, peach secondary copy, and rose accents.
- Apply `Poppins, var(--font-body)` to the lower landing content for a continuous typographic voice.
- Turn content containers into restrained warm frosted surfaces: low-opacity cream or peach fills, warm translucent borders, and soft depth rather than the existing green wallet cards.
- Preserve the page's existing grid texture, but tint it to the hero's warm palette so it reads as intentional background texture.
- Use cream for headings and important list text, peach or softened cream for supporting copy, and rose for step numbers, labels, and primary-action emphasis.

## Component treatment

- **Content wrapper:** create a warm, dark continuation background with a subtle radial bloom and low-contrast grid texture.
- **Highlight strip and pills:** use warm glass surfaces and cream/peach borders; retain horizontal scrolling on narrow screens.
- **How-it-works and security cards:** use shared warm glass panels with cream headings, readable supporting copy, and rose progression markers.
- **Calls to action:** use the same surface treatment, with a more prominent rose/peach primary button state that remains accessible in the dark context.

## Responsive and accessibility requirements

- Retain the current one-column mobile behavior and three-column step grid at desktop widths.
- Do not reduce legibility: ensure heading, body, label, and interactive-control contrast remains suitable against the darker surfaces.
- Preserve existing semantic elements, focus behavior, and link targets.
- Respect existing reduced-motion behavior; this styling change does not introduce required motion.

## Verification

- Run the web app locally and inspect `/` at desktop and mobile widths.
- Confirm that no green wallet palette remains inside `.landing-content-sections`.
- Confirm the existing strip, step cards, security list, and dashboard links still render and work.
