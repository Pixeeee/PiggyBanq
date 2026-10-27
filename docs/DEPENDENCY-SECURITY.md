# Dependency audit (2026-10-27)

Updated the web to Next15.5.28, direct Zod to4.6.7, Fastify to5.12.7,
sharp0.35.5, fast-uri3.1.9/4.2.3, undici6.29.1, source-map-js1.2.2,
compression1.8.2, shell-quote1.12.0, follow-redirects1.16.2 and
smol-toml1.9.1. The lockfile pins the resolved versions. Run full builds and live
Testnet verification when changing payment dependencies.

The x402 Zod blocker is fixed locally with a pinned compatibility patch:
`@x402/core@2.28.0>zod` resolves to4.6.7, and
`patches/@x402__core@2.28.0.patch` changes the two legacy single-argument
record schemas to explicit string-key records in all ESM/CJS runtime bundles.
Docker copies the patch before frozen installation. No advisory is suppressed for
this fix. The upstream Stellar/core release remains2.28.0; remove the override
and patch together once upstream ships a compatible patched dependency.

`tests/x402-schemas.test.mjs` checks both module formats, valid payment/challenge
records, invalid records and early rejection of oversized constrained arrays.
The exact-transfer checks, DB spending reservations/kill switch and a real Testnet
settlement passed with the patched package. Production audit has no unignored
advisories; its aggregate metadata still counts ignored Expo tooling findings.

References: [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
[Next image API advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw).

Four existing advisory IDs remain ignored in Expo/Metro build tooling, outside the
deployed Next/Fastify path:

- GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq: image-size1.2.1; Metro requires its file-path API and cannot use2.x unchanged. Bundle only repository-owned assets.
- GHSA-86w9-cpqp-85rv: Expo CLI development certificates use node-forge1.4.0. Fixed1.4.1 is not published at this check.
- GHSA-vfj7-8cjw-p6xm: Metro uses braces3.0.3. Fixed3.0.4 is not published at this check.

These are tracked exceptions, not a zero-advisory claim. Never expose Metro/Expo
development servers publicly or run builds with untrusted assets/source patterns.
Production web/API images exclude the mobile workspace. Recheck available fixes
before every release. GitHub Actions remains blocked by the account billing lock;
local verification is required until that is resolved.
