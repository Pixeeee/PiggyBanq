# Editable Budget Allocations Design

## Purpose

PiggyBanq users need budget allocations they can create, edit, delete, and reorder on web and Android. The workflow is planning-only: it changes app budget records, not Stellar balances, wallet custody, or signed transactions.

## Scope

- Web allocations page becomes an editable allocation board.
- Android dashboard gets a matching editable allocation section.
- Backend budget routes support authenticated update, delete, and persisted ordering.
- Layouts adapt from narrow phones to desktop screens without clipped controls.

## Product Behavior

- Create allocation with category, amount, and currency.
- Edit an existing allocation inline.
- Delete an allocation after an explicit button press.
- Reorder allocations:
  - Web: native drag/drop plus keyboard/mobile move up/down buttons.
  - Android: move up/down buttons because that works consistently across phone sizes without adding a gesture dependency.
- Show status text for saving, errors, empty state, and successful updates.

## Backend Contract

- `GET /budget/plans` returns categories ordered by `sortOrder`.
- `POST /budget/allocations` creates the next category for the current month.
- `PATCH /budget/allocations/:id` updates category, amount, and currency after ownership validation.
- `DELETE /budget/allocations/:id` removes a category after ownership validation.
- `PATCH /budget/plans/:id/categories/order` persists an ordered list of category IDs after ownership validation.

Every write route authenticates with `requireAuthUser`, validates input with Zod, checks the record belongs to the authenticated user, and recalculates the plan total from category rows.

## UI Architecture

- Web keeps the existing `AllocationsManager` boundary and extends it with local edit state, drag state, and API calls.
- Web cards use responsive CSS grid: one column on phones, two on tablets, three on wide screens.
- Android keeps allocation editing local inside `DashboardHome` because the mobile app currently has local wallet state but no backend wallet-auth API bridge.
- Android cards use flexible rows, wrapping controls, and move buttons instead of fixed-width drag affordances.

## Guardrails

- No Stellar signing happens in this workflow.
- No real funds move.
- Amounts stay decimal-string validated before writes.
- Failed writes keep the previous UI state and show a status message.
- Drag/drop only reorders records for the authenticated user.

## Testing

- Existing dashboard feature tests assert new API helpers/routes, editable manager labels, drag/drop handlers, and responsive CSS.
- Mobile tests assert editable allocation cards, create/edit/delete/move controls, and adaptive layout styles.
- Full verification uses `pnpm test` and `pnpm build`.
