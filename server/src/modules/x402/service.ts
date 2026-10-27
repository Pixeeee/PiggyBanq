import { createHash } from 'node:crypto';
import { Prisma, type X402Payment } from '@prisma/client';
import { Keypair, Networks, rpc, TransactionBuilder } from '@stellar/stellar-sdk';
import { createEd25519Signer } from '@x402/stellar';
import { ExactStellarScheme } from '@x402/stellar/exact/facilitator';
import { assertX402Requirements, decodeX402Transfer, X402_ASSET, X402_NETWORK, X402_PRICE_UNITS,
  X402_DAILY_CAP_UNITS, X402_PAYMENT_CAP_UNITS, type X402Requirements } from '@piggybanq/stellar-core/x402';
import { prisma } from '../../prisma.ts';

export const X402_RPC_URL = 'https://soroban-testnet.stellar.org';
const reservedStatuses = ['APPROVED', 'SUBMITTING', 'UNKNOWN', 'SUCCEEDED'];
const digest = (text: string) => createHash('sha256').update(text).digest('hex');

export class X402Error extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode = 400) { super(message); this.statusCode = statusCode; }
}

function config() {
  if (process.env.STELLAR_X402_ENABLED !== 'true') throw new X402Error('Testnet x402 is not configured.', 503);
  if (process.env.STELLAR_EMERGENCY_READ_ONLY === 'true') throw new X402Error('PiggyBanq is temporarily read-only. The payment was not submitted.', 503);
  if ((process.env.STELLAR_NETWORK ?? 'TESTNET') !== 'TESTNET') throw new X402Error('Only Testnet is supported.', 503);
  const secret = process.env.STELLAR_X402_FACILITATOR_SECRET;
  const payTo = process.env.STELLAR_X402_PAY_TO;
  if (!secret || !payTo) throw new X402Error('Testnet merchant and facilitator must be configured.', 503);
  const facilitator = Keypair.fromSecret(secret).publicKey();
  if (facilitator === payTo) throw new X402Error('The merchant and facilitator must be separate accounts.', 503);
  return { secret, facilitator, payTo };
}

function requirements(row: X402Payment): X402Requirements {
  assertX402Requirements(row.requirements);
  return row.requirements;
}

export function x402View(row: X402Payment) {
  return { id: row.id, status: row.status, payer: row.payer, requirements: requirements(row),
    resource: { url: `${process.env.AUTH_APP_URL ?? 'http://127.0.0.1:3010'}/backend/api/x402/test/insight/${row.id}`,
      description: 'PiggyBanq test savings insight', mimeType: 'application/json' },
    expiresAt: row.expiresAt.toISOString(), receipt: row.receipt, errorCode: row.errorCode,
    limits: { perPaymentUnits: X402_PAYMENT_CAP_UNITS.toString(), rolling24HourUnits: X402_DAILY_CAP_UNITS.toString() } };
}

export class X402Service {
  // shortcut: one local facilitator process; use a shared facilitator before scaling API replicas.
  private settlementQueue: Promise<unknown> = Promise.resolve();
  private rpc: Pick<rpc.Server, 'getTransaction' | 'sendTransaction'>;

  constructor(client: Pick<rpc.Server, 'getTransaction' | 'sendTransaction'> = new rpc.Server(X402_RPC_URL)) {
    this.rpc = client;
  }

