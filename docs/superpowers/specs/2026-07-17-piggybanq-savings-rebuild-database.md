# PiggyBanq Savings Rebuild Database Spec

## Scope

The database should shrink to application metadata only. It is not the source of truth for savings balances.

## Principles

- chain state is authoritative for balances and positions
- database state is advisory and product-oriented
- no secrets at rest
- no wallet custody data

## Core Entities

### User

Application identity record if account auth remains.

Suggested fields:

- `id`
- `email` or chosen auth identifier
- `createdAt`
- `updatedAt`
- `status`

### LinkedWallet

Public wallet linkage only.

Suggested fields:

- `id`
- `userId`
- `publicKey`
- `network`
- `recoveryConfirmedAt`
- `createdAt`
- `updatedAt`

### SupportedAsset

Configured savings asset catalog.

Suggested fields:

- `id`
- `code`
- `displayName`
- `network`
- `issuerOrContractRef`
- `isEnabled`

### SavingsStrategy

Allowlisted savings route definition.

Suggested fields:

- `id`
- `assetId`
- `routeKey`
- `network`
- `isEnabled`
- `notes`

### SavingsPositionReference

App-level reference to a known user position.

Suggested fields:

- `id`
- `userId`
- `walletId`
- `assetId`
- `strategyId`
- `externalPositionRef`
- `lastIndexedAt`

### TransactionEvent

Public transaction lifecycle cache.

Suggested fields:

- `id`
- `userId`
- `walletId`
- `assetId`
- `strategyId`
- `kind`
- `amount`
- `status`
- `transactionHash`
- `createdAt`

### AuditEvent

Application audit trail for sensitive actions.

Suggested fields:

- `id`
- `userId`
- `walletId`
- `eventType`
- `metadata`
- `createdAt`

## Data That Must Not Exist

The database must not store:

- secret keys
- recovery phrases
- plaintext or encrypted seed data
- password-derived local wallet material

## Migration Direction

The rebuild should prefer pruning old product tables and models rather than carrying forward community-oriented schemas that no longer reflect the product.

## Database Testing

Tests should confirm:

- secret fields are absent from schemas
- allowed asset and strategy relations are enforced
- transaction/audit records can be created without custody data
