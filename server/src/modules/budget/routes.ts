import type { FastifyInstance } from 'fastify';

export function registerBudgetRoutes(server: FastifyInstance) {
  server.get('/budget/plans', async () => ({
    status: 'phase_4',
    message: 'Budget plans are planned for Phase 4.'
  }));
}

