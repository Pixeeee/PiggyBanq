import type { FastifyInstance } from 'fastify';

export function registerMilestoneRoutes(server: FastifyInstance) {
  server.get('/milestones', async () => ({
    status: 'phase_6',
    message: 'Milestones are evaluated from app-layer ledger events in Phase 6.'
  }));
}

