# Dependency audit (2026-10-27)

Updated the web to Next15.5.28, direct Zod to4.6.7, Fastify to5.12.7,
sharp0.35.5, fast-uri3.1.9/4.2.3, undici6.29.1, source-map-js1.2.2,
compression1.8.2, shell-quote1.12.0, follow-redirects1.16.2 and
smol-toml1.9.1. The lockfile pins the resolved versions. Run full builds and live
Testnet verification when changing payment dependencies.

One unignored high advisory remains: GHSA-mrhx-c7xc-m3w5 in
`server > @x402/stellar@2.28.0 > @x402/core > zod@3.25.76`. The current official
Stellar package still requires Zod3; no patched3.x release is published. The
advisory concerns memory use while validating oversized constrained collections.
Direct application validation uses patched Zod4. Requests have a64KiB body cap
(the authenticated read/simulation RPC proxy permits128000 bytes), payment headers
have explicit bounds, and payment methods require authentication and rate limits.
These measures reduce exposure; they do not remove the dependency advisory. Do not
force Zod4 into the third-party package: its legacy schemas use incompatible APIs.
Keep public hosted x402 disabled until this residual risk is resolved or explicitly
accepted. Do not add this advisory to ignored IDs.

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
before every release; CI still fails for the unignored transitive Zod advisory.
