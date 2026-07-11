import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../../prisma.ts';
import {
  AUTH_COOKIE_NAME,
  AuthError,
  assertAllowedNetwork,
  buildAuthMessage,
  createNonce,
  createSessionToken,
  getAuthConfig,
  networkSchema,
  normalizeStellarPublicKey,
  normalizeUsername,
  purposeSchema,
  safeHashEquals,
  sha256,
  stellarPublicKeySchema,
  toSafeUser,
  usernameSchema,
  verifyStellarSignature,
  type AuthNetwork,
  type AuthPurpose
} from './wallet-auth.ts';

const statusSchema = z.object({
  publicKey: stellarPublicKeySchema.optional(),
  username: usernameSchema.optional()
});
const challengeSchema = z.object({
  publicKey: stellarPublicKeySchema,
  purpose: purposeSchema,
  network: networkSchema.default('TESTNET')
});
const signupSchema = z.object({
  challengeId: z.string().min(8),
  publicKey: stellarPublicKeySchema,
  signature: z.string().min(20),
  username: usernameSchema,
  displayName: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(160).optional()
});
const loginSchema = z.object({
  challengeId: z.string().min(8),
  publicKey: stellarPublicKeySchema,
  signature: z.string().min(20)
});

export function registerAuthRoutes(server: FastifyInstance) {
  server.post('/api/auth/stellar/status', async (request, reply) => {
    try {
      const { publicKey, username } = statusSchema.parse(request.body);
      const normalizedPublicKey = publicKey ? normalizeStellarPublicKey(publicKey) : null;
      const normalizedUsername = username ? normalizeUsername(username) : null;
      const publicKeyUser = normalizedPublicKey
        ? await prisma.user.findUnique({ where: { stellarPublicKey: normalizedPublicKey } })
        : null;
      const usernameUser = normalizedUsername
        ? await prisma.user.findUnique({ where: { username: normalizedUsername } })
        : null;

      return {
        publicKey: normalizedPublicKey,
        username: normalizedUsername,
        registered: Boolean(publicKeyUser),
        usernameAvailable: normalizedUsername ? !usernameUser : null
      };
    } catch (error) {
      return sendAuthError(reply, error);
    }
  });

  server.post('/api/auth/stellar/challenge', async (request, reply) => {
    try {
      const body = challengeSchema.parse(request.body);
      const publicKey = normalizeStellarPublicKey(body.publicKey);
      assertAllowedNetwork(body.network);

      const existingUser = await prisma.user.findUnique({ where: { stellarPublicKey: publicKey } });
      if (body.purpose === 'SIGN_UP' && existingUser) {
        throw new AuthError('WALLET_ALREADY_REGISTERED', 'This wallet is already registered.', 409);
      }
      if (body.purpose === 'LOGIN' && !existingUser) {
        throw new AuthError('WALLET_NOT_REGISTERED', 'This wallet is not registered yet.', 404);
      }

      const config = getAuthConfig();
      const nonce = createNonce();
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + config.challengeTtlMs);
      const message = buildAuthMessage({
        publicKey,
        purpose: body.purpose,
        network: body.network,
        nonce,
        issuedAt,
        expiresAt
      });

      const challenge = await prisma.walletAuthChallenge.create({
        data: {
          publicKey,
          nonceHash: sha256(nonce),
          messageHash: sha256(message),
          message,
          purpose: body.purpose,
          network: body.network,
          domain: config.domain,
          issuedAt,
          expiresAt,
          userId: existingUser?.id
        }
      });

      return {
        challengeId: challenge.id,
        publicKey,
        message,
        expiresAt: expiresAt.toISOString()
      };
    } catch (error) {
      return sendAuthError(reply, error);
    }
  });

  server.post('/api/auth/stellar/signup', async (request, reply) => {
    try {
      const body = signupSchema.parse(request.body);
      const publicKey = normalizeStellarPublicKey(body.publicKey);
      const username = normalizeUsername(body.username);
      const user = await prisma.$transaction(async (tx) => {
        await verifyAndConsumeChallenge(tx, {
          challengeId: body.challengeId,
          publicKey,
          signature: body.signature,
          purpose: 'SIGN_UP'
        });

        const existingUsername = await tx.user.findUnique({ where: { username } });
        if (existingUsername) {
          throw new AuthError('USERNAME_TAKEN', 'Username is already taken.', 409);
        }

        return tx.user.create({
          data: {
            username,
            stellarPublicKey: publicKey,
            email: body.email?.toLowerCase(),
            displayName: body.displayName ?? username,
            status: 'ACTIVE',
            role: 'USER',
            lastLoginAt: new Date()
          }
        });
      });

      await createSession(reply, request, user.id);
      return { user: toSafeUser(user) };
    } catch (error) {
      return sendAuthError(reply, error);
    }
  });

  server.post('/api/auth/stellar/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const publicKey = normalizeStellarPublicKey(body.publicKey);
      const user = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({ where: { stellarPublicKey: publicKey } });
        if (!existingUser) {
          throw new AuthError('WALLET_NOT_REGISTERED', 'This wallet is not registered yet.', 404);
        }

        await verifyAndConsumeChallenge(tx, {
          challengeId: body.challengeId,
          publicKey,
          signature: body.signature,
          purpose: 'LOGIN'
        });

        return tx.user.update({
          where: { id: existingUser.id },
          data: { lastLoginAt: new Date() }
        });
      });

      await createSession(reply, request, user.id);
      return { user: toSafeUser(user) };
    } catch (error) {
      return sendAuthError(reply, error);
    }
  });

  server.get('/api/auth/me', async (request, reply) => {
    const token = request.cookies?.[AUTH_COOKIE_NAME];
    if (!token) {
      return reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' } });
    }

    const session = await prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true }
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      clearSessionCookie(reply);
      return reply.code(401).send({ error: { code: 'SESSION_EXPIRED', message: 'Session expired.' } });
    }

    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
    return { user: toSafeUser(session.user) };
  });

  server.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies?.[AUTH_COOKIE_NAME];
    if (token) {
      await prisma.session.updateMany({
        where: { tokenHash: sha256(token), revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
    clearSessionCookie(reply);
    return { ok: true };
  });
}

async function verifyAndConsumeChallenge(
  tx: Prisma.TransactionClient,
  input: {
    challengeId: string;
    publicKey: string;
    signature: string;
    purpose: AuthPurpose;
  }
) {
  const challenge = await tx.walletAuthChallenge.findUnique({ where: { id: input.challengeId } });
  if (!challenge) throw new AuthError('CHALLENGE_NOT_FOUND', 'Authentication challenge was not found.', 404);
  if (challenge.usedAt) throw new AuthError('CHALLENGE_USED', 'Authentication challenge was already used.', 409);
  if (challenge.expiresAt <= new Date()) throw new AuthError('CHALLENGE_EXPIRED', 'Authentication challenge expired.', 410);
  if (challenge.purpose !== input.purpose) throw new AuthError('PURPOSE_MISMATCH', 'Authentication challenge purpose mismatch.', 400);
  if (challenge.publicKey !== input.publicKey) throw new AuthError('WALLET_CHANGED', 'Wallet changed during authentication.', 400);
  if (!getAuthConfig().allowedNetworks.includes(challenge.network as AuthNetwork)) throw new AuthError('UNSUPPORTED_NETWORK', 'Unsupported Stellar network.', 400);
  if (challenge.domain !== getAuthConfig().domain) throw new AuthError('DOMAIN_MISMATCH', 'Authentication domain mismatch.', 400);
  if (!safeHashEquals(challenge.messageHash, sha256(challenge.message))) throw new AuthError('MESSAGE_MISMATCH', 'Authentication message mismatch.', 400);

  if (!verifyStellarSignature(challenge.message, input.signature, input.publicKey)) {
    throw new AuthError('INVALID_SIGNATURE', 'Signature was not produced by the selected Stellar wallet.', 401);
  }

  const result = await tx.walletAuthChallenge.updateMany({
    where: { id: challenge.id, usedAt: null },
    data: { usedAt: new Date() }
  });
  if (result.count !== 1) throw new AuthError('CHALLENGE_USED', 'Authentication challenge was already used.', 409);
}

async function createSession(reply: FastifyReply, request: FastifyRequest, userId: string) {
  const config = getAuthConfig();
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + config.sessionTtlMs);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt,
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip
    }
  });

  reply.setCookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: config.secureCookie ? 'none' : 'lax',
    secure: config.secureCookie,
    path: '/',
    expires: expiresAt
  });
}

function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
}

function sendAuthError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
  }
  if (error instanceof z.ZodError) {
    return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid request.' } });
  }
  return reply.code(500).send({ error: { code: 'SERVER_ERROR', message: 'Authentication service failed.' } });
}
