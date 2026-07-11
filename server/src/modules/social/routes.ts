import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../prisma.ts';
import { requireAuthUser } from '../auth/session.ts';
import { AuthError } from '../auth/wallet-auth.ts';

const defaultGroups = [
  ['Calamity Relief', 'Urgent help posts, supply requests, and donation coordination.'],
  ['Barangay Updates', 'Local announcements and neighborhood safety updates.'],
  ['Medical Support', 'Medicine, clinic, and volunteer coordination.'],
  ['Food and Water', 'Drinking water, meals, and essentials requests.']
] as const;

const reliefPostSchema = z.object({
  description: z.string().trim().min(3).max(500),
  locationTag: z.string().trim().max(120).optional(),
  targetAmount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/).optional(),
  assetCode: z.enum(['PHP', 'USD', 'XLM', 'USDC']).default('PHP'),
  photoUrl: z.string().trim().max(300_000).optional()
});

const discussionPostSchema = z.object({
  groupId: z.string().min(4),
  body: z.string().trim().min(1).max(500)
});

const chatMessageSchema = z.object({
  channel: z.enum(['GLOBAL', 'PRIVATE']).default('GLOBAL'),
  body: z.string().trim().min(1).max(500)
});

const pledgeSchema = z.object({
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a decimal value.'),
  assetCode: z.enum(['PHP', 'USD', 'XLM', 'USDC']).default('PHP')
});

export function registerSocialRoutes(server: FastifyInstance) {
  server.get('/social/community', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const groups = await ensureDefaultGroups();
      const [reliefPosts, discussionPosts, globalMessages, privateMessages] = await Promise.all([
        prisma.reliefPost.findMany({
          include: { author: true, pledges: true },
          orderBy: { createdAt: 'desc' },
          take: 30
        }),
        prisma.post.findMany({
          include: { author: true, group: true, comments: true },
          orderBy: { createdAt: 'desc' },
          take: 30
        }),
        messagesForChannel('GLOBAL', 'global'),
        messagesForChannel('PRIVATE', privateChannelName(user.id))
      ]);

      return {
        viewer: toCommunityUser(user),
        groups: groups.map(toGroup),
        reliefPosts: reliefPosts.map(toReliefPost),
        discussionPosts: discussionPosts.map(toDiscussionPost),
        messages: {
          global: globalMessages.map(toChatMessage),
          private: privateMessages.map(toChatMessage)
        }
      };
    } catch (error) {
      return sendSocialError(reply, error);
    }
  });

  server.post('/social/relief-posts', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const body = reliefPostSchema.parse(request.body);
      const post = await prisma.reliefPost.create({
        data: {
          authorId: user.id,
          description: body.description,
          locationTag: body.locationTag,
          targetAmountMinor: body.targetAmount ? decimalToMinor(body.targetAmount) : null,
          assetCode: body.assetCode,
          photoUrl: body.photoUrl
        },
        include: { author: true, pledges: true }
      });

      return { reliefPost: toReliefPost(post) };
    } catch (error) {
      return sendSocialError(reply, error);
    }
  });

  server.post('/social/relief-posts/:id/pledges', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const params = z.object({ id: z.string().min(4) }).parse(request.params);
      const body = pledgeSchema.parse(request.body);
      await prisma.pledge.create({
        data: {
          reliefPostId: params.id,
          userId: user.id,
          amountMinor: decimalToMinor(body.amount),
          assetCode: body.assetCode
        }
      });
      const post = await prisma.reliefPost.findUniqueOrThrow({
        where: { id: params.id },
        include: { author: true, pledges: true }
      });

      return { reliefPost: toReliefPost(post) };
    } catch (error) {
      return sendSocialError(reply, error);
    }
  });

  server.post('/social/posts', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const body = discussionPostSchema.parse(request.body);
      const post = await prisma.post.create({
        data: {
          authorId: user.id,
          groupId: body.groupId,
          body: body.body
        },
        include: { author: true, group: true, comments: true }
      });

      return { discussionPost: toDiscussionPost(post) };
    } catch (error) {
      return sendSocialError(reply, error);
    }
  });

  server.post('/social/messages', async (request, reply) => {
    try {
      const user = await requireAuthUser(request);
      const body = chatMessageSchema.parse(request.body);
      const channelName = body.channel === 'GLOBAL' ? 'global' : privateChannelName(user.id);
      const channel = await findOrCreateChannel(body.channel, channelName);
      const message = await prisma.chatMessage.create({
        data: {
          channelId: channel.id,
          senderId: user.id,
          body: body.body
        },
        include: { sender: true, channel: true }
      });

      return { message: toChatMessage(message) };
    } catch (error) {
      return sendSocialError(reply, error);
    }
  });
}

