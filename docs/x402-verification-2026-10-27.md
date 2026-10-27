# Testnet x402 release verification — 2026-10-27

Release commit `95c11c0` and quota correction `62d7298` deployed to Render/Vercel production. No database migration
was needed; Supabase uses the existing payment-intent table and restricted runtime
role. Encrypted schema backups already include these records.

## Dependency and server checks

- x402 core 2.28.0 uses pinned Zod 4.6.7 with a reproducible ESM/CJS record-schema
  compatibility patch. The frozen Docker build includes the patch and passes.
- Production audit: no unignored advisories. Existing Expo tooling exceptions
  remain; GitHub Actions is still blocked by account billing, so proof is local.
- Full suite: 144 passed, 9 optional integration checks skipped.
- Separate DB integration passed reservation concurrency, expired-approval release,
  ownership, uncertain outcome handling and disabled/read-only settlement guards.
- Separate live web-vault test against Render/Supabase passed on actual Testnet:
  `cbc5700c9ef1fa4205b557327ed1cadcf2b7db952b8eedd2264513cf6c2e6ed2`,
  ledger 5413110. It checks HTTP402, idempotency, refusal without approval, local
  signing without secret/password transmission, verified response, independent
  Stellar RPC SUCCESS and repeatable receipt. Its temporary cloud user was removed.
- An earlier live attempt settled successfully but its local test cleanup used a
  Docker-relative CA path. The test now resolves that public CA locally while
  retaining strict TLS. That disposable receipt record remains for audit evidence.

## Hosted quota correction

Release checks exposed shared proxy-IP buckets on authenticated routes. Verified,
active sessions now share a per-account bucket across sessions; invalid, expired
and revoked cookies retain the IP bucket. Credential endpoints remain IP-limited.
Limits were not increased and forwarding headers are still untrusted. The x402
error handler now preserves HTTP 429 instead of converting it to 500. Focused
integration tests prove two users behind one proxy have independent bounded RPC
quotas, while cookie rotation and forged forwarding headers cannot bypass limits.
The Android run before this correction completed the real x402 payment/recovery
but hit the old shared quota during a later pocket update. The corrected hosted
payment test passed again: `dafce7eb802d4520feed1c18cf30f6d2bed5808615f3236086d0621aac3019c7`,
ledger 5413234, including receipt recovery and successful temporary-user cleanup.

## Production web UI

`node tests/release-x402-web.mjs` passed using a new disposable funded Testnet
wallet and the actual production frontend. It reviews, approves, unlocks the
local encrypted vault, signs, pays and recovers the same receipt after reload.
Transaction `763f0c98eea28352b8addbac5f661cdbbd2f77fd277cd852a510458184ef31c3`,
ledger 5413136. Screenshot: `qa-screenshots/x402-web-verified.png`.
The disposable UI account and its receipt are retained as verification evidence.

## Native

Native entry: Sync → connect shared web account → Paid API. The Send → Agent
sandbox remains separate. The release APK contains no hosted sponsor secret;
configured database URLs and sponsor/merchant secrets are absent from tracked
source. Wallet signing is rejected if the view closes or the wallet locks.

Android emulator instrumentation: real local-signed x402 payment and receipt
recovery passed. Independent RPC verification confirmed native transaction
`694758bb91d159a816b409968f2d0cd93ab991722c016ba493e0b8b5f486a408`,
ledger 5413157. Full flow after quota correction: PASS, including wallet backup, real trustline/swap,
sandbox approval, real x402 payment/recovery, shared data, unlock/reconnect and
background lock. Its native receipt independently confirmed on RPC: `acc5592b0ea14998e66f0473bdaf2a3d89e93ab206b6b544a74bc5359356607f`,
ledger 5413253.
APK SHA256: `e66ec2b2d19395320a51d7fed859bb33c4371bc19c259495a0f5d6e025ea428c`.
Development signing only; no physical phone or iOS verification.

## Operational limits

- Built-in fixed paid savings-tip API only, 0.0001 Testnet XLM per request.
- Explicit approval plus local password/signing; 0.001 XLM/payment and 0.01 XLM
  rolling 24h per user enforced with database reservations.
- Testnet only, no monetary-value payments, no Mainnet or unattended spending.
- Dedicated hosted fee sponsor is funded and stored only in Render/private local
  configuration. Never copy the payer key, merchant recovery key or DB owner URL
  into Render, Vercel or native code. Keep one API replica for the sponsor queue.
- RPC uncertainty remains pending and can be refreshed; it is never a verified
  receipt. Render/Supabase free plans and Testnet can be unavailable or reset.
- The pinned third-party compatibility patch needs maintenance until upstream
  releases a native Zod 4-compatible package. Re-run schemas and real settlement
  when changing it.
