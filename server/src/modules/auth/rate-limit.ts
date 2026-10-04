import type { FastifyRequest } from 'fastify';
import { prisma } from '../../prisma.ts';
import { AUTH_COOKIE_NAME, sha256 } from './wallet-auth.ts';

/** SSR has a shared proxy IP. Only verified, active sessions get a per-user bucket. */
export async function sessionRateLimitKey(request: FastifyRequest) {
  const fallback = `ip:${request.ip}`;
  const token = request.cookies?.[AUTH_COOKIE_NAME];
  if (request.method !== 'GET' || request.url.split('?')[0] !== '/api/auth/me' || !token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return fallback;
  try {
    const session = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
    if (session && !session.revokedAt && session.expiresAt > new Date() && session.user.status === 'ACTIVE') return `user:${session.user.id}`;
  } catch { /* An unavailable database cannot authorize a different rate-limit bucket. */ }
  return fallback;
}
