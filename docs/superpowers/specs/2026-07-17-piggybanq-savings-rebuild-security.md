# PiggyBanq Savings Rebuild Security Spec

## Security Posture

PiggyBanq v1 is a self-custodial savings application. The security model must reflect that the client holds the only signing authority.

## Custody Boundary

- Wallets are created locally
- Wallet secrets remain on-device
- The backend stores no wallet secrets
- The recovery phrase is shown once and must be confirmed

## Local Secret Storage

### Web

- encrypt wallet secret before local persistence
- require local unlock before signing
- keep session state separate from wallet authorization

### Mobile

- encrypt wallet secret before persistence
- prefer OS-backed secure storage
- require local unlock before signing

## Recovery Controls

The user must:

1. view the recovery phrase
2. confirm they backed it up
3. pass a recovery verification step before entering the savings dashboard

The product should never pretend recovery is optional.

## Transaction Controls

Every deposit and withdrawal must present:

- asset
- amount
- route
- fee estimate
- destination/protocol target

before local signing occurs.

## Session Controls

Application sessions are not wallet authorization. Session theft must not be enough to move funds. A valid session can open the app, but only local key access can sign a transaction.

## Asset and Route Restrictions

The app must operate on explicit allowlists only:

- allowed network: Stellar testnet
- allowed assets: configured `XLM` and configured `USDT` route only
- allowed strategies: configured route adapters only

No arbitrary asset symbol or route entry should be accepted from the client.

## Logging and Telemetry

Allowed:

- public wallet address
- asset code
- route identifier
- transaction hash
- error code

Forbidden:

- seed phrase
- secret key
- passcode
- serialized local wallet payload

## Security Tests

Security verification should cover:

- secrets never entering server payloads
- recovery flow gating
- explicit confirmation before signing
- allowlist enforcement
- testnet-only enforcement
