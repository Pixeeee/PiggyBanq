import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { assertX402Requirements } from '@piggybanq/stellar-core/x402';
import { requireAuthUser } from '../auth/session.ts';
import { AuthError } from '../auth/wallet-auth.ts';
import { X402Error, X402_RPC_URL, X402Service, x402View } from './service.ts';

const params = z.object({ id: z.string().min(1).max(100) });
const key = z.string().min(16).max(100).regex(/^[a-zA-Z0-9_-]+$/);
const paymentSchema = z.object({ x402Version: z.literal(2), accepted: z.unknown(),
  payload: z.object({ transaction: z.string().min(1).max(20_000) }).strict() });

export function registerX402Routes(server: FastifyInstance) {
  const service = new X402Service();
  server.register(async routes => {
    routes.setErrorHandler((error, _request, reply) => {
      const status = error instanceof X402Error || error instanceof AuthError ? error.statusCode : error instanceof z.ZodError ? 400 : error instanceof Error && 'statusCode' in error && error.statusCode === 429 ? 429 : 500;
      return reply.code(status).send({ error: { code: 'X402_PAYMENT_ERROR',
        message: status === 429 ? 'Too many payment requests. Wait before refreshing or paying again.' : status < 500 && error instanceof Error ? error.message : 'Testnet x402 is unavailable; no verified receipt was issued.' } });
    });
    routes.post('/api/x402/intents', async (request, reply) => {
      const user = await requireAuthUser(request);
      const row = await service.quote(user, key.parse(request.headers['idempotency-key']));
      return reply.code(201).send({ intent: x402View(row) });
    });
    routes.get('/api/x402/intents/:id', async request => {
      const user = await requireAuthUser(request);
      const row = await service.owned(user.id, params.parse(request.params).id);
      return { intent: x402View(await service.reconcile(row)) };
    });
    routes.post('/api/x402/intents/:id/approve', async request => {
      const user = await requireAuthUser(request);
      return { intent: x402View(await service.approve(user.id, params.parse(request.params).id)) };
    });
    routes.post('/api/x402/intents/:id/cancel', async request => {
      const user = await requireAuthUser(request);
      return { intent: x402View(await service.cancel(user.id, params.parse(request.params).id)) };
    });
    routes.post('/api/x402/rpc', { bodyLimit: 128_000 }, async (request, reply) => {
      await requireAuthUser(request);
      if (process.env.STELLAR_X402_ENABLED !== 'true') throw new X402Error('Testnet x402 is disabled.', 503);
      const body = z.object({ jsonrpc: z.literal('2.0'), id: z.union([z.string(), z.number()]),
        method: z.enum(['getNetwork', 'getLatestLedger', 'getLedgerEntries', 'simulateTransaction', 'getTransaction']),
        params: z.unknown().optional() }).strict().parse(request.body);
      const result = await fetch(X402_RPC_URL, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15_000), redirect: 'error' });
      if (!result.ok) throw new X402Error('Testnet RPC is unavailable.', 503);
      return reply.send(await result.json());
    });
    routes.get('/api/x402/test/insight/:id', async (request, reply) => {
      const user = await requireAuthUser(request);
      const id = params.parse(request.params).id;
      let row = await service.owned(user.id, id);
      const signature = request.headers['payment-signature'];
      if (row.status !== 'SUCCEEDED' && !signature) {
        const view = x402View(row);
        const challenge = { x402Version: 2, resource: view.resource, accepts: [view.requirements] };
        return reply.code(402).header('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(challenge)).toString('base64')).send(challenge);
      }
      if (row.status !== 'SUCCEEDED') {
        const header = z.string().max(32_000).parse(signature);
        let decoded: unknown;
        try { decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf8')); }
        catch { throw new X402Error('Malformed payment signature.'); }
        const payload = paymentSchema.parse(decoded);
        assertX402Requirements(payload.accepted);
        row = await service.pay(user.id, id, { ...payload, accepted: payload.accepted });
      }
      if (row.status !== 'SUCCEEDED') return reply.code(202).send({ intent: x402View(row) });
      return reply.header('PAYMENT-RESPONSE', Buffer.from(JSON.stringify(row.receipt)).toString('base64')).send({
        intent: x402View(row), insight: { title: 'Build a small emergency buffer',
          suggestion: 'Choose a savings target you can maintain and review your allocations regularly.',
          testOnly: true, paidWith: 'Stellar Testnet XLM' }
      });
    });
  });
}
