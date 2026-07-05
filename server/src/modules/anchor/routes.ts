import type { FastifyInstance } from 'fastify';

export function registerAnchorRoutes(server: FastifyInstance) {
  server.post('/anchor/sep24/session', async () => ({
    status: 'phase_3',
    message: 'SEP-24 sessions are planned for Phase 3 after Phase 0-2 are stable.'
  }));
}

