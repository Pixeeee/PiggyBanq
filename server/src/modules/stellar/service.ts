import { createHash } from 'node:crypto';

import { Keypair, Networks, TransactionBuilder, type Transaction } from '@stellar/stellar-sdk';
import type { StellarTransactionIntent, User } from '@prisma/client';
import type { StellarCapabilities, StellarIntentView, StellarQuoteReview } from '@piggybanq/types/stellar-transactions';
import { formatStellarAmount, parseStellarAmount } from '@piggybanq/stellar-core/amounts';
import { resolveStellarAsset, type StellarAssetCode } from '@piggybanq/stellar-core/assets';

import type { StellarServerConfig } from '../../config.ts';
import { prisma } from '../../prisma.ts';
import { claimIntentForExecution, createQuotedIntent, findIntentForUser, recordSubmittedIntent, recordTerminalIntent } from './intent-store.ts';
import { StellarServiceError } from './errors.ts';
import { StellarHorizonAdapter } from './horizon-adapter.ts';
import type { StellarQuoteRequest } from './schemas.ts';

const BASE_RESERVE_UNITS = 5_000_000n;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string | Uint8Array) {
  return createHash('sha256').update(value).digest('hex');
}

function amountText(units: bigint) {
  return formatStellarAmount(units);
}

function minimumAfterSlippage(destinationUnits: bigint, slippageBps: number) {
  const result = destinationUnits * BigInt(10_000 - slippageBps) / 10_000n;
  if (result <= 0n) throw new StellarServiceError('NO_SWAP_PATH', 'The quoted swap output is too small.', 422);
  return result;
}

function requireWallet(user: Pick<User, 'stellarPublicKey'>): string {
  if (!user.stellarPublicKey) throw new StellarServiceError('ACCOUNT_NOT_FOUND', 'No Stellar wallet is linked to this account.', 409);
  return user.stellarPublicKey;
}

function requireSpendable(balance: { availableUnits: string }, amount: bigint, message: string) {
  if (BigInt(balance.availableUnits) < amount) throw new StellarServiceError('INVALID_TRANSACTION', message, 422);
}

function assertAuthorizedTrustline(balance: { trustline: boolean; authorized: boolean }, label: string) {
  if (!balance.trustline) throw new StellarServiceError('INVALID_TRANSACTION', `${label} needs the official Testnet USDC trustline.`, 422);
  if (!balance.authorized) throw new StellarServiceError('INVALID_TRANSACTION', `${label} USDC trustline is not authorized.`, 422);
}

function requireNativeSpendable(account: Extract<Awaited<ReturnType<StellarHorizonAdapter['loadAccountSummary']>>, { status: 'LIVE' }>, amount: bigint, additionalEntries = 0) {
  const reserveEntries = Math.max(0, 2 + account.subentryCount + account.sponsoringCount - account.sponsoredCount + additionalEntries);
  const spendableAfterReserve = BigInt(account.balances.XLM.availableUnits) - BigInt(reserveEntries) * BASE_RESERVE_UNITS;
  if (spendableAfterReserve < amount + 100_000n) {
    throw new StellarServiceError('INVALID_TRANSACTION', 'Not enough spendable XLM after the account reserve and maximum fee.', 422);
  }
}

export class StellarTransactionService {
  private readonly adapter: StellarHorizonAdapter;
  private readonly config: StellarServerConfig;

  constructor(
    adapter: StellarHorizonAdapter,
    config: StellarServerConfig
  ) {
    this.adapter = adapter;
    this.config = config;
  }

  capabilities(): StellarCapabilities {
    return {
      network: 'TESTNET',
      mode: 'LIVE_TESTNET',
      enabledAssets: ['XLM', 'USDC'],
      operations: ['PAYMENT', 'CHANGE_TRUST', 'PATH_PAYMENT_STRICT_SEND'],
      selfCustody: true,
      localSigning: true,
      yield: 'SIMULATION_ONLY',
      binance: 'DISABLED',
      cctp: 'DISABLED',
      mainnet: 'DISABLED',
      emergencyReadOnly: this.config.emergencyReadOnly
    };
  }

  async summary(user: Pick<User, 'stellarPublicKey'>) {
    const result = await this.adapter.loadAccountSummary(requireWallet(user));
    return result.status === 'NOT_FOUND'
      ? { ...result, network: 'TESTNET' as const }
      : { ...result, network: 'TESTNET' as const, refreshedAt: new Date().toISOString() };
  }

