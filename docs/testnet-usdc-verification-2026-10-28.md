# Testnet USDC request verification — 2026-10-28

Both dashboards now offer **Request test USDC** beside **Request test XLM**. The request checks the connected wallet on Stellar Testnet, guides an unfunded wallet to XLM, and routes a missing USDC trustline through the existing transaction review and local signing flow. Only an authorized trustline with receiving capacity exposes the official Circle faucet link and public address.

Circle's public faucet is an external website. Users select Stellar Testnet and USDC and submit their request there. Circle's API faucet serves Circle-managed wallets, so this self-custodial application does not use it or a private endpoint. Opening the faucet is never reported as a payment. **Check USDC balance** verifies the current Horizon balance and refreshes the dashboard; it does not assert that a new deposit came from Circle.

Official sources:
- [Circle faucet](https://faucet.circle.com/)
- [Circle USDC contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses)

The accepted asset is USDC issued by `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, matching the existing Testnet swap asset. Requests use a fixed Testnet Horizon endpoint, validate the account identity and exact issuer, reject redirects, and time out. The authenticated web route takes its address from the session, accepts no destination override, and disables caching. No private key, recovery phrase, password, API key, or custody service is added.

## Validation

- Four new helper tests cover address validation, unfunded accounts, missing/foreign trustlines, authorization, receiving capacity, exact issuer, malformed account responses and service failures.
- Full Node suite: 160 passed, 9 optional tests skipped, zero failures.
- Production web build, native TypeScript check and Android release/instrumentation builds passed.
- Browser regression covers desktop and phone, light and dark themes, trustline review, faucet URL, public address, balance feedback and modal dismissal focus. Layout/balance fixtures are isolated to the QA browser.
- Android emulator instrumentation passed the actual Horizon trustline/balance check for the QA wallet, request sheet, faucet link availability and balance refresh. It submitted no faucet claim and signed no wallet transaction.
- Android APK SHA256: `5acd554aaa36abd173c3debb71bee1bd79cae789013d05d55d675efb8742b5fe`.

## Limits

A fresh Circle USDC claim was not completed. Browser inspection of Circle encountered a certificate-authority error; TLS verification was not bypassed. Eligibility, CAPTCHA and rate limits remain controlled by Circle. Swapping still requires sufficient XLM, a USDC trustline, available Testnet liquidity and explicit local approval.

Android is a development-signed Testnet review build. Physical-device and iOS checks were not performed. Existing native wallet locking on browser background remains enabled.
