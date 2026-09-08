import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { calculateLockedEarningPreview } from '@piggybanq/types/ledger';

import { prisma } from '../../prisma.ts';
import { requireAuthUser } from '../auth/session.ts';
import { AuthError } from '../auth/wallet-auth.ts';

const earningDurations = [7, 30, 90] as const;

const pocketSchema = z.object({
  label: z.string().trim().min(2).max(60),
  assetCode: z.enum(['XLM', 'USDC', 'USDT']),
  targetAmount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Target must be a decimal value.').optional(),
  pocketType: z.enum(['FLEXIBLE', 'LOCKED_EARN']).default('FLEXIBLE'),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a decimal value.').optional(),
  lockDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).optional(),
  apyBps: z.number().int().min(0).max(5000).optional()
});

const pocketEventSchema = z.object({
  type: z.enum(['POCKET_CREDIT', 'POCKET_DEBIT', 'DEPOSIT_CONFIRMED', 'WITHDRAWAL_PLANNED']),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a decimal value.'),
  note: z.string().trim().max(120).optional()
});

const previewSchema = z.object({
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a decimal value.'),
  lockDays: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  apyBps: z.number().int().min(0).max(5000)
});

export function registerSavingsRoutes(server: FastifyInstance) {
  server.post('/savings/pockets/earning-preview', async (request, reply) => {
    try {
      await requireAuthUser(request);
      const body = previewSchema.parse(request.body);
      const principalMinor = decimalToMinor(body.amount);
      const preview = calculateLockedEarningPreview({ principalMinor, apyBps: body.apyBps, lockDays: body.lockDays });
      return {
        preview: {
          ...preview,
          maturesAt: addDays(new Date(), body.lockDays).toISOString()
        }
      };
    } catch (error) {
      return sendSavingsError(reply, error);
    }
  });

  server.get('/savings/pockets', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const pockets = await prisma.savingsPocket.findMany({
        where: { userId: user.id },
        include: { events: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' }
      });

      return { pockets: pockets.map(toPocket) };
    } catch (error) {
      return sendSavingsError(reply, error);
    }
  });

  server.post('/savings/pockets', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const body = pocketSchema.parse(request.body);
      const isLockedEarn = body.pocketType === 'LOCKED_EARN';
      if (isLockedEarn && (!body.amount || !body.lockDays || body.apyBps === undefined)) {
        return reply.code(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Locked earning pockets require amount, lock duration, and APY.' }
        });
      }

      const now = new Date();
      const principalMinor = isLockedEarn ? decimalToMinor(body.amount!) : null;
      const lockedAt = isLockedEarn ? now : null;
      const maturesAt = isLockedEarn ? addDays(now, body.lockDays!) : null;
      const pocket = await prisma.savingsPocket.create({
        data: {
          userId: user.id,
          label: body.label,
          assetCode: body.assetCode,
          targetMinor: body.targetAmount ? decimalToMinor(body.targetAmount) : null,
          pocketType: body.pocketType,
          status: isLockedEarn ? 'LOCKED' : 'ACTIVE',
          principalMinor,
          apyBps: body.apyBps ?? null,
          lockDays: body.lockDays ?? null,
          lockedAt,
          maturesAt,
          events: {
            create: [
              {
                userId: user.id,
                type: 'POCKET_CREATED',
                assetCode: body.assetCode,
                amountMinor: BigInt(0),
                metadata: { pocketType: body.pocketType }
              },
              ...(isLockedEarn
                ? [
                    {
                      userId: user.id,
                      type: 'DEPOSIT_CONFIRMED' as const,
                      assetCode: body.assetCode,
                      amountMinor: principalMinor!,
                      metadata: { source: 'testnet-demo' }
                    },
                    {
                      userId: user.id,
                      type: 'LOCK_STARTED' as const,
                      assetCode: body.assetCode,
                      amountMinor: BigInt(0),
                      metadata: { lockDays: body.lockDays, apyBps: body.apyBps, maturesAt: maturesAt?.toISOString() }
                    }
                  ]
                : [])
            ]
          }
        },
        include: { events: { orderBy: { createdAt: 'desc' } } }
      });

      return { pocket: toPocket(pocket) };
    } catch (error) {
      return sendSavingsError(reply, error);
    }
  });

  server.post('/savings/pockets/:id/events', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = pocketEventSchema.parse(request.body);
      const pocket = await prisma.savingsPocket.findFirst({
        where: { id: params.id, userId: user.id }
      });

      if (!pocket) {
        return reply.code(404).send({ error: { code: 'POCKET_NOT_FOUND', message: 'Savings pocket not found.' } });
      }

      await prisma.ledgerEvent.create({
        data: {
          userId: user.id,
          savingsPocketId: pocket.id,
          type: body.type,
          assetCode: pocket.assetCode,
          amountMinor: decimalToMinor(body.amount),
          metadata: { note: body.note ?? '' }
        }
      });

      const updated = await prisma.savingsPocket.findUniqueOrThrow({
        where: { id: pocket.id },
        include: { events: { orderBy: { createdAt: 'desc' } } }
      });

      return { pocket: toPocket(updated) };
    } catch (error) {
      return sendSavingsError(reply, error);
    }
  });

  server.get('/savings/pockets/:id/events', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const pocket = await prisma.savingsPocket.findFirst({
        where: { id: params.id, userId: user.id },
        include: { events: { orderBy: { createdAt: 'desc' } } }
      });
      if (!pocket) {
        return reply.code(404).send({ error: { code: 'POCKET_NOT_FOUND', message: 'Savings pocket not found.' } });
      }
      return { events: toPocket(pocket).events };
    } catch (error) {
      return sendSavingsError(reply, error);
    }
  });

  server.post('/savings/pockets/:id/mark-matured', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const pocket = await prisma.savingsPocket.findFirst({
        where: { id: params.id, userId: user.id },
        include: { events: { orderBy: { createdAt: 'desc' } } }
      });
      if (!pocket) {
        return reply.code(404).send({ error: { code: 'POCKET_NOT_FOUND', message: 'Savings pocket not found.' } });
      }
      if (pocket.pocketType !== 'LOCKED_EARN' || !pocket.maturesAt || pocket.maturesAt > new Date()) {
        return { pocket: toPocket(pocket) };
      }
      const updated = await prisma.savingsPocket.update({
        where: { id: pocket.id },
        data: { status: 'MATURED' },
        include: { events: { orderBy: { createdAt: 'desc' } } }
      });
      return { pocket: toPocket(updated) };
    } catch (error) {
      return sendSavingsError(reply, error);
    }
  });

  server.post('/savings/pockets/:id/withdraw', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const pocket = await prisma.savingsPocket.findFirst({
        where: { id: params.id, userId: user.id },
        include: { events: { orderBy: { createdAt: 'desc' } } }
      });
      if (!pocket) {
        return reply.code(404).send({ error: { code: 'POCKET_NOT_FOUND', message: 'Savings pocket not found.' } });
      }
      if (pocket.pocketType !== 'LOCKED_EARN' || !pocket.maturesAt || pocket.maturesAt > new Date()) {
        return reply.code(409).send({
          error: { code: 'POCKET_NOT_MATURED', message: 'Locked earning pocket cannot be withdrawn before maturity.' }
        });
      }
      if (pocket.withdrawnAt) {
        return reply.code(409).send({ error: { code: 'POCKET_WITHDRAWN', message: 'Pocket has already been withdrawn.' } });
      }

      const preview = calculateLockedEarningPreview({
        principalMinor: pocket.principalMinor ?? BigInt(0),
        apyBps: pocket.apyBps ?? 0,
        lockDays: pocket.lockDays ?? 7
      });
      const yieldMinor = BigInt(preview.estimatedInterestMinor);
      const balanceMinor = balanceFromEvents(pocket.events) + yieldMinor;

      const updated = await prisma.savingsPocket.update({
        where: { id: pocket.id },
        data: {
          status: 'WITHDRAWN',
          withdrawnAt: new Date(),
          events: {
            create: [
              {
                userId: user.id,
                type: 'YIELD_ACCRUED',
                assetCode: pocket.assetCode,
                amountMinor: yieldMinor,
                metadata: { apyBps: pocket.apyBps, lockDays: pocket.lockDays }
              },
              {
                userId: user.id,
                type: 'WITHDRAWAL_CONFIRMED',
                assetCode: pocket.assetCode,
                amountMinor: balanceMinor,
                metadata: { source: 'matured-locked-earning-pocket' }
              }
            ]
          }
        },
        include: { events: { orderBy: { createdAt: 'desc' } } }
      });
      return { pocket: toPocket(updated) };
    } catch (error) {
      return sendSavingsError(reply, error);
    }
  });
}

