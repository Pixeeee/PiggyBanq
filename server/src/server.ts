import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import { registerAnchorRoutes } from './modules/anchor/routes.ts';
import { registerAuthRoutes } from './modules/auth/routes.ts';
import { registerBudgetRoutes } from './modules/budget/routes.ts';
import { registerMilestoneRoutes } from './modules/milestones/routes.ts';
import { registerProfileRoutes } from './modules/profile/routes.ts';
import { registerSavingsRoutes } from './modules/savings/routes.ts';
import { registerSocialRoutes } from './modules/social/routes.ts';
import { registerWalletRoutes } from './modules/wallet/routes.ts';

export function buildServer() {
  const allowedOrigins = (
    process.env.AUTH_ALLOWED_ORIGINS ?? process.env.AUTH_APP_URL ?? 'http://127.0.0.1:3010'
  )
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const server = Fastify({
    logger: {
      redact: ['req.headers.authorization', 'password', 'token', 'secretKey', 'mnemonic']
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

  server.get('/health', async () => ({ ok: true, service: 'piggybanq-api' }));

  registerAuthRoutes(server);
  registerWalletRoutes(server);
  registerSavingsRoutes(server);
  registerAnchorRoutes(server);
  registerBudgetRoutes(server);
  registerSocialRoutes(server);
  registerMilestoneRoutes(server);
  registerProfileRoutes(server);

  return server;
}