  async activity(user: Pick<User, 'stellarPublicKey'>, limit: number) {
    return { network: 'TESTNET' as const, records: await this.adapter.loadActivity(requireWallet(user), limit), refreshedAt: new Date().toISOString() };
  }

  async quote(user: Pick<User, 'id' | 'stellarPublicKey'>, idempotencyKey: string, request: StellarQuoteRequest): Promise<StellarIntentView> {
    if (this.config.emergencyReadOnly) throw new StellarServiceError('HORIZON_UNAVAILABLE', 'PiggyBanq is temporarily read-only. No transaction was created.', 503);
    const source = requireWallet(user);
    const requestHash = sha256(canonicalJson(request));
    const existing = await prisma.stellarTransactionIntent.findUnique({ where: { userId_idempotencyKey: { userId: user.id, idempotencyKey } } });
    if (existing) {
      if (existing.requestHash !== requestHash) throw new StellarServiceError('INVALID_TRANSACTION', 'That Idempotency-Key was already used for a different request.', 409);
      return this.intentView(existing);
    }

    const account = await this.adapter.loadAccountSummary(source);
    if (account.status !== 'LIVE') throw new StellarServiceError('ACCOUNT_NOT_FOUND', 'Fund this PiggyBanq wallet on Stellar Testnet before creating a transaction.', 409);

    let built;
    let review: StellarQuoteReview;
    if (request.operationType === 'PAYMENT') {
      const amount = parseStellarAmount(request.amount, { maxUnits: this.config.maxPaymentUnits });
      const sourceBalance = account.balances[request.assetCode];
      if (request.assetCode === 'USDC') assertAuthorizedTrustline(sourceBalance, 'Your wallet');
      if (request.assetCode === 'XLM') {
        requireNativeSpendable(account, amount);
      } else requireSpendable(sourceBalance, amount, 'Not enough spendable USDC.');

      const destination = await this.adapter.loadAccountSummary(request.destination);
      if (request.assetCode === 'USDC') {
        if (destination.status !== 'LIVE') throw new StellarServiceError('INVALID_TRANSACTION', 'The destination account does not exist on Stellar Testnet.', 422);
        assertAuthorizedTrustline(destination.balances.USDC, 'The destination wallet');
      } else if (destination.status === 'NOT_FOUND' && amount < 2n * BASE_RESERVE_UNITS) {
        throw new StellarServiceError('INVALID_TRANSACTION', 'Creating a destination account requires at least 1 XLM on Testnet.', 422);
      }
      built = await this.adapter.buildPayment({ source, destination: request.destination, assetCode: request.assetCode, amount: amountText(amount), memo: request.memo });
      const asset = resolveStellarAsset(request.assetCode);
      review = {
        network: 'Stellar Testnet', operationType: request.operationType, source, destination: request.destination,
        assetCode: request.assetCode, assetIssuer: asset.issuer, amountUnits: amount.toString(),
        destinationAssetCode: null, destinationAssetIssuer: null, minimumDestinationUnits: null,
        quotedDestinationUnits: null, path: [], feeStroops: built.feeStroops, memo: request.memo ?? null,
        expiresAt: built.expiresAt.toISOString()
      };
    } else if (request.operationType === 'CHANGE_TRUST') {
      const limit = parseStellarAmount(request.limit, { allowZero: true, maxUnits: this.config.maxTrustlineLimitUnits });
      if (limit === 0n && (BigInt(account.balances.USDC.balanceUnits) > 0n || BigInt(account.balances.USDC.buyingLiabilitiesUnits) > 0n || BigInt(account.balances.USDC.sellingLiabilitiesUnits) > 0n)) {
        throw new StellarServiceError('INVALID_TRANSACTION', 'The USDC trustline cannot be removed while it has a balance or liabilities.', 422);
      }
      requireNativeSpendable(account, 0n, account.balances.USDC.trustline ? 0 : 1);
      built = await this.adapter.buildChangeTrust({ source, assetCode: 'USDC', limit: amountText(limit), memo: request.memo });
      const asset = resolveStellarAsset('USDC');
      review = {
        network: 'Stellar Testnet', operationType: request.operationType, source, destination: null,
        assetCode: 'USDC', assetIssuer: asset.issuer, amountUnits: limit.toString(), destinationAssetCode: null,
        destinationAssetIssuer: null, minimumDestinationUnits: null, quotedDestinationUnits: null, path: [],
        feeStroops: built.feeStroops, memo: request.memo ?? null, expiresAt: built.expiresAt.toISOString()
      };
    } else {
      const sendAmount = parseStellarAmount(request.sendAmount, { maxUnits: this.config.maxSwapUnits });
      const sourceBalance = account.balances[request.sendAssetCode];
      const destinationBalance = account.balances[request.destinationAssetCode];
      if (request.sendAssetCode === 'USDC') assertAuthorizedTrustline(sourceBalance, 'Your wallet');
      if (request.destinationAssetCode === 'USDC') assertAuthorizedTrustline(destinationBalance, 'Your wallet');
      if (request.sendAssetCode === 'XLM') requireNativeSpendable(account, sendAmount);
      else requireSpendable(sourceBalance, sendAmount, `Not enough spendable ${request.sendAssetCode}.`);
      const pathQuote = await this.adapter.quoteStrictSend({ sendAssetCode: request.sendAssetCode, sendAmount: amountText(sendAmount), destinationAssetCode: request.destinationAssetCode });
      if (!pathQuote) throw new StellarServiceError('NO_SWAP_PATH', 'No live Stellar Testnet path is available for this swap.', 422);
      const quotedDestination = BigInt(pathQuote.destinationAmountUnits);
      const minimumDestination = minimumAfterSlippage(quotedDestination, request.slippageBps);
      built = await this.adapter.buildStrictSend({
        source, destination: source, sendAssetCode: request.sendAssetCode, sendAmount: amountText(sendAmount),
        destinationAssetCode: request.destinationAssetCode, destinationMinimum: amountText(minimumDestination), path: pathQuote.path,
        memo: request.memo
      });
      const sendAsset = resolveStellarAsset(request.sendAssetCode);
      const destinationAsset = resolveStellarAsset(request.destinationAssetCode);
      review = {
        network: 'Stellar Testnet', operationType: request.operationType, source, destination: source,
        assetCode: request.sendAssetCode, assetIssuer: sendAsset.issuer, amountUnits: sendAmount.toString(),
        destinationAssetCode: request.destinationAssetCode, destinationAssetIssuer: destinationAsset.issuer,
        minimumDestinationUnits: minimumDestination.toString(), quotedDestinationUnits: quotedDestination.toString(),
        path: pathQuote.path, feeStroops: built.feeStroops, memo: request.memo ?? null, expiresAt: built.expiresAt.toISOString()
      };
    }

    const unsigned = this.parseTransaction(built.unsignedXdr);
    const intent = await createQuotedIntent({
      userId: user.id,
      idempotencyKey,
      requestHash,
      operationType: request.operationType,
      sourcePublicKey: source,
      destinationPublicKey: review.destination,
      assetCode: review.assetCode,
      assetIssuer: review.assetIssuer,
      amountUnits: review.amountUnits,
      destinationAssetCode: review.destinationAssetCode,
      destinationAssetIssuer: review.destinationAssetIssuer,
      minimumDestinationUnits: review.minimumDestinationUnits,
      feeStroops: review.feeStroops,
      memo: review.memo,
      path: review.path,
      requestPayload: request,
      reviewPayload: review,
      policyResult: { passed: true, evaluatedAt: new Date().toISOString() },
      unsignedXdr: built.unsignedXdr,
      unsignedBodyHash: sha256(unsigned.signatureBase()),
      expiresAt: built.expiresAt
    });
    return this.intentView(intent);
  }