  async quote(user: { id: string; stellarPublicKey: string | null }, key: string) {
    const settings = config();
    if (!user.stellarPublicKey || user.stellarPublicKey === settings.payTo || user.stellarPublicKey === settings.facilitator) {
      throw new X402Error('Use your own Testnet wallet to purchase this resource.');
    }
    const where = { userId_idempotencyKey: { userId: user.id, idempotencyKey: key } };
    const existing = await prisma.x402Payment.findUnique({ where });
    if (existing) return existing;
    const paymentRequirements: X402Requirements = { scheme: 'exact', network: X402_NETWORK, asset: X402_ASSET,
      amount: X402_PRICE_UNITS, payTo: settings.payTo, maxTimeoutSeconds: 60, extra: { areFeesSponsored: true } };
    assertX402Requirements(paymentRequirements);
    try {
      return await prisma.x402Payment.create({ data: { userId: user.id, payer: user.stellarPublicKey,
        idempotencyKey: key, payTo: settings.payTo, amountUnits: BigInt(X402_PRICE_UNITS),
        requirements: paymentRequirements, expiresAt: new Date(Date.now() + 5 * 60_000) } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await prisma.x402Payment.findUnique({ where });
        if (duplicate) return duplicate;
      }
      throw error;
    }
  }

  async owned(userId: string, id: string) {
    const row = await prisma.x402Payment.findFirst({ where: { id, userId } });
    if (!row) throw new X402Error('Payment not found.', 404);
    if (row.expiresAt <= new Date() && ['AWAITING_APPROVAL', 'APPROVED'].includes(row.status)) {
      await prisma.x402Payment.updateMany({ where: { id, userId, status: { in: ['AWAITING_APPROVAL', 'APPROVED'] },
        expiresAt: { lte: new Date() } }, data: { status: 'EXPIRED' } });
      return prisma.x402Payment.findUniqueOrThrow({ where: { id } });
    }
    return row;
  }

  async cancel(userId: string, id: string) {
    await this.owned(userId, id);
    await prisma.x402Payment.updateMany({ where: { id, userId, status: { in: ['AWAITING_APPROVAL', 'APPROVED'] } },
      data: { status: 'CANCELLED' } });
    return this.owned(userId, id);
  }

  async approve(userId: string, id: string) {
    config();
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      const row = await tx.x402Payment.findFirst({ where: { id, userId } });
      if (!row) throw new X402Error('Payment not found.', 404);
      if (row.status !== 'AWAITING_APPROVAL') return row;
      if (row.expiresAt <= new Date()) throw new X402Error('Payment quote expired. Create a new quote.', 409);
      await tx.x402Payment.updateMany({ where: { userId, status: 'APPROVED', expiresAt: { lte: new Date() } },
        data: { status: 'EXPIRED' } });
      const used = await tx.x402Payment.aggregate({ where: { userId, status: { in: reservedStatuses },
        approvedAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } }, _sum: { amountUnits: true } });
      if ((used._sum.amountUnits ?? 0n) + row.amountUnits > X402_DAILY_CAP_UNITS) {
        throw new X402Error('The rolling 24-hour spending limit has been reached.', 429);
      }
      return tx.x402Payment.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date() } });
    });
  }

  async pay(userId: string, id: string, payload: { x402Version: 2; accepted: X402Requirements; payload: { transaction: string } }) {
    const settings = config();
    const row = await this.owned(userId, id);
    if (['SUCCEEDED', 'SUBMITTING', 'UNKNOWN'].includes(row.status)) return this.reconcile(row);
    if (row.status !== 'APPROVED' || row.expiresAt <= new Date()) throw new X402Error('A current, explicitly approved quote is required.', 409);
    const expected = requirements(row);
    assertX402Requirements(payload.accepted);
    if (payload.x402Version !== 2 || payload.accepted.payTo !== expected.payTo || payload.accepted.amount !== expected.amount) {
      throw new X402Error('Payment requirements do not match the approved quote.');
    }
    decodeX402Transfer(payload.payload.transaction, expected, row.payer);
    const base = createEd25519Signer(settings.secret, X402_NETWORK);
    const verifier = new ExactStellarScheme([base], { maxTransactionFeeStroops: 50_000 });
    const result = await verifier.verify(payload, expected);
    if (!result.isValid || result.payer !== row.payer) throw new X402Error('The signed payment could not be verified.');
    const hash = digest(payload.payload.transaction);
    try {
      const claimed = await prisma.x402Payment.updateMany({ where: { id, userId, status: 'APPROVED', expiresAt: { gt: new Date() } },
        data: { status: 'SUBMITTING', authorizationHash: hash, payload: payload as Prisma.InputJsonValue } });
      if (!claimed.count) return this.reconcile(await this.owned(userId, id));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new X402Error('This authorization has already been used.', 409);
      throw error;
    }
    const settle = async () => {
      const signer = { ...base, signTransaction: async (...args: Parameters<typeof base.signTransaction>) => {
        config();
        const signed = await base.signTransaction(...args);
        if (signed.error) throw new X402Error('The facilitator could not sign the settlement.');
        const transaction = TransactionBuilder.fromXDR(signed.signedTxXdr, Networks.TESTNET);
        decodeX402Transfer(signed.signedTxXdr, expected, row.payer);
        const saved = await prisma.x402Payment.updateMany({ where: { id, status: 'SUBMITTING', transactionHash: null }, data: {
          transactionHash: Buffer.from(transaction.hash()).toString('hex'), settlementXdr: signed.signedTxXdr
        } });
        if (saved.count !== 1) throw new X402Error('Settlement was already prepared.');
        config();
        return signed;
      } };
      try {
        config();
        const facilitator = new ExactStellarScheme([signer], { maxTransactionFeeStroops: 50_000 });
        await facilitator.settle(payload, expected);
      } catch {
        // A prepared hash may have reached Stellar; reconciliation decides the result.
      }
      const prepared = await this.owned(userId, id);
      if (!prepared.transactionHash) {
        return prisma.x402Payment.update({ where: { id }, data: { status: 'FAILED', errorCode: 'SETTLEMENT_NOT_PREPARED' } });
      }
      return this.reconcile(prepared);
    };
    const pending = this.settlementQueue.then(settle, settle);
    this.settlementQueue = pending.catch(() => undefined);
    return pending;
  }

  async reconcile(row: X402Payment) {
    if (row.status === 'SUCCEEDED' || row.status === 'FAILED') return row;
    const where = { id: row.id, status: { in: ['SUBMITTING', 'UNKNOWN'] } };
    if (!row.transactionHash || !row.settlementXdr) {
      if (row.status === 'SUBMITTING' && row.updatedAt.getTime() < Date.now() - 90_000) {
        await prisma.x402Payment.updateMany({ where: { ...where, transactionHash: null },
          data: { status: 'FAILED', errorCode: 'INTERRUPTED_BEFORE_SETTLEMENT' } });
      }
      return this.owned(row.userId, row.id);
    }
    try {
      const result = await this.rpc.getTransaction(row.transactionHash);
      if (result.status === 'SUCCESS') {
        const expected = requirements(row);
        const settled = decodeX402Transfer(result.envelopeXdr.toXDR('base64'), expected, row.payer);
        const original = decodeX402Transfer(row.settlementXdr, expected, row.payer);
        if (settled.authorization.toXdr('base64') !== original.authorization.toXdr('base64')
          || Buffer.from(settled.transaction.hash()).toString('hex') !== row.transactionHash) {
          throw new X402Error('The ledger receipt does not match this authorized payment.');
        }
        await prisma.x402Payment.updateMany({ where, data: { status: 'SUCCEEDED', errorCode: null,
          receipt: { success: true, verified: true, network: X402_NETWORK, transaction: row.transactionHash, ledger: result.ledger,
            payer: row.payer, payTo: row.payTo, asset: expected.asset, amount: row.amountUnits.toString(),
            verifiedAt: new Date().toISOString() } } });
        return this.owned(row.userId, row.id);
      }
      if (result.status === 'FAILED') {
        await prisma.x402Payment.updateMany({ where, data: { status: 'FAILED', errorCode: 'LEDGER_FAILED' } });
        return this.owned(row.userId, row.id);
      }
      const prepared = decodeX402Transfer(row.settlementXdr, requirements(row), row.payer).transaction;
      const maxTime = Number(prepared.timeBounds?.maxTime ?? 0);
      if (maxTime > 0 && result.latestLedgerCloseTime > maxTime
        && result.oldestLedgerCloseTime <= Math.floor(row.createdAt.getTime() / 1000)) {
        await prisma.x402Payment.updateMany({ where, data: { status: 'FAILED', errorCode: 'EXPIRED_WITHOUT_SETTLEMENT' } });
        return this.owned(row.userId, row.id);
      }
      if (maxTime > Date.now() / 1000) {
        config();
        // Re-broadcast the identical signed envelope; never create a second transfer.
        await this.rpc.sendTransaction(prepared);
      }
    } catch {
      // Never turn an RPC timeout or an unverifiable receipt into a successful payment.
    }
    await prisma.x402Payment.updateMany({ where, data: { status: 'UNKNOWN', errorCode: 'AWAITING_LEDGER_VERIFICATION' } });
    return this.owned(row.userId, row.id);
  }
}
