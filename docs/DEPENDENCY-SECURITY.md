# Dependency audit (2026-10-04)

Runtime web/API dependencies updated to Fastify5.12.5, axios1.20.0, fast-uri3.1.8/4.1.5, undici6.28.1 and brace-expansion5.0.12. image-size2 consumers use2.0.4. Full builds and live Stellar checks must accompany updates.

Four high advisories remain in Expo/Metro build tooling, not the deployed Next/Fastify request path:

- GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq: image-size1.2.1; Metro requires its file-path API and cannot use2.x unchanged. Only repository-owned image assets are bundled. Never bundle untrusted ICNS/HEIF/JXL assets. A previous forced2.x override broke Android bundling.
- GHSA-86w9-cpqp-85rv: Expo CLI self-signed development certificate dependency node-forge1.4.0. Fixed1.4.1 is not published in the npm registry at this check. Production does not use Expo development certificates.
- GHSA-vfj7-8cjw-p6xm: Metro glob parser braces3.0.3. Fixed3.0.4 is not published in the npm registry at this check. Build only trusted source paths/patterns.

CI explicitly excludes these four advisory IDs while failing on other high advisories. These are tracked exceptions, not a clean zero-advisory claim. Recheck published compatible fixes before the next release. Restrict CI to trusted code and never expose a Metro/Expo development server publicly. APK runtime uses embedded bundles; deploy web/API without Expo services. Raw `pnpm audit --prod --json` shows remaining toolchain findings.