  async submit(user: Pick<User, 'id' | 'stellarPublicKey'>, intentId: string, signedXdr: string): Promise<StellarIntentView> {
    if (this.config.emergencyReadOnly) throw new StellarServiceError('HORIZON_UNAVAILABLE', 'PiggyBanq is temporarily read-only. The transaction was not submitted.', 503);
    const source = requireWallet(user);
    const intent = await findIntentForUser(intentId, user.id);
    if (!intent) throw new StellarServiceError('INVALID_TRANSACTION', 'Transaction intent was not found.', 404);
    if (['SUBMITTED', 'SUCCEEDED', 'FAILED', 'UNKNOWN'].includes(intent.status)) return this.intentView(intent);
    if (intent.expiresAt <= new Date()) {
      await claimIntentForExecution(intent.id, user.id);
      const expired = await findIntentForUser(intent.id, user.id);
      if (!expired) throw new StellarServiceError('INVALID_TRANSACTION', 'Transaction intent was not found.', 404);
      return this.intentView(expired);
    }

    const unsigned = this.parseTransaction(intent.unsignedXdr);
    const signed = this.parseTransaction(signedXdr);
    if (unsigned.source !== source || signed.source !== source || intent.sourcePublicKey !== source) {
      throw new StellarServiceError('INVALID_TRANSACTION', 'The transaction source does not match the authenticated wallet.', 403);
    }
    if (sha256(unsigned.signatureBase()) !== intent.unsignedBodyHash || !Buffer.from(unsigned.hash()).equals(Buffer.from(signed.hash()))) {
      throw new StellarServiceError('INVALID_TRANSACTION', 'The signed transaction does not match the reviewed quote.', 400);
    }
    const publicKey = Keypair.fromPublicKey(source);
    if (!signed.signatures.some((signature) => publicKey.verify(signed.hash(), signature.signature))) {
      throw new StellarServiceError('INVALID_TRANSACTION', 'The transaction is not signed by the authenticated wallet.', 401);
    }

    const claimed = await claimIntentForExecution(intent.id, user.id);
    if (!claimed) throw new StellarServiceError('INVALID_TRANSACTION', 'Transaction intent was not found.', 404);
    if (claimed.status !== 'EXECUTING') return this.intentView(claimed);

    const hash = Buffer.from(signed.hash()).toString('hex');
    await recordSubmittedIntent({ id: intent.id, userId: user.id, signedXdr, transactionHash: hash });
    const ledgerResult = await this.adapter.submit(signedXdr);
    const terminal = await recordTerminalIntent({
      id: intent.id,
      userId: user.id,
      status: ledgerResult.status === 'SUBMITTED' ? 'UNKNOWN' : ledgerResult.status,
      errorCode: ledgerResult.status === 'FAILED' ? 'TRANSACTION_REJECTED' : ledgerResult.status === 'UNKNOWN' ? 'TRANSACTION_UNKNOWN' : null,
      errorDetail: ledgerResult.resultCodes.join(', ') || null
    });
    if (!terminal) throw new StellarServiceError('TRANSACTION_UNKNOWN', 'The transaction state could not be persisted.', 503);
    return this.intentView(terminal);
  }

