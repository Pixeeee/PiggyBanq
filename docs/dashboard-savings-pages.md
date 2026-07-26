# PiggyBanq Savings Dashboard Pages

## Product Focus

PiggyBanq now focuses on savings and allocation only. The dashboard removes community/social surfaces and routes users into money planning screens.

## Routes

- `/dashboard`: Overview of allocations, earning pockets, and goals. Profile data is intentionally excluded.
- `/dashboard/allocations`: Daily inflow and outflow for account assets, grouped by spending category.
- `/dashboard/pockets`: XLM and USDT earning pockets, showing allocated token money and PHP/currency conversion intent through anchors.
- `/dashboard/goals`: Budget goals for things the user wants to buy or bills they need to reserve for.
- `/dashboard/profile`: Profile name/details and theme preference.

## Safety

- All protected pages call `requireWalletSession`.
- Stellar remains testnet-first.
- Yielding UI is a planning surface until a user explicitly confirms amount, asset, destination, and fee.
- Profile updates go through the authenticated backend profile API.
