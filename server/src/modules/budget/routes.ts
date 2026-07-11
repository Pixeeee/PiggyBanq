import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../prisma.ts';
import { requireAuthUser } from '../auth/session.ts';
import { AuthError } from '../auth/wallet-auth.ts';

const allocationSchema = z.object({
  category: z.string().trim().min(2).max(60),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a decimal value.'),
  currency: z.enum(['PHP', 'USD', 'XLM', 'USDC'])
});

export function registerBudgetRoutes(server: FastifyInstance) {
  server.get('/budget/plans', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const plans = await prisma.budgetPlan.findMany({
        where: { userId: user.id },
        include: { categories: true },
        orderBy: { createdAt: 'desc' },
        take: 6
      });

      return { plans: plans.map(toBudgetPlan) };
    } catch (error) {
      return sendBudgetError(reply, error);
    }
  });

  server.post('/budget/allocations', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const body = allocationSchema.parse(request.body);
      const month = new Date().toISOString().slice(0, 7);
      const amountMinor = decimalToMinor(body.amount);
      const plan = await prisma.budgetPlan.upsert({
        where: { userId_month: { userId: user.id, month } },
        create: {
          userId: user.id,
          month,
          displayCurrency: body.currency,
          totalMinor: amountMinor,
          categories: {
            create: {
              name: body.category,
              allocationBps: 0,
              fixedMinor: amountMinor,
              pinnedAsset: body.currency
            }
          }
        },
        update: {
          displayCurrency: body.currency,
          totalMinor: { increment: amountMinor },
          categories: {
            create: {
              name: body.category,
              allocationBps: 0,
              fixedMinor: amountMinor,
              pinnedAsset: body.currency
            }
          }
        },
        include: { categories: true }
      });

      return { plan: toBudgetPlan(plan) };
    } catch (error) {
      return sendBudgetError(reply, error);
    }
  });
}

function toBudgetPlan(plan: {
  id: string;
  month: string;
  displayCurrency: string;
  totalMinor: bigint;
  createdAt: Date;
  categories: Array<{ id: string; name: string; fixedMinor: bigint | null; pinnedAsset: string | null }>;
}) {
  return {
    id: plan.id,
    month: plan.month,
    displayCurrency: plan.displayCurrency,
    totalMinor: plan.totalMinor.toString(),
    createdAt: plan.createdAt.toISOString(),
    categories: plan.categories.map((category) => ({
      id: category.id,
      name: category.name,
      amountMinor: (category.fixedMinor ?? 0n).toString(),
      currency: category.pinnedAsset ?? plan.displayCurrency
    }))
  };
}

function decimalToMinor(value: string) {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
}

function sendBudgetError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
  }
  if (error instanceof z.ZodError) {
    return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid budget allocation.' } });
  }
  return reply.code(500).send({ error: { code: 'SERVER_ERROR', message: 'Budget service failed.' } });
}