  async find(userId: string, intentId: string): Promise<StellarIntentView> {
    let intent = await findIntentForUser(intentId, userId);
    if (!intent) throw new StellarServiceError('INVALID_TRANSACTION', 'Transaction intent was not found.', 404);
    if (intent.status === 'SUBMITTED' || intent.status === 'UNKNOWN') {
      if (intent.transactionHash) {
        const result = await this.adapter.reconcile(intent.transactionHash);
        if (result.status === 'SUCCEEDED' || result.status === 'FAILED') {
          intent = await recordTerminalIntent({ id: intent.id, userId, status: result.status, errorCode: result.status === 'FAILED' ? 'TRANSACTION_REJECTED' : null }) ?? intent;
        }
      }
    }
    return this.intentView(intent);
  }

  private parseTransaction(xdr: string): Transaction {
    try {
      const transaction = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
      if (!('operations' in transaction)) throw new Error('Fee bump transactions are not supported.');
      return transaction as Transaction;
    } catch {
      throw new StellarServiceError('INVALID_TRANSACTION', 'Transaction XDR is invalid for Stellar Testnet.', 400);
    }
  }

  private intentView(intent: StellarTransactionIntent): StellarIntentView {
    return {
      id: intent.id,
      status: intent.status,
      network: 'STELLAR_TESTNET',
      unsignedXdr: intent.unsignedXdr,
      transactionHash: intent.transactionHash,
      error: intent.errorCode ? { code: intent.errorCode, message: intent.errorDetail || 'The transaction did not complete.' } : null,
      review: intent.reviewPayload as unknown as StellarQuoteReview,
      expiresAt: intent.expiresAt.toISOString(),
      createdAt: intent.createdAt.toISOString(),
      updatedAt: intent.updatedAt.toISOString()
    };
  }
}
