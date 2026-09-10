CREATE TYPE "StellarTransactionType" AS ENUM ('PAYMENT', 'CHANGE_TRUST', 'PATH_PAYMENT_STRICT_SEND');
CREATE TYPE "StellarTransactionStatus" AS ENUM ('QUOTED', 'AWAITING_SIGNATURE', 'EXECUTING', 'SUBMITTED', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELLED', 'UNKNOWN');

CREATE TABLE "StellarTransactionIntent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "operationType" "StellarTransactionType" NOT NULL,
  "status" "StellarTransactionStatus" NOT NULL DEFAULT 'QUOTED',
  "network" TEXT NOT NULL DEFAULT 'STELLAR_TESTNET',
  "sourcePublicKey" TEXT NOT NULL,
  "destinationPublicKey" TEXT,
  "assetCode" TEXT NOT NULL,
  "assetIssuer" TEXT,
  "amountUnits" TEXT NOT NULL,
  "destinationAssetCode" TEXT,
  "destinationAssetIssuer" TEXT,
  "minimumDestinationUnits" TEXT,
  "feeStroops" TEXT NOT NULL,
  "memo" TEXT,
  "path" JSONB,
  "requestPayload" JSONB NOT NULL,
  "reviewPayload" JSONB NOT NULL,
  "policyResult" JSONB NOT NULL,
  "unsignedXdr" TEXT NOT NULL,
  "unsignedBodyHash" TEXT NOT NULL,
  "signedXdr" TEXT,
  "transactionHash" TEXT,
  "errorCode" TEXT,
  "errorDetail" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "executionStartedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "reconciledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StellarTransactionIntent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StellarTransactionIntent_userId_idempotencyKey_key" ON "StellarTransactionIntent"("userId", "idempotencyKey");
CREATE INDEX "StellarTransactionIntent_userId_createdAt_idx" ON "StellarTransactionIntent"("userId", "createdAt");
CREATE INDEX "StellarTransactionIntent_status_updatedAt_idx" ON "StellarTransactionIntent"("status", "updatedAt");
CREATE INDEX "StellarTransactionIntent_transactionHash_idx" ON "StellarTransactionIntent"("transactionHash");
ALTER TABLE "StellarTransactionIntent" ADD CONSTRAINT "StellarTransactionIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
