import {
  Asset,
  Horizon,
  Memo,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
  type Transaction
} from '@stellar/stellar-sdk';
import { formatStellarAmount, parseStellarAmount } from '@piggybanq/stellar-core/amounts';
import { resolveStellarAsset, type StellarAssetCode } from '@piggybanq/stellar-core/assets';

import type { StellarServerConfig } from '../../config.ts';
import { horizonStatus, stellarResultCodes, StellarServiceError, toStellarServiceError } from './errors.ts';

type AdapterOptions = {
  server?: Horizon.Server;
  now?: () => Date;
};

export type NormalizedBalance = {
  assetCode: StellarAssetCode;
  issuer: string | null;
  balanceUnits: string;
  buyingLiabilitiesUnits: string;
  sellingLiabilitiesUnits: string;
  availableUnits: string;
  trustline: boolean;
  authorized: boolean;
  limitUnits: string | null;
};

export type AccountSummary =
  | { status: 'NOT_FOUND'; publicKey: string; balances: null }
  | {
      status: 'LIVE';
      publicKey: string;
      sequence: string;
      subentryCount: number;
      sponsoringCount: number;
      sponsoredCount: number;
      balances: Record<StellarAssetCode, NormalizedBalance>;
    };

export type StellarActivity = {
  id: string;
  type: string;
  direction: 'IN' | 'OUT' | 'SELF';
  source: string | null;
  destination: string | null;
  assetCode: StellarAssetCode;
  assetIssuer: string | null;
  amountUnits: string;
  transactionHash: string;
  successful: boolean;
  createdAt: string;
};

export type StrictSendQuote = {
  sendAssetCode: StellarAssetCode;
  sendAmountUnits: string;
  destinationAssetCode: StellarAssetCode;
  destinationAmountUnits: string;
  path: Array<{ code: StellarAssetCode; issuer: string | null }>;
};

export type BuiltTransaction = {
  unsignedXdr: string;
  feeStroops: string;
  expiresAt: Date;
};

export type LedgerResult = {
  status: 'SUBMITTED' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';
  transactionHash: string;
  ledger: number | null;
  resultCodes: readonly string[];
};

function sdkAsset(code: StellarAssetCode) {
  const metadata = resolveStellarAsset(code);
  return metadata.type === 'native' ? Asset.native() : new Asset(metadata.code, metadata.issuer!);
}

function normalizeUnits(value: string) {
  return parseStellarAmount(value, { allowZero: true }).toString();
}

function subtractUnits(balance: string, liabilities: string) {
  const result = BigInt(normalizeUnits(balance)) - BigInt(normalizeUnits(liabilities));
  return (result > 0n ? result : 0n).toString();
}

function isOfficialUsdc(line: Record<string, unknown>) {
  const usdc = resolveStellarAsset('USDC');
  return line.asset_code === usdc.code && line.asset_issuer === usdc.issuer;
}

function pathAsset(record: Record<string, unknown>): { code: StellarAssetCode; issuer: string | null } {
  if (record.asset_type === 'native') return { code: 'XLM', issuer: null };
  if (record.asset_code === 'USDC' && record.asset_issuer === resolveStellarAsset('USDC').issuer) {
    return { code: 'USDC', issuer: resolveStellarAsset('USDC').issuer };
  }
  throw new StellarServiceError('NO_SWAP_PATH', 'The path contains an asset that PiggyBanq does not support.', 422);
}

function assertPublicKey(value: string, label: string) {
  if (!StrKey.isValidEd25519PublicKey(value)) throw new StellarServiceError('INVALID_TRANSACTION', `${label} is not a valid Stellar public key.`, 400);
}

function transactionHash(transaction: Transaction) {
  return transaction.hash().toString('hex');
}

export class StellarHorizonAdapter {
  private readonly config: StellarServerConfig;
  private readonly server: Horizon.Server;
  private readonly now: () => Date;

  constructor(config: StellarServerConfig, options: AdapterOptions = {}) {
    this.config = config;
    this.server = options.server ?? new Horizon.Server(config.horizonUrl, { allowHttp: config.horizonUrl.startsWith('http:') });
    this.now = options.now ?? (() => new Date());
  }

