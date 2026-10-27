-- CreateTable
CREATE TABLE "agent_x402_payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_APPROVAL',
    "payer" TEXT NOT NULL,
    "pay_to" TEXT NOT NULL,
    "amount_units" BIGINT NOT NULL,
    "requirements" JSONB NOT NULL,
    "payload" JSONB,
    "authorization_hash" TEXT,
    "transaction_hash" TEXT,
    "settlement_xdr" TEXT,
    "receipt" JSONB,
    "error_code" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_x402_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_x402_payments_authorization_hash_key" ON "agent_x402_payments"("authorization_hash");

-- CreateIndex
CREATE UNIQUE INDEX "agent_x402_payments_transaction_hash_key" ON "agent_x402_payments"("transaction_hash");

-- CreateIndex
CREATE INDEX "agent_x402_payments_user_id_approved_at_idx" ON "agent_x402_payments"("user_id", "approved_at");

-- CreateIndex
CREATE INDEX "agent_x402_payments_status_updated_at_idx" ON "agent_x402_payments"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "agent_x402_payments_user_id_idempotency_key_key" ON "agent_x402_payments"("user_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "agent_x402_payments" ADD CONSTRAINT "agent_x402_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

