import type { FastifyRequest } from 'fastify';

import { prisma } from '../../prisma.ts';
import { AUTH_COOKIE_NAME, AuthError, sha256 } from './wallet-auth.ts';

export async function requireAuthUser(request: FastifyRequest) {
  const token = request.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    throw new AuthError('UNAUTHENTICATED', 'Authentication required.', 401);
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true }
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    throw new AuthError('SESSION_EXPIRED', 'Session expired.', 401);
  }

  assertActiveUser(session.user);

  await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });

  return session.user;
}

export function assertActiveUser(user: { status: string }) {
  if (user.status !== 'ACTIVE') {
    throw new AuthError('ACCOUNT_SUSPENDED', 'This account is suspended.', 403);
  }
}
