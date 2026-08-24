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

const allocationUpdateSchema = allocationSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Provide at least one allocation field to update.'
});

const allocationOrderSchema = z.object({
  orderedCategoryIds: z.array(z.string().min(1)).min(1).max(100)
});

export function registerBudgetRoutes(server: FastifyInstance) {
  server.get('/budget/plans', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const plans = await prisma.budgetPlan.findMany({
        where: { userId: user.id },
        include: { categories: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
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
      const currentCategoryCount = await prisma.budgetCategory.count({
        where: { budgetPlan: { userId: user.id, month } }
      });
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
              pinnedAsset: body.currency,
              sortOrder: 0
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
              pinnedAsset: body.currency,
              sortOrder: currentCategoryCount
            }
          }
        },
        include: { categories: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } }
      });

      return { plan: toBudgetPlan(plan) };
    } catch (error) {
      return sendBudgetError(reply, error);
    }
  });

  server.patch('/budget/allocations/:id', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = allocationUpdateSchema.parse(request.body);
      const category = await getOwnedCategory(params.id, user.id);

      await prisma.budgetCategory.update({
        where: { id: category.id },
        data: {
          name: body.category,
          fixedMinor: body.amount ? decimalToMinor(body.amount) : undefined,
          pinnedAsset: body.currency
        }
      });

      const plan = await recalculateBudgetPlan(category.budgetPlanId);
      return { plan: toBudgetPlan(plan) };
    } catch (error) {
      return sendBudgetError(reply, error);
    }
  });

  server.delete('/budget/allocations/:id', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const category = await getOwnedCategory(params.id, user.id);

      await prisma.budgetCategory.delete({ where: { id: category.id } });
      await normalizeCategoryOrder(category.budgetPlanId);
      const plan = await recalculateBudgetPlan(category.budgetPlanId);
      return { plan: toBudgetPlan(plan) };
    } catch (error) {
      return sendBudgetError(reply, error);
    }
  });

  server.patch('/budget/plans/:id/categories/order', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = allocationOrderSchema.parse(request.body);
      const existingPlan = await prisma.budgetPlan.findFirst({
        where: { id: params.id, userId: user.id },
        include: { categories: true }
      });

      if (!existingPlan) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Budget plan not found.' } });
      }

      const existingIds = new Set(existingPlan.categories.map((category) => category.id));
      const requestedIds = new Set(body.orderedCategoryIds);
      const allIdsBelongToPlan = body.orderedCategoryIds.every((id) => existingIds.has(id));
      const includesEveryCategory = existingPlan.categories.every((category) => requestedIds.has(category.id));

      if (!allIdsBelongToPlan || !includesEveryCategory || requestedIds.size !== existingPlan.categories.length) {
        return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Order must include every category in this budget plan.' } });
      }

      await prisma.$transaction(
        body.orderedCategoryIds.map((id, index) => prisma.budgetCategory.update({ where: { id }, data: { sortOrder: index } }))
      );

      const plan = await recalculateBudgetPlan(existingPlan.id);
      return { plan: toBudgetPlan(plan) };
    } catch (error) {
      return sendBudgetError(reply, error);
    }
  });
}

async function getOwnedCategory(categoryId: string, userId: string) {
  const category = await prisma.budgetCategory.findFirst({
    where: { id: categoryId, budgetPlan: { userId } },
    select: { id: true, budgetPlanId: true }
  });

  if (!category) {
    throw new BudgetNotFoundError('Budget allocation not found.');
  }

  return category;
}

async function normalizeCategoryOrder(planId: string) {
  const categories = await prisma.budgetCategory.findMany({
    where: { budgetPlanId: planId },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true }
  });

  await prisma.$transaction(
    categories.map((category, index) => prisma.budgetCategory.update({ where: { id: category.id }, data: { sortOrder: index } }))
  );
}

async function recalculateBudgetPlan(planId: string) {
  const categories = await prisma.budgetCategory.findMany({
    where: { budgetPlanId: planId },
    select: { fixedMinor: true }
  });
  const totalMinor = categories.reduce((total, category) => total + (category.fixedMinor ?? 0n), 0n);

  return prisma.budgetPlan.update({
    where: { id: planId },
    data: { totalMinor },
    include: { categories: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } }
  });
}

function toBudgetPlan(plan: {
  id: string;
  month: string;
  displayCurrency: string;
  totalMinor: bigint;
  createdAt: Date;
  categories: Array<{ id: string; name: string; fixedMinor: bigint | null; pinnedAsset: string | null; sortOrder: number }>;
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
      currency: category.pinnedAsset ?? plan.displayCurrency,
      sortOrder: category.sortOrder
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
  if (error instanceof BudgetNotFoundError) {
    return reply.code(404).send({ error: { code: 'NOT_FOUND', message: error.message } });
  }
  if (error instanceof z.ZodError) {
    return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid budget allocation.' } });
  }
  return reply.code(500).send({ error: { code: 'SERVER_ERROR', message: 'Budget service failed.' } });
}

class BudgetNotFoundError extends Error {}
