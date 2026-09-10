import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { loadStellarConfig, type StellarServerConfig } from '../../config.ts';
import { AuthError } from '../auth/wallet-auth.ts';
import { requireAuthUser } from '../auth/session.ts';
import { StellarServiceError } from './errors.ts';
import { StellarHorizonAdapter } from './horizon-adapter.ts';
import { idempotencyKeySchema, intentParamsSchema, signedXdrSchema, stellarQuoteSchema } from './schemas.ts';
import { StellarTransactionService } from './service.ts';

const activityQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) });

type StellarRouteDependencies = {
  config?: StellarServerConfig;
  service?: StellarTransactionService;
};

export function registerStellarRoutes(server: FastifyInstance, dependencies: StellarRouteDependencies = {}) {
  const config = dependencies.config ?? loadStellarConfig();
  const service = dependencies.service ?? new StellarTransactionService(new StellarHorizonAdapter(config), config);

  server.get('/api/stellar/capabilities', async (request, reply) => {
    try {
      await requireAuthUser(request);
      return service.capabilities();
    } catch (error) {
      return sendStellarError(reply, error);
    }
  });

  server.get('/api/stellar/me/summary', async (request, reply) => {
    try {
      return await service.summary(await requireAuthUser(request));
    } catch (error) {
      return sendStellarError(reply, error);
    }
  });

  server.get('/api/stellar/me/activity', async (request, reply) => {
    try {
      const { limit } = activityQuerySchema.parse(request.query);
      return await service.activity(await requireAuthUser(request), limit);
    } catch (error) {
      return sendStellarError(reply, error);
    }
  });

  server.post('/api/stellar/intents/quote', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const idempotencyKey = idempotencyKeySchema.parse(request.headers['idempotency-key']);
      const body = stellarQuoteSchema.parse(request.body);
      const intent = await service.quote(user, idempotencyKey, body);
      return reply.code(201).send(intent);
    } catch (error) {
      return sendStellarError(reply, error);
    }
  });

  server.post('/api/stellar/intents/:id/submit', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const { id } = intentParamsSchema.parse(request.params);
      const { signedXdr } = signedXdrSchema.parse(request.body);
      return await service.submit(user, id, signedXdr);
    } catch (error) {
      return sendStellarError(reply, error);
    }
  });

  server.get('/api/stellar/intents/:id', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const { id } = intentParamsSchema.parse(request.params);
      return await service.find(user.id, id);
    } catch (error) {
      return sendStellarError(reply, error);
    }
  });
}

function sendStellarError(reply: FastifyReply, error: unknown) {
  if (error instanceof StellarServiceError) {
    return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message, ...(error.resultCodes.length ? { resultCodes: error.resultCodes } : {}) } });
  }
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
  }
  if (error instanceof z.ZodError) {
    return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid request.' } });
  }
  requestSafeLog(error);
  return reply.code(500).send({ error: { code: 'SERVER_ERROR', message: 'Stellar transaction service failed safely.' } });
}

function requestSafeLog(error: unknown) {
  if (process.env.NODE_ENV !== 'test') console.error('Stellar route failure', error instanceof Error ? error.name : 'UnknownError');
}