  async loadAccountSummary(publicKey: string): Promise<AccountSummary> {
    assertPublicKey(publicKey, 'Account');
    try {
      const account = await this.server.loadAccount(publicKey);
      const native = account.balances.find((line) => line.asset_type === 'native') as Record<string, unknown> | undefined;
      const usdc = account.balances.find((line) => isOfficialUsdc(line as unknown as Record<string, unknown>)) as Record<string, unknown> | undefined;
      const empty = '0.0000000';
      const normalizeBalance = (code: StellarAssetCode, line: Record<string, unknown> | undefined): NormalizedBalance => {
        const balance = typeof line?.balance === 'string' ? line.balance : empty;
        const buying = typeof line?.buying_liabilities === 'string' ? line.buying_liabilities : empty;
        const selling = typeof line?.selling_liabilities === 'string' ? line.selling_liabilities : empty;
        const metadata = resolveStellarAsset(code);
        return {
          assetCode: code,
          issuer: metadata.issuer,
          balanceUnits: normalizeUnits(balance),
          buyingLiabilitiesUnits: normalizeUnits(buying),
          sellingLiabilitiesUnits: normalizeUnits(selling),
          availableUnits: subtractUnits(balance, selling),
          trustline: code === 'XLM' || Boolean(line),
          authorized: code === 'XLM' || line?.is_authorized === true,
          limitUnits: typeof line?.limit === 'string' ? normalizeUnits(line.limit) : null
        };
      };
      return {
        status: 'LIVE',
        publicKey,
        sequence: account.sequenceNumber(),
        subentryCount: account.subentry_count,
        sponsoringCount: account.num_sponsoring,
        sponsoredCount: account.num_sponsored,
        balances: { XLM: normalizeBalance('XLM', native), USDC: normalizeBalance('USDC', usdc) }
      };
    } catch (error) {
      if (horizonStatus(error) === 404) return { status: 'NOT_FOUND', publicKey, balances: null };
      throw toStellarServiceError(error);
    }
  }

  async loadActivity(publicKey: string, limit = 20): Promise<StellarActivity[]> {
    assertPublicKey(publicKey, 'Account');
    const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
    try {
      const page = await this.server.payments().forAccount(publicKey).order('desc').limit(boundedLimit).call();
      return page.records.flatMap((entry) => {
        const record = entry as unknown as Record<string, unknown>;
        const amount = typeof record.amount === 'string' ? record.amount : typeof record.starting_balance === 'string' ? record.starting_balance : null;
        if (!amount) return [];
        let assetCode: StellarAssetCode;
        let assetIssuer: string | null;
        if (record.asset_type === 'native' || record.type === 'create_account') {
          assetCode = 'XLM';
          assetIssuer = null;
        } else if (record.asset_code === 'USDC' && record.asset_issuer === resolveStellarAsset('USDC').issuer) {
          assetCode = 'USDC';
          assetIssuer = resolveStellarAsset('USDC').issuer;
        } else return [];
        const source = typeof record.from === 'string' ? record.from : typeof record.funder === 'string' ? record.funder : null;
        const destination = typeof record.to === 'string' ? record.to : typeof record.account === 'string' ? record.account : null;
        return [{
          id: String(record.id ?? record.paging_token ?? ''),
          type: String(record.type ?? 'payment'),
          direction: source === publicKey && destination === publicKey ? 'SELF' : destination === publicKey ? 'IN' : 'OUT',
          source,
          destination,
          assetCode,
          assetIssuer,
          amountUnits: normalizeUnits(amount),
          transactionHash: String(record.transaction_hash ?? ''),
          successful: record.transaction_successful !== false,
          createdAt: String(record.created_at ?? '')
        } satisfies StellarActivity];
      });
    } catch (error) {
      if (horizonStatus(error) === 404) return [];
      throw toStellarServiceError(error);
    }
  }

  async quoteStrictSend(input: { sendAssetCode: StellarAssetCode; sendAmount: string; destinationAssetCode: StellarAssetCode }): Promise<StrictSendQuote | null> {
    const sendAmountUnits = parseStellarAmount(input.sendAmount, { maxUnits: this.config.maxSwapUnits });
    try {
      const page = await this.server.strictSendPaths(sdkAsset(input.sendAssetCode), formatStellarAmount(sendAmountUnits), [sdkAsset(input.destinationAssetCode)]).call();
      const supported = page.records.flatMap((entry) => {
        try {
          const record = entry as unknown as Record<string, unknown>;
          const destination = pathAsset({ asset_type: record.destination_asset_type, asset_code: record.destination_asset_code, asset_issuer: record.destination_asset_issuer });
          if (destination.code !== input.destinationAssetCode || !Array.isArray(record.path) || typeof record.destination_amount !== 'string') return [];
          return [{
            sendAssetCode: input.sendAssetCode,
            sendAmountUnits: sendAmountUnits.toString(),
            destinationAssetCode: destination.code,
            destinationAmountUnits: normalizeUnits(record.destination_amount),
            path: record.path.map((item) => pathAsset(item as Record<string, unknown>))
          } satisfies StrictSendQuote];
        } catch {
          return [];
        }
      });
      return supported.sort((a, b) => BigInt(a.destinationAmountUnits) > BigInt(b.destinationAmountUnits) ? -1 : 1)[0] ?? null;
    } catch (error) {
      throw toStellarServiceError(error);
    }
  }

  async recommendedFee() {
    try {
      const stats = await this.server.feeStats();
      const candidate = Number(stats.fee_charged.p90);
      return String(Number.isSafeInteger(candidate) ? Math.max(100, Math.min(100_000, candidate)) : 100);
    } catch (error) {
      throw toStellarServiceError(error);
    }
  }

