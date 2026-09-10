import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import { loadStellarConfig } from './config.ts';
import { registerAnchorRoutes } from './modules/anchor/routes.ts';
import { registerAgenticRoutes } from './modules/agentic/routes.ts';
import { registerAuthRoutes } from './modules/auth/routes.ts';
import { registerBudgetRoutes } from './modules/budget/routes.ts';
import { registerMilestoneRoutes } from './modules/milestones/routes.ts';
import { registerProfileRoutes } from './modules/profile/routes.ts';
import { registerSavingsRoutes } from './modules/savings/routes.ts';
import { registerSocialRoutes } from './modules/social/routes.ts';
import { registerStellarRoutes } from './modules/stellar/routes.ts';
import { registerWalletRoutes } from './modules/wallet/routes.ts';

export function buildServer() {
  const stellarConfig = loadStellarConfig();
  const allowedOrigins = [...stellarConfig.webOrigins];

  const server = Fastify({
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
    max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 30),
    timeWindow: process.env.AUTH_RATE_LIMIT_WINDOW ?? '1 minute'
  });

  const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  server.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    const origin = request.headers.origin?.replace(/\/+$/, '');
    if (MUTATION_METHODS.has(request.method) && origin && !allowedOrigins.includes(origin)) {
      return reply.code(403).send({ error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Request origin is not allowed.' } });
    }
  });

  server.get('/health', async () => ({ ok: true, service: 'piggybanq-api' }));

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

  return server;
}
