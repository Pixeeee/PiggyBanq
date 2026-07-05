import type { FastifyInstance } from 'fastify';

export function registerSocialRoutes(server: FastifyInstance) {
  server.get('/social/health', async () => ({
    status: 'phase_5',
    message: 'Social features are planned for Phase 5; relief pledges will never auto-trigger payments in v1.'
  }));
}