  async buildPayment(input: { source: string; destination: string; assetCode: StellarAssetCode; amount: string; memo?: string }): Promise<BuiltTransaction> {
    assertPublicKey(input.source, 'Source account');
    assertPublicKey(input.destination, 'Destination');
    const amount = formatStellarAmount(parseStellarAmount(input.amount, { maxUnits: this.config.maxPaymentUnits }));
    return this.build(input.source, Operation.payment({ destination: input.destination, asset: sdkAsset(input.assetCode), amount }), input.memo);
  }

  async buildChangeTrust(input: { source: string; assetCode: 'USDC'; limit: string; memo?: string }): Promise<BuiltTransaction> {
    assertPublicKey(input.source, 'Source account');
    const limit = formatStellarAmount(parseStellarAmount(input.limit, { allowZero: true, maxUnits: this.config.maxTrustlineLimitUnits }));
    return this.build(input.source, Operation.changeTrust({ asset: sdkAsset(input.assetCode), limit }), input.memo);
  }

  async buildStrictSend(input: { source: string; destination: string; sendAssetCode: StellarAssetCode; sendAmount: string; destinationAssetCode: StellarAssetCode; destinationMinimum: string; path: Array<{ code: StellarAssetCode }> ; memo?: string }): Promise<BuiltTransaction> {
    assertPublicKey(input.source, 'Source account');
    assertPublicKey(input.destination, 'Destination');
    const sendAmount = formatStellarAmount(parseStellarAmount(input.sendAmount, { maxUnits: this.config.maxSwapUnits }));
    const destinationMinimum = formatStellarAmount(parseStellarAmount(input.destinationMinimum));
    return this.build(input.source, Operation.pathPaymentStrictSend({
      sendAsset: sdkAsset(input.sendAssetCode),
      sendAmount,
      destination: input.destination,
      destAsset: sdkAsset(input.destinationAssetCode),
      destMin: destinationMinimum,
      path: input.path.map((asset) => sdkAsset(asset.code))
    }), input.memo);
  }

  async submit(signedXdr: string): Promise<LedgerResult> {
    let transaction: Transaction;
    try {
      const parsed = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
      if (!('hash' in parsed)) throw new Error('Unsupported transaction envelope.');
      transaction = parsed as Transaction;
    } catch {
      throw new StellarServiceError('INVALID_TRANSACTION', 'The signed Stellar transaction is invalid.', 400);
    }
    const hash = transactionHash(transaction);
    try {
      const response = await this.server.submitTransaction(transaction);
      return { status: response.successful === false ? 'FAILED' : response.successful === true ? 'SUCCEEDED' : 'SUBMITTED', transactionHash: response.hash || hash, ledger: response.ledger ?? null, resultCodes: [] };
    } catch (error) {
      const codes = stellarResultCodes(error);
      if (codes.includes('tx_bad_seq')) return this.reconcile(hash);
      if (horizonStatus(error) === 400) return { status: 'FAILED', transactionHash: hash, ledger: null, resultCodes: codes };
      return { status: 'UNKNOWN', transactionHash: hash, ledger: null, resultCodes: [] };
    }
  }

  async reconcile(hash: string): Promise<LedgerResult> {
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new StellarServiceError('INVALID_TRANSACTION', 'Transaction hash is invalid.', 400);
    try {
      const transaction = await this.server.transactions().transaction(hash).call();
      return { status: transaction.successful ? 'SUCCEEDED' : 'FAILED', transactionHash: transaction.hash, ledger: transaction.ledger_attr ?? null, resultCodes: [] };
    } catch (error) {
      if (horizonStatus(error) === 404) return { status: 'UNKNOWN', transactionHash: hash, ledger: null, resultCodes: [] };
      throw toStellarServiceError(error);
    }
  }

  private async build(source: string, operation: Parameters<TransactionBuilder['addOperation']>[0], memo?: string): Promise<BuiltTransaction> {
    if (memo !== undefined && Buffer.byteLength(memo, 'utf8') > 28) throw new StellarServiceError('INVALID_TRANSACTION', 'Memo text must be at most 28 bytes.', 400);
    try {
      const [account, feeStroops] = await Promise.all([this.server.loadAccount(source), this.recommendedFee()]);
      const expiresAt = new Date(this.now().getTime() + this.config.quoteTtlSeconds * 1000);
      let builder = new TransactionBuilder(account, {
        fee: feeStroops,
        networkPassphrase: Networks.TESTNET,
        timebounds: { minTime: 0, maxTime: Math.floor(expiresAt.getTime() / 1000) }
      }).addOperation(operation);
      if (memo) builder = builder.addMemo(Memo.text(memo));
      return { unsignedXdr: builder.build().toXDR(), feeStroops, expiresAt };
    } catch (error) {
      throw toStellarServiceError(error);
    }
  }
}
