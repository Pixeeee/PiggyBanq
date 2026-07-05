import type { FastifyInstance } from 'fastify';

export function registerAuthRoutes(server: FastifyInstance) {
  server.post('/auth/signup', async () => ({
    status: 'not_implemented',
    message: 'Signup will hash passwords with bcrypt cost >= 12 and create a refresh-token family.'
  }));

  server.post('/auth/login', async () => ({
    status: 'not_implemented',
    message: 'Login will issue a 15-minute JWT access token plus rotated refresh token.'
  }));
}

