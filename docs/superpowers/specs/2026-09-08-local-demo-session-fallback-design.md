# Local Demo Session Fallback Design

## Problem

`Open demo account` currently performs the full PostgreSQL-backed Stellar signup/login flow. When the local API or database is unavailable, the first wallet-status request fails and the demo cannot open.

## Decision

Keep the existing signed backend flow as the first choice. In development only, if that flow fails because the API is unavailable or returns its generic authentication-service error, create a same-origin demo session through a Next.js route and open the dashboard with a fixed public demo identity.

The fallback cookie is HTTP-only, SameSite=Lax, limited to eight hours, and rejected in production. It carries no wallet secret, mnemonic, or authorization for the Fastify API. Normal wallet signup/login and all production dashboard access remain unchanged.

## Components

- `app/api/demo-session/route.ts` creates and clears the development-only cookie.
- `WalletAuthFlow.tsx` invokes the fallback only for backend-unavailable failures.
- `dashboard/_lib/session.ts` resolves the development cookie to a fixed demo user before checking the normal wallet session.
- `DashboardLogoutButton.tsx` clears both demo and backend sessions.
- Route and source tests enforce the development guard, cookie properties, fallback boundary, and logout behavior.

## Behavior

With a healthy backend, the button continues to use the signed Stellar signup/login flow. With an unavailable backend in development, it opens `/dashboard` as `Demo Saver`. In production, no demo cookie can be created and the existing error remains visible.

## Validation

Run the focused route/auth tests, the full test suite, a production build, and a live development check proving the demo-session route sets its cookie and that `/dashboard` renders with that cookie while port 4000 is offline.