function toPocket(pocket: {
  id: string;
  label: string;
  assetCode: string;
  targetMinor: bigint | null;
  pocketType: string;
  status: string;
  principalMinor: bigint | null;
  apyBps: number | null;
  lockDays: number | null;
  lockedAt: Date | null;
  maturesAt: Date | null;
  withdrawnAt: Date | null;
  createdAt: Date;
  events: Array<{ id: string; type: string; assetCode: string; amountMinor: bigint; metadata: unknown; createdAt: Date }>;
}) {
  const balanceMinor = balanceFromEvents(pocket.events);
  const lockedPreview =
    pocket.pocketType === 'LOCKED_EARN' && pocket.principalMinor && pocket.apyBps !== null && pocket.lockDays
      ? calculateLockedEarningPreview({
          principalMinor: pocket.principalMinor,
          apyBps: pocket.apyBps,
          lockDays: pocket.lockDays
        })
      : null;

  return {
    id: pocket.id,
    label: pocket.label,
    assetCode: pocket.assetCode,
    targetMinor: pocket.targetMinor?.toString() ?? null,
    pocketType: pocket.pocketType,
    status: normalizedStatus(pocket),
    principalMinor: pocket.principalMinor?.toString() ?? null,
    apyBps: pocket.apyBps,
    lockDays: pocket.lockDays,
    lockedAt: pocket.lockedAt?.toISOString() ?? null,
    maturesAt: pocket.maturesAt?.toISOString() ?? null,
    withdrawnAt: pocket.withdrawnAt?.toISOString() ?? null,
    estimatedInterestMinor: lockedPreview?.estimatedInterestMinor ?? null,
    totalAtMaturityMinor: lockedPreview?.totalAtMaturityMinor ?? null,
    balanceMinor: balanceMinor.toString(),
    createdAt: pocket.createdAt.toISOString(),
    events: pocket.events.map((event) => ({
      id: event.id,
      type: event.type,
      assetCode: event.assetCode,
      amountMinor: event.amountMinor.toString(),
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString()
    }))
  };
}

