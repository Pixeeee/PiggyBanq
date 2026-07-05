import type { FastifyInstance } from 'fastify';

export function registerSavingsRoutes(server: FastifyInstance) {
  server.get('/savings/pockets', async () => ({
    status: 'not_implemented',
    message: 'Savings pockets are app-layer accounting over one Stellar account in v1.'
  }));
}

