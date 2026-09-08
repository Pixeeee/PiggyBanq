import type { FastifyInstance, FastifyReply } from 'fastify';
import type { AgenticIntentDraft, AgenticIntentPreview } from '@piggybanq/types/agentic';
import { AgenticRailError } from '@piggybanq/stellar-core/cross-rail';
import { z } from 'zod';

import { prisma } from '../../prisma.ts';
import { requireAuthUser } from '../auth/session.ts';
import { AuthError } from '../auth/wallet-auth.ts';
import {
  approveSandboxAgentAction,
  executeSandboxAgentAction,
  previewSandboxAgentAction
} from './sandbox-provider.ts';

const intentSchema = z.object({
  actionType: z.enum(['X402_PAYMENT', 'STELLAR_SWAP', 'CCTP_BRIDGE', 'STELLAR_SELL']),
  amount: z.string().regex(/^\d+(\.\d{1,7})?$/),
  assetCode: z.enum(['XLM', 'USDC']),
  outputAssetCode: z.enum(['XLM', 'USDC', 'PHP']).optional(),
  recipient: z.string().trim().min(1).max(160).optional(),
  serviceUrl: z.string().trim().max(500).optional(),
  destinationAddress: z.string().trim().max(80).optional(),
  destinationNetwork: z.enum(['BASE_SEPOLIA', 'BSC_TESTNET']).optional()
});

const idSchema = z.object({ id: z.string().min(1) });

export function registerAgenticRoutes(server: FastifyInstance) {
  server.get('/agentic/capabilities', async (request, reply) => {
    try {
      await requireAuthUser(request);
      return {
        mode: 'SANDBOX',
        capabilities: [
          { type: 'STELLAR_SWAP', provider: 'STELLAR', network: 'TESTNET' },
          { type: 'CCTP_BRIDGE', provider: 'CIRCLE_CCTP', route: 'Stellar Testnet → Base Sepolia' },
          { type: 'X402_PAYMENT', provider: 'BINANCE_X402', network: 'SANDBOX', limit: '20.00 USDC' }
        ],
        unavailableRoutes: ['Stellar USDC → BSC']
      };
    } catch (error) {
      return sendAgenticError(reply, error);
    }
  });

  server.post('/agentic/intents/preview', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const draft = intentSchema.parse(request.body) as AgenticIntentDraft;
      const preview = previewSandboxAgentAction(draft);
      const action = await prisma.agentAction.create({
        data: {
          id: preview.id,
          userId: user.id,
          actionType: preview.actionType,
          provider: preview.provider,
          status: preview.status,
          requestPayload: preview,
          policyResult: preview.policyChecks,
          expiresAt: new Date(preview.expiresAt)
        }
      });
      return { intent: { ...preview, id: action.id } };
    } catch (error) {
      return sendAgenticError(reply, error);
    }
  });

  server.post('/agentic/intents/:id/approve', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const { id } = idSchema.parse(request.params);
      const action = await prisma.agentAction.findFirst({ where: { id, userId: user.id } });
      if (!action) return reply.code(404).send({ error: { code: 'INTENT_NOT_FOUND', message: 'Intent not found.' } });
      const intent = approveSandboxAgentAction(action.requestPayload as unknown as AgenticIntentPreview);
      await prisma.agentAction.update({
        where: { id },
        data: { status: 'APPROVED', approvedAt: new Date(intent.approvedAt!), requestPayload: intent }
      });
      return { intent };
    } catch (error) {
      return sendAgenticError(reply, error);
    }
  });

  server.post('/agentic/intents/:id/execute', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const { id } = idSchema.parse(request.params);
      const action = await prisma.agentAction.findFirst({ where: { id, userId: user.id } });
      if (!action) return reply.code(404).send({ error: { code: 'INTENT_NOT_FOUND', message: 'Intent not found.' } });
      if (action.status !== 'APPROVED') {
        return reply.code(409).send({ error: { code: 'APPROVAL_REQUIRED', message: 'Approve the intent before execution.' } });
      }
      const result = executeSandboxAgentAction(action.requestPayload as unknown as AgenticIntentPreview);
      await prisma.$transaction([
        prisma.agentAction.update({
          where: { id },
          data: { status: 'SUCCEEDED', executedAt: new Date(result.intent.executedAt!), requestPayload: result.intent }
        }),
        prisma.providerReceipt.create({
          data: {
            id: result.receipt.id,
            agentActionId: id,
            network: result.receipt.network,
            externalReference: result.receipt.externalReference,
            providerPayload: result.receipt
          }
        })
      ]);
      return result;
    } catch (error) {
      return sendAgenticError(reply, error);
    }
  });

  server.get('/agentic/intents', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const actions = await prisma.agentAction.findMany({
        where: { userId: user.id }, include: { receipt: true }, orderBy: { createdAt: 'desc' }, take: 25
      });
      return { intents: actions.map((action) => action.requestPayload), receipts: actions.flatMap((action) => action.receipt ? [action.receipt.providerPayload] : []) };
    } catch (error) {
      return sendAgenticError(reply, error);
    }
  });
}

function sendAgenticError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
  if (error instanceof AgenticRailError) {
    const statusCode = error.code === 'APPROVAL_REQUIRED' ? 409 : 400;
    return reply.code(statusCode).send({ error: { code: error.code, message: error.message } });
  }
  if (error instanceof z.ZodError) return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid intent.' } });
  return reply.code(500).send({ error: { code: 'PROVIDER_UNAVAILABLE', message: 'Agentic sandbox service is unavailable.' } });
}