function balanceFromEvents(events: Array<{ type: string; amountMinor: bigint }>) {
  const creditTypes = new Set(['POCKET_CREDIT', 'DEPOSIT_CONFIRMED', 'YIELD_ACCRUED']);
  const debitTypes = new Set(['POCKET_DEBIT', 'WITHDRAWAL_CONFIRMED']);
  return events.reduce((total, event) => {
    if (creditTypes.has(event.type)) {
      return total + event.amountMinor;
    }
    if (debitTypes.has(event.type)) {
      return total - event.amountMinor;
    }
    return total;
  }, BigInt(0));
}

function normalizedStatus(pocket: { status: string; withdrawnAt: Date | null; maturesAt: Date | null }) {
  if (pocket.withdrawnAt || pocket.status === 'WITHDRAWN') {
    return 'withdrawn';
  }
  if (pocket.status === 'ACTIVE') {
    return 'active';
  }
  if (pocket.maturesAt && pocket.maturesAt <= new Date()) {
    return 'matured';
  }
  return pocket.status === 'MATURED' ? 'matured' : 'locked';
}

function addDays(date: Date, days: (typeof earningDurations)[number]) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function decimalToMinor(value: string) {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
}

function sendSavingsError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
  }
  if (error instanceof z.ZodError) {
    return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid savings request.' } });
  }
  return reply.code(500).send({ error: { code: 'SERVER_ERROR', message: 'Savings service failed.' } });
}