async function ensureDefaultGroups() {
  const groups = [];

  for (const [name, description] of defaultGroups) {
    const group = await prisma.group.findFirst({ where: { name } }) ?? await prisma.group.create({ data: { name, description } });
    groups.push(group);
  }

  return groups;
}

async function messagesForChannel(type: 'GLOBAL' | 'PRIVATE', name: string) {
  const channel = await prisma.chatChannel.findFirst({ where: { type, name } });
  if (!channel) return [];

  return prisma.chatMessage.findMany({
    where: { channelId: channel.id },
    include: { sender: true, channel: true },
    orderBy: { createdAt: 'desc' },
    take: 30
  });
}

async function findOrCreateChannel(type: 'GLOBAL' | 'PRIVATE', name: string) {
  return await prisma.chatChannel.findFirst({ where: { type, name } }) ?? await prisma.chatChannel.create({ data: { type, name } });
}

function privateChannelName(userId: string) {
  return `private:${userId}`;
}

function toCommunityUser(user: { id: string; username: string | null; displayName: string; stellarPublicKey: string | null; avatarUrl?: string | null }) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    wallet: user.stellarPublicKey ? `${user.stellarPublicKey.slice(0, 6)}...${user.stellarPublicKey.slice(-6)}` : 'No wallet',
    avatarUrl: user.avatarUrl ?? ''
  };
}

function toGroup(group: { id: string; name: string; description: string | null }) {
  return {
    id: group.id,
    name: group.name,
    description: group.description ?? ''
  };
}

function toReliefPost(post: {
  id: string;
  description: string;
  photoUrl: string | null;
  locationTag: string | null;
  targetAmountMinor: bigint | null;
  assetCode: string | null;
  createdAt: Date;
  author: { id: string; username: string | null; displayName: string; stellarPublicKey: string | null; avatarUrl?: string | null };
  pledges: Array<{ id: string; amountMinor: bigint; assetCode: string; userId: string }>;
}) {
  return {
    id: post.id,
    description: post.description,
    photoUrl: post.photoUrl ?? '',
    locationTag: post.locationTag ?? '',
    targetAmountMinor: post.targetAmountMinor?.toString() ?? '0',
    assetCode: post.assetCode ?? 'PHP',
    createdAt: post.createdAt.toISOString(),
    author: toCommunityUser(post.author),
    pledgeTotalMinor: post.pledges.reduce((total, pledge) => total + pledge.amountMinor, 0n).toString(),
    pledgeCount: post.pledges.length
  };
}

function toDiscussionPost(post: {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; username: string | null; displayName: string; stellarPublicKey: string | null; avatarUrl?: string | null };
  group: { id: string; name: string } | null;
  comments: Array<{ id: string }>;
}) {
  return {
    id: post.id,
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    author: toCommunityUser(post.author),
    group: post.group ? { id: post.group.id, name: post.group.name } : null,
    commentCount: post.comments.length
  };
}

function toChatMessage(message: {
  id: string;
  body: string;
  createdAt: Date;
  sender: { id: string; username: string | null; displayName: string; stellarPublicKey: string | null; avatarUrl?: string | null };
  channel: { type: string; name: string | null };
}) {
  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    channel: message.channel.type,
    sender: toCommunityUser(message.sender)
  };
}

function decimalToMinor(value: string) {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
}

function sendSocialError(reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
  }
  if (error instanceof z.ZodError) {
    return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid community request.' } });
  }
  return reply.code(500).send({ error: { code: 'SERVER_ERROR', message: 'Community service failed.' } });
}
