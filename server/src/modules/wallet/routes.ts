import type { FastifyInstance } from 'fastify';

export function registerWalletRoutes(server: FastifyInstance) {
  server.post('/wallets/link-public-key', async () => ({
    status: 'not_implemented',
    message: 'Only Stellar public keys are accepted here. Never send secret keys or mnemonics to the server.'
  }));
}

