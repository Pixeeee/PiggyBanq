import type { FastifyInstance } from 'fastify';

export function registerProfileRoutes(server: FastifyInstance) {
  server.get('/profile/me', async () => ({
    status: 'not_implemented',
    message: 'Profiles must not display full Stellar addresses by default in social contexts.'
  }));
}

