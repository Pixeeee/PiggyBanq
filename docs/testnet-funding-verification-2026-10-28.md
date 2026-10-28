# In-app test XLM requests

Both dashboards now offer **Request test XLM** near the wallet actions. It calls [Stellar Friendbot](https://github.com/stellar/friendbot#api-usage) for the current wallet and refreshes its ledger data. Test tokens have no monetary value; funded wallets may not qualify for more.

The shared helper validates the Stellar address/checksum, fixes the Friendbot and Horizon endpoints to Testnet, omits credentials and signing, rejects unexpected redirects, and shares simultaneous requests for the same address. It calls the faucet once and checks Horizon for a positive balance increase before claiming funds were received. A rejected request for an existing funded account says no more funds were added. Pending/unconfirmed, unavailable, invalid and rate-limited states never show a successful addition. Requests have a 45-second overall deadline and at most six ledger checks.

Web uses an authenticated, same-origin POST route. The destination comes exclusively from the validated session, ignoring request-body addresses. Browser CSP remains self-only; no direct cross-origin browser access or new secret is needed. Native calls the same public Testnet helper directly; neither platform uploads a private key, recovery phrase or password. Busy state prevents duplicate clicks and lifecycle guards avoid updating an unmounted account view.

## Verification

- Seven new mocked funding tests passed, including address rejection, fixed endpoints/public-only data, delayed ledger visibility, already-funded refusal, unconfirmed results, rate limits, malformed balances, duplicate requests, redirects and network errors.
- Full suite: 156 passed, 9 optional skipped, 0 failed.
- Production web build, native TypeScript and standalone Android release build passed.
- A real request through the web POST route funded a newly generated disposable QA wallet; Horizon confirmed its account. A foreign Origin received 403, and a supplied destination could not override the signed-in wallet.
- Browser checks covered loading/disabled, success and rate-limit feedback, then the full dashboard phone/desktop/light/dark regression. UI layout fixtures are intercepted only in the QA browser.
- The actual Android release APK passed a Friendbot request and Horizon verification in the existing disposable QA emulator. Its funding-only instrumentation accepts a verified funded/already-funded result and never signs a wallet transaction or reveals a backup.
- Focused read-only review found no actionable issue. No backend/database, credentials, signing, spending-limit or receipt behavior changed.

## Run checks

From the repository root, using Node 24/pnpm 11.7.0:

```bash
node --test tests/testnet-funding.test.mjs
pnpm test
pnpm --filter @piggybanq/web build
pnpm --filter @piggybanq/mobile build
```

Against a running production web server, `FUNDING_LIVE_CHECK=1 node tests/release-clean-dashboard.mjs` opts into real Friendbot funding of its disposable QA account. Without that flag, browser funding responses are mocked. `RELEASE_WEB_URL` selects the origin. The native test uses the separate instrumentation APK with `-e fundingCheck true`, on the disposable QA emulator only; its existing QA wallet/password must already be provisioned. Do not use the instrumentation's default payment-testing mode for this smoke check.

## Artifact and limits

`apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

SHA256: `27ced2696a6e70d7a923dc0ffe903822e169c44dfa703fbdbdc8af129e4ee2c7`.

The APK is signed with the existing development key for Testnet review, not store publication. Friendbot availability/eligibility and Testnet resets remain controlled by Stellar; funding is not guaranteed or unlimited. Physical iOS/Android hardware was not tested. Application screen-capture protections remain enabled.
