import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import { loadStellarConfig } from './config.ts';
import { prisma } from './prisma.ts';
import { loadTrustProxy } from './startup.ts';
import { registerAnchorRoutes } from './modules/anchor/routes.ts';
import { registerAgenticRoutes } from './modules/agentic/routes.ts';
import { sessionRateLimitKey } from './modules/auth/rate-limit.ts';
import { registerAuthRoutes } from './modules/auth/routes.ts';
import { getAuthConfig } from './modules/auth/wallet-auth.ts';
import { registerBudgetRoutes } from './modules/budget/routes.ts';
import { registerMilestoneRoutes } from './modules/milestones/routes.ts';
import { registerProfileRoutes } from './modules/profile/routes.ts';
import { registerSavingsRoutes } from './modules/savings/routes.ts';
import { registerSocialRoutes } from './modules/social/routes.ts';
import { registerStellarRoutes } from './modules/stellar/routes.ts';
import { registerWalletRoutes } from './modules/wallet/routes.ts';

export function buildServer() {
  const stellarConfig = loadStellarConfig();
  getAuthConfig();
  const allowedOrigins = [...stellarConfig.webOrigins];
  const trustedProxy = loadTrustProxy();

  const server = Fastify({
    trustProxy: typeof trustedProxy === 'number' ? (_address, hop) => hop < trustedProxy : trustedProxy,
    logger: {
      redact: [
        'req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'req.body.token',
        'req.body.secretKey', 'req.body.mnemonic', 'req.body.recoveryPhrase', 'req.body.accessToken',
        'req.body.privateKey', 'req.body.signedXdr', 'password', 'token', 'secretKey', 'mnemonic',
        'recoveryPhrase', 'accessToken', 'privateKey', 'signedXdr'
      ]
    }
  });

  server.register(cookie);
  server.register(cors, {
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
    credentials: true
  });
  server.register(rateLimit, {
    keyGenerator: sessionRateLimitKey,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 30),
    timeWindow: process.env.AUTH_RATE_LIMIT_WINDOW ?? '1 minute'
  });

  const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  server.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Cache-Control', 'private, no-store');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    const origin = request.headers.origin?.replace(/\/+$/, '');
    if (MUTATION_METHODS.has(request.method) && origin && !allowedOrigins.includes(origin)) {
      return reply.code(403).send({ error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Request origin is not allowed.' } });
    }
  });

  // Rate-limit installs an onRoute hook. Register routes after that hook exists.
  server.after((error) => {
    if (error) throw error;
    server.get('/health', { config: { rateLimit: false } }, async () => ({ ok: true, service: 'piggybanq-api' }));
    server.get('/ready', { config: { rateLimit: false } }, async (_request, reply) => {
      reply.header('Cache-Control', 'no-store');
      try {
        await prisma.$queryRaw`SELECT 1`;
        return { ok: true, service: 'piggybanq-api', database: 'available' };
      } catch {
        return reply.code(503).send({ ok: false, service: 'piggybanq-api', database: 'unavailable' });
      }
    });

    registerAuthRoutes(server);
    registerAgenticRoutes(server);
    registerWalletRoutes(server);
    registerSavingsRoutes(server);
    registerAnchorRoutes(server);
    registerBudgetRoutes(server);
    registerSocialRoutes(server);
    registerStellarRoutes(server, { config: stellarConfig });
    registerMilestoneRoutes(server);
    registerProfileRoutes(server);
  });

  return server;
}
