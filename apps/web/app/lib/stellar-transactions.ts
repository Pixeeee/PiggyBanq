'use client';

import { Asset, Keypair, Networks, TransactionBuilder, type Transaction } from '@stellar/stellar-sdk';
import type { StellarIntentView, StellarQuoteReview } from '@piggybanq/types/stellar-transactions';
import { parseStellarAmount } from '@piggybanq/stellar-core/amounts';

import { unlockWalletAccount } from '../(app)/dashboard/secure-wallet';

function parseTransaction(xdr: string): Transaction {
  try {
    const transaction = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    if (!('operations' in transaction)) throw new Error('Fee bump envelopes are not supported.');
    return transaction as Transaction;
  } catch {
    throw new Error('The transaction quote is not valid for Stellar Testnet.');
  }
}

function assetIdentity(asset: Asset) {
  return asset.isNative()
    ? { code: 'XLM' as const, issuer: null }
    : { code: asset.getCode(), issuer: asset.getIssuer() };
}

function assertAsset(asset: Asset, code: string, issuer: string | null) {
  const actual = assetIdentity(asset);
  if (actual.code !== code || actual.issuer !== issuer) throw new Error('The transaction asset does not match the review.');
}

function assertAmount(amount: string, expectedUnits: string, label: string) {
  if (parseStellarAmount(amount, { allowZero: true }).toString() !== expectedUnits) throw new Error(`${label} does not match the review.`);
}

function memoText(transaction: Transaction) {
  if (transaction.memo.type === 'none') return null;
  if (transaction.memo.type !== 'text') throw new Error('Only a text memo is supported.');
  return String(transaction.memo.value);
}

export type VerifiedStellarQuote = {
  transaction: Transaction;
  review: StellarQuoteReview;
  transactionHash: string;
};

export function decodeAndVerifyStellarQuote(quote: StellarIntentView): VerifiedStellarQuote {
  if (quote.network !== 'STELLAR_TESTNET' || quote.review.network !== 'Stellar Testnet') throw new Error('Only Stellar Testnet transactions are allowed.');
  if (quote.status !== 'AWAITING_SIGNATURE') throw new Error('This transaction is not awaiting a signature.');
  if (new Date(quote.expiresAt).getTime() <= Date.now()) throw new Error('This transaction quote has expired.');

  const transaction = parseTransaction(quote.unsignedXdr);
  if (transaction.signatures.length !== 0) throw new Error('The server quote must be unsigned.');
  if (transaction.operations.length !== 1) throw new Error('PiggyBanq only signs a single reviewed operation.');
  if (transaction.source !== quote.review.source) throw new Error('The transaction source does not match the review.');
  if (transaction.fee !== quote.review.feeStroops) throw new Error('The transaction fee does not match the review.');
  if (memoText(transaction) !== quote.review.memo) throw new Error('The transaction memo does not match the review.');
  if (!transaction.timeBounds || transaction.timeBounds.maxTime !== String(Math.floor(new Date(quote.review.expiresAt).getTime() / 1000))) {
    throw new Error('The transaction time bounds do not match the review.');
  }

  const operation = transaction.operations[0];
  if (quote.review.operationType === 'PAYMENT') {
    if (operation.type !== 'payment') throw new Error('The transaction operation does not match the payment review.');
    if (operation.destination !== quote.review.destination) throw new Error('The payment destination does not match the review.');
    assertAsset(operation.asset, quote.review.assetCode, quote.review.assetIssuer);
    assertAmount(operation.amount, quote.review.amountUnits, 'The payment amount');
  } else if (quote.review.operationType === 'CHANGE_TRUST') {
    if (operation.type !== 'changeTrust') throw new Error('The transaction operation does not match the trustline review.');
    if (!(operation.line instanceof Asset)) throw new Error('Only asset trustlines are supported.');
    assertAsset(operation.line, quote.review.assetCode, quote.review.assetIssuer);
    assertAmount(operation.limit, quote.review.amountUnits, 'The trustline limit');
  } else {
    if (operation.type !== 'pathPaymentStrictSend') throw new Error('The transaction operation does not match the swap review.');
    if (operation.destination !== quote.review.destination) throw new Error('The swap destination does not match the review.');
    assertAsset(operation.sendAsset, quote.review.assetCode, quote.review.assetIssuer);
    assertAmount(operation.sendAmount, quote.review.amountUnits, 'The swap send amount');
    if (!quote.review.destinationAssetCode || !quote.review.minimumDestinationUnits) throw new Error('The swap review is incomplete.');
    assertAsset(operation.destAsset, quote.review.destinationAssetCode, quote.review.destinationAssetIssuer);
    assertAmount(operation.destMin, quote.review.minimumDestinationUnits, 'The minimum received amount');
    if (operation.path.length !== quote.review.path.length) throw new Error('The swap path does not match the review.');
    operation.path.forEach((asset, index) => assertAsset(asset, quote.review.path[index].code, quote.review.path[index].issuer));
  }

  return { transaction, review: quote.review, transactionHash: transaction.hash().toString('hex') };
}

export async function signStellarTransaction(input: { username: string; password: string; quote: StellarIntentView }) {
  const verified = decodeAndVerifyStellarQuote(input.quote);
  const { account, vault } = await unlockWalletAccount(input.username, input.password);
  if (account.publicKey !== verified.review.source || vault.publicKey !== verified.review.source) {
    throw new Error('The unlocked PiggyBanq wallet does not match the transaction source.');
  }

  const transaction = parseTransaction(input.quote.unsignedXdr);
  const signer = Keypair.fromSecret(vault.secretKey);
  if (signer.publicKey() !== account.publicKey) throw new Error('The encrypted wallet signer does not match this account.');
  transaction.sign(signer);
  return { signedXdr: transaction.toXDR(), transactionHash: transaction.hash().toString('hex') };
}

