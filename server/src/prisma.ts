import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { piggyBanqPrisma?: PrismaClient };

export const prisma = globalForPrisma.piggyBanqPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.piggyBanqPrisma = prisma;
}
