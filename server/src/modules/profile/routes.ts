import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../prisma.ts';
import { requireAuthUser } from '../auth/session.ts';
import { AuthError, toSafeUser } from '../auth/wallet-auth.ts';

const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(240).optional(),
  avatarUrl: z.string().trim().max(500).optional(),
  coverPhotoUrl: z.string().trim().max(500).optional(),
  currency: z.enum(['PHP', 'USD', 'XLM', 'USDC']).default('PHP'),
  visibility: z.enum(['PUBLIC', 'WALLET_ADDRESS_ONLY', 'PRIVATE']).default('PRIVATE')
});

export function registerProfileRoutes(server: FastifyInstance) {
  server.get('/profile/me', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      return { profile: toProfile(user) };
    } catch (error) {
      return sendProfileError(reply, error);
    }
  });

  server.patch('/profile/me', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const body = profileUpdateSchema.parse(request.body);
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: body
      });

      return { profile: toProfile(updated) };
    } catch (error) {
      return sendProfileError(reply, error);
    }
  });
}

function toProfile(user: Parameters<typeof toSafeUser>[0] & {
  bio?: string | null;
  avatarUrl?: string | null;
  coverPhotoUrl?: string | null;
  currency?: string;
  visibility?: string;
}) {
  return {
    ...toSafeUser(user),
    bio: user.bio ?? '',
    avatarUrl: user.avatarUrl ?? '',
    coverPhotoUrl: user.coverPhotoUrl ?? '',
    currency: user.currency ?? 'PHP',
    visibility: user.visibility ?? 'PRIVATE'
  };
}

function sendProfileError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
  }
  if (error instanceof z.ZodError) {
    return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid profile.' } });
  }
  return reply.code(500).send({ error: { code: 'SERVER_ERROR', message: 'Profile service failed.' } });
}
