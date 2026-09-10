import { Prisma, type StellarTransactionStatus, type StellarTransactionType } from '@prisma/client';

import { prisma } from '../../prisma.ts';

type CreateQuotedIntentInput = {
  userId: string;
  idempotencyKey: string;
  requestHash: string;
  operationType: StellarTransactionType;
  sourcePublicKey: string;
  destinationPublicKey?: string | null;
  assetCode: string;
  assetIssuer?: string | null;
  amountUnits: string;
  destinationAssetCode?: string | null;
  destinationAssetIssuer?: string | null;
  minimumDestinationUnits?: string | null;
  feeStroops: string;
  memo?: string | null;
  path?: unknown;
  requestPayload: unknown;
  reviewPayload: unknown;
  policyResult: unknown;
  unsignedXdr: string;
  unsignedBodyHash: string;
  expiresAt: Date;
};

export async function createQuotedIntent(input: CreateQuotedIntentInput) {
  try {
    const intent = await prisma.stellarTransactionIntent.create({
      data: {
        ...input,
        status: 'AWAITING_SIGNATURE',
        path: input.path === undefined ? Prisma.JsonNull : input.path as Prisma.InputJsonValue,
        requestPayload: input.requestPayload as Prisma.InputJsonValue,
        reviewPayload: input.reviewPayload as Prisma.InputJsonValue,
        policyResult: input.policyResult as Prisma.InputJsonValue
      }
    });
    await recordAudit(input.userId, 'stellar.intent.quoted', intent.id, { operationType: input.operationType });
    return intent;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    const existing = await prisma.stellarTransactionIntent.findUnique({
      where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey: input.idempotencyKey } }
    });
    if (!existing || existing.requestHash !== input.requestHash) throw new Error('IDEMPOTENCY_KEY_REUSED');
    return existing;
  }
}

export async function claimIntentForExecution(id: string, userId: string, now = new Date()) {
  const claimed = await prisma.stellarTransactionIntent.updateMany({
    where: { id, userId, status: 'AWAITING_SIGNATURE', expiresAt: { gt: now } },
    data: { status: 'EXECUTING', approvedAt: now, executionStartedAt: now }
  });
  if (claimed.count === 1) {
    await recordAudit(userId, 'stellar.intent.execution_claimed', id);
    return findIntentForUser(id, userId);
  }

  const existing = await findIntentForUser(id, userId);
  if (existing && existing.expiresAt <= now && ['QUOTED', 'AWAITING_SIGNATURE'].includes(existing.status)) {
    await prisma.stellarTransactionIntent.updateMany({
      where: { id, userId, status: { in: ['QUOTED', 'AWAITING_SIGNATURE'] } },
      data: { status: 'EXPIRED', reconciledAt: now }
    });
    await recordAudit(userId, 'stellar.intent.expired', id);
    return findIntentForUser(id, userId);
  }
  return existing;
}

export async function recordSubmittedIntent(input: {
  id: string;
  userId: string;
  signedXdr: string;
  transactionHash: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  await prisma.stellarTransactionIntent.updateMany({
    where: { id: input.id, userId: input.userId, status: 'EXECUTING' },
    data: { status: 'SUBMITTED', signedXdr: input.signedXdr, transactionHash: input.transactionHash, submittedAt: now }
  });
  await recordAudit(input.userId, 'stellar.intent.submitted', input.id, { transactionHash: input.transactionHash });
  return findIntentForUser(input.id, input.userId);
}

export async function recordTerminalIntent(input: {
  id: string;
  userId: string;
  status: Extract<StellarTransactionStatus, 'SUCCEEDED' | 'FAILED' | 'UNKNOWN'>;
  errorCode?: string | null;
  errorDetail?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  await prisma.stellarTransactionIntent.updateMany({
    where: { id: input.id, userId: input.userId, status: { in: ['EXECUTING', 'SUBMITTED', 'UNKNOWN'] } },
    data: { status: input.status, errorCode: input.errorCode, errorDetail: input.errorDetail, reconciledAt: now }
  });
  await recordAudit(input.userId, `stellar.intent.${input.status.toLowerCase()}`, input.id, { errorCode: input.errorCode ?? null });
  return findIntentForUser(input.id, input.userId);
}

export function findIntentForUser(id: string, userId: string) {
  return prisma.stellarTransactionIntent.findFirst({ where: { id, userId } });
}

async function recordAudit(userId: string, action: string, intentId: string, detail: Record<string, unknown> = {}) {
  await prisma.auditLogEntry.create({
    data: { userId, action, metadata: { intentId, ...detail } as Prisma.InputJsonValue }
  });
}
