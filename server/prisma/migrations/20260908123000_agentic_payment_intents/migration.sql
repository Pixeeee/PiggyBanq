CREATE TYPE "AgentActionType" AS ENUM ('X402_PAYMENT', 'STELLAR_SWAP', 'CCTP_BRIDGE', 'STELLAR_SELL');
CREATE TYPE "AgentActionProvider" AS ENUM ('BINANCE_X402', 'STELLAR', 'CIRCLE_CCTP', 'STELLAR_ANCHOR_SANDBOX');
CREATE TYPE "AgentActionStatus" AS ENUM ('AWAITING_APPROVAL', 'APPROVED', 'SUCCEEDED', 'FAILED', 'CANCELLED');

CREATE TABLE "AgentAction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actionType" "AgentActionType" NOT NULL,
  "provider" "AgentActionProvider" NOT NULL,
  "status" "AgentActionStatus" NOT NULL DEFAULT 'AWAITING_APPROVAL',
  "requestPayload" JSONB NOT NULL,
  "policyResult" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderReceipt" (
  "id" TEXT NOT NULL,
  "agentActionId" TEXT NOT NULL,
  "network" TEXT NOT NULL,
  "externalReference" TEXT NOT NULL,
  "providerPayload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderReceipt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentAction_userId_createdAt_idx" ON "AgentAction"("userId", "createdAt");
CREATE INDEX "AgentAction_userId_status_idx" ON "AgentAction"("userId", "status");
CREATE UNIQUE INDEX "ProviderReceipt_agentActionId_key" ON "ProviderReceipt"("agentActionId");
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderReceipt" ADD CONSTRAINT "ProviderReceipt_agentActionId_fkey" FOREIGN KEY ("agentActionId") REFERENCES "AgentAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
