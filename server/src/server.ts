import Fastify from 'fastify';

import { registerAnchorRoutes } from './modules/anchor/routes.ts';
import { registerAuthRoutes } from './modules/auth/routes.ts';
import { registerBudgetRoutes } from './modules/budget/routes.ts';
import { registerMilestoneRoutes } from './modules/milestones/routes.ts';
import { registerProfileRoutes } from './modules/profile/routes.ts';
import { registerSavingsRoutes } from './modules/savings/routes.ts';
import { registerSocialRoutes } from './modules/social/routes.ts';
import { registerWalletRoutes } from './modules/wallet/routes.ts';

export function buildServer() {
  const server = Fastify({
    logger: {
      redact: ['req.headers.authorization', 'password', 'token', 'secretKey', 'mnemonic']
    }
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

