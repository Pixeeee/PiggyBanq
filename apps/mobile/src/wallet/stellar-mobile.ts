import { Buffer } from 'buffer';
import { formatStellarAmount, parseStellarAmount } from '@piggybanq/stellar-core/amounts';

const HORIZON = 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const TRUSTLINE_LIMIT = '1000000.0000000';
const MAX_AMOUNT = 10000000000000n;
const MAX_FEE = 100000n;

export type MobileTransactionInput =
  | { kind: 'PAYMENT'; destination: string; amount: string; assetCode: 'XLM' | 'USDC'; memo?: string }
  | { kind: 'SWAP'; amount: string; assetCode: 'XLM' | 'USDC'; destinationAssetCode: 'XLM' | 'USDC'; slippageBps: number; memo?: string }
  | { kind: 'TRUSTLINE' };

export type MobileTransactionReview = {
  unsignedXdr: string;
  hash: string;
  source: string;
  destination: string;
  amount: string;
  assetCode: 'XLM' | 'USDC';
  issuer: string | null;
  feeStroops: string;
  expiresAt: string;
  kind: 'PAYMENT' | 'TRUSTLINE' | 'SWAP';
  memo: string | null;
  swap?: { destinationAssetCode: 'XLM' | 'USDC'; quotedAmount: string; minimumAmount: string; slippageBps: number; path: Array<'XLM' | 'USDC'> };
};

export type MobileLedger = {
  exists: boolean;
  xlm: string;
  usdc: string;
  usdcTrustline: boolean;
  activity: Array<{ id: string; description: string; hash: string; successful: boolean }>;
};

export type MobileTransactionResult = { status: 'SUCCESS' | 'FAILED' | 'UNKNOWN'; hash: string; message: string };

type JsonRecord = Record<string, unknown>;
type Balance = {
  asset_type: string; asset_code?: string; asset_issuer?: string;
  balance: string; limit?: string; is_authorized?: boolean;
  selling_liabilities?: string; buying_liabilities?: string;
};
type AccountRecord = {
  account_id: string; sequence: string; balances: Balance[]; subentry_count: number;
  num_sponsoring?: number; num_sponsored?: number;
};
type ClientOptions = { fetch?: typeof globalThis.fetch; now?: () => number; wait?: (milliseconds: number) => Promise<void> };

class HorizonRequestError extends Error {
  readonly status: number;
  readonly data: JsonRecord;
  constructor(status: number, data: JsonRecord) {
    super('Stellar Testnet is unavailable. Try again later.');
    this.status = status;
    this.data = data;
  }
}

function records(data: JsonRecord): JsonRecord[] {
  const embedded = data._embedded as { records?: JsonRecord[] } | undefined;
  if (!Array.isArray(embedded?.records)) throw new Error('Stellar Testnet returned an invalid response.');
  return embedded.records;
}

function nativeBalance(account: AccountRecord) {
  const balance = account.balances.find(line => line.asset_type === 'native');
  if (!balance) throw new Error('Stellar Testnet returned an invalid account balance.');
  return balance;
}

function usdcBalance(account: AccountRecord) {
  return account.balances.find(line => line.asset_code === 'USDC' && line.asset_issuer === USDC_ISSUER);
}

function units(value: string | undefined) {
  return parseStellarAmount(value ?? '0', { allowZero: true });
}

function requireUsdc(line: Balance | undefined, label: string): Balance {
  if (!line) throw new Error(`${label} needs the official Testnet USDC trustline.`);
  if (line.is_authorized !== true) throw new Error(`${label} USDC trustline is not authorized.`);
  return line;
}

function assertHash(hash: string) {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid Stellar transaction hash.');
}

function result(status: MobileTransactionResult['status'], hash: string, message: string): MobileTransactionResult {
  return { status, hash, message };
}

/** Dependencies allow the native network boundary and uncertain outcomes to be verified without moving funds. */
export function createMobileStellarClient(options: ClientOptions = {}) {
  const fetch = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const wait = options.wait ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));

  async function request(path: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}, timeout = 12000): Promise<JsonRecord> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(`${HORIZON}${path}`, { ...init, signal: controller.signal });
      const data = await response.json() as JsonRecord;
      if (!response.ok) throw new HorizonRequestError(response.status, data);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function publicKey(value: string, label = 'Account') {
    const { StrKey } = await import('@stellar/stellar-sdk');
    const normalized = value.trim().toUpperCase();
    if (!StrKey.isValidEd25519PublicKey(normalized)) throw new Error(`${label} must be a valid Stellar public key with a valid checksum.`);
    return normalized;
  }

  async function loadAccount(key: string): Promise<AccountRecord | null> {
    try {
      const data = await request(`/accounts/${key}`) as unknown as AccountRecord;
      if (data.account_id !== key || !Array.isArray(data.balances) || !/^\d+$/.test(data.sequence)) throw new Error('Stellar Testnet returned an invalid account.');
      return data;
    } catch (error) {
      if (error instanceof HorizonRequestError && error.status === 404) return null;
      throw error;
    }
  }

  async function fetchMobileLedger(key: string): Promise<MobileLedger> {
    const address = await publicKey(key);
    const account = await loadAccount(address);
    if (!account) return { exists: false, xlm: '0.0000000', usdc: '0.0000000', usdcTrustline: false, activity: [] };
    const usdc = usdcBalance(account);
    const payments = records(await request(`/accounts/${address}/payments?order=desc&limit=20`));
    const activity = payments.flatMap(entry => {
      const native = entry.asset_type === 'native' || entry.type === 'create_account';
      if (!native && !(entry.asset_code === 'USDC' && entry.asset_issuer === USDC_ISSUER)) return [];
      const amount = entry.type === 'create_account' ? entry.starting_balance : entry.amount;
      if (typeof amount !== 'string' || typeof entry.transaction_hash !== 'string') return [];
      const recipient = entry.type === 'create_account' ? entry.account : entry.to;
      const description = `${recipient === address ? 'Received' : 'Sent'} ${formatStellarAmount(units(amount))} ${native ? 'XLM' : 'USDC'}`;
      return [{ id: String(entry.id), description, hash: entry.transaction_hash, successful: entry.transaction_successful === true }];
    });
    return { exists: true, xlm: formatStellarAmount(units(nativeBalance(account).balance)), usdc: formatStellarAmount(units(usdc?.balance)), usdcTrustline: Boolean(usdc), activity };
  }

  async function prepareMobileTransaction(key: string, input: MobileTransactionInput): Promise<MobileTransactionReview> {
    const sdk = await import('@stellar/stellar-sdk');
    const source = await publicKey(key);
    if (!['PAYMENT', 'TRUSTLINE', 'SWAP'].includes(input.kind)) throw new Error('This transaction kind is unavailable.');
    const destination = input.kind === 'PAYMENT' ? await publicKey(input.destination, 'Destination') : source;
    const amount = input.kind !== 'TRUSTLINE' ? formatStellarAmount(parseStellarAmount(input.amount.trim(), { maxUnits: MAX_AMOUNT })) : TRUSTLINE_LIMIT;
    const assetCode = input.kind !== 'TRUSTLINE' ? input.assetCode : 'USDC';
    if (assetCode !== 'XLM' && assetCode !== 'USDC') throw new Error('This asset is unavailable on PiggyBanq Testnet.');
    const memo = input.kind !== 'TRUSTLINE' && input.memo ? input.memo : null;
    if (memo !== null && Buffer.byteLength(memo, 'utf8') > 28) throw new Error('Memo text must be at most 28 UTF-8 bytes.');
    const [account, ledgerData] = await Promise.all([loadAccount(source), request('/ledgers?order=desc&limit=1')]);
    if (!account) throw new Error('Fund this wallet on Stellar Testnet before sending or adding a trustline.');
    const ledger = records(ledgerData)[0];
    const fee = Number(ledger?.base_fee_in_stroops);
    const reserve = Number(ledger?.base_reserve_in_stroops);
    if (!Number.isSafeInteger(fee) || fee < 100 || BigInt(fee) > MAX_FEE || !Number.isSafeInteger(reserve) || reserve <= 0) throw new Error('Stellar Testnet returned an unsupported network fee or reserve.');
    const usdc = usdcBalance(account);
    const entries = Math.max(0, 2 + account.subentry_count + (account.num_sponsoring ?? 0) - (account.num_sponsored ?? 0) + (input.kind === 'TRUSTLINE' && !usdc ? 1 : 0));
    if (!Number.isSafeInteger(entries)) throw new Error('Stellar Testnet returned an invalid account reserve.');
    const native = nativeBalance(account);
    const nativeSpend = input.kind !== 'TRUSTLINE' && assetCode === 'XLM' ? units(amount) : 0n;
    const availableNative = units(native.balance) - units(native.selling_liabilities);
    if (availableNative < BigInt(entries) * BigInt(reserve) + BigInt(fee) + nativeSpend) throw new Error('Not enough spendable XLM after the account reserve and network fee.');
    if (input.kind === 'PAYMENT') {
      const recipient = await loadAccount(destination);
      if (!recipient) throw new Error('The destination does not exist on Stellar Testnet. Fund it before sending.');
      if (assetCode === 'USDC') {
        const sourceLine = requireUsdc(usdc, 'Your wallet');
        const destinationLine = requireUsdc(usdcBalance(recipient), 'The destination wallet');
        if (units(sourceLine.balance) - units(sourceLine.selling_liabilities) < units(amount)) throw new Error('Not enough spendable USDC.');
        if (units(destinationLine.limit) - units(destinationLine.balance) - units(destinationLine.buying_liabilities) < units(amount)) throw new Error('The destination USDC trustline has insufficient capacity.');
      }
    }
    const asset = assetCode === 'XLM' ? sdk.Asset.native() : new sdk.Asset('USDC', USDC_ISSUER);
    const supportedAsset = (entry: JsonRecord): 'XLM' | 'USDC' => {
      if (entry.asset_type === 'native') return 'XLM';
      if (entry.asset_type === 'credit_alphanum4' && entry.asset_code === 'USDC' && entry.asset_issuer === USDC_ISSUER) return 'USDC';
      throw new Error('Unsupported swap path asset.');
    };
    const sdkAsset = (code: 'XLM' | 'USDC') => code === 'XLM' ? sdk.Asset.native() : new sdk.Asset('USDC', USDC_ISSUER);
    let swap: MobileTransactionReview['swap'];
    if (input.kind === 'SWAP') {
      if (!['XLM', 'USDC'].includes(input.destinationAssetCode) || input.destinationAssetCode === assetCode || !Number.isInteger(input.slippageBps) || input.slippageBps < 1 || input.slippageBps > 500) throw new Error('Choose different supported assets and slippage between 0.01% and 5%.');
      const line = requireUsdc(usdc, 'Your wallet');
      if (assetCode === 'USDC' && units(line.balance) - units(line.selling_liabilities) < units(amount)) throw new Error('Not enough spendable USDC.');
      const sourceQuery = assetCode === 'XLM' ? 'source_asset_type=native' : `source_asset_type=credit_alphanum4&source_asset_code=USDC&source_asset_issuer=${USDC_ISSUER}`;
      const destinationAsset = input.destinationAssetCode === 'XLM' ? 'native' : `USDC:${USDC_ISSUER}`;
      const candidates = records(await request(`/paths/strict-send?${sourceQuery}&source_amount=${encodeURIComponent(amount)}&destination_assets=${encodeURIComponent(destinationAsset)}`)).flatMap(entry => {
        try {
          if (supportedAsset({ asset_type: entry.destination_asset_type, asset_code: entry.destination_asset_code, asset_issuer: entry.destination_asset_issuer }) !== input.destinationAssetCode ||
              supportedAsset({ asset_type: entry.source_asset_type, asset_code: entry.source_asset_code, asset_issuer: entry.source_asset_issuer }) !== assetCode ||
              typeof entry.source_amount !== 'string' || units(entry.source_amount) !== units(amount) || !Array.isArray(entry.path) || entry.path.length > 5 || typeof entry.destination_amount !== 'string') return [];
          const output = parseStellarAmount(entry.destination_amount, { maxUnits: MAX_AMOUNT });
          const minimum = output * BigInt(10000 - input.slippageBps) / 10000n;
          if (minimum <= 0n) return [];
          return [{ destinationAssetCode: input.destinationAssetCode, quotedAmount: formatStellarAmount(output), minimumAmount: formatStellarAmount(minimum), slippageBps: input.slippageBps, path: entry.path.map(item => supportedAsset(item as JsonRecord)) }];
        } catch { return []; }
      });
      swap = candidates.sort((a, b) => units(a.quotedAmount) > units(b.quotedAmount) ? -1 : 1)[0];
      if (!swap) throw new Error('No supported Testnet swap route is available. Nothing was signed. Try another amount or wait for liquidity.');
      if (input.destinationAssetCode === 'USDC' && units(line.limit) - units(line.balance) - units(line.buying_liabilities) < units(swap.quotedAmount)) throw new Error('Your USDC trustline has insufficient capacity for this swap.');
    }
    const expiresAt = new Date((Math.floor(now() / 1000) + 90) * 1000).toISOString();
    const operation = input.kind === 'SWAP' && swap
      ? sdk.Operation.pathPaymentStrictSend({ sendAsset: asset, sendAmount: amount, destination: source, destAsset: sdkAsset(swap.destinationAssetCode), destMin: swap.minimumAmount, path: swap.path.map(sdkAsset) })
      : input.kind === 'PAYMENT'
      ? sdk.Operation.payment({ destination, asset, amount })
      : sdk.Operation.changeTrust({ asset, limit: TRUSTLINE_LIMIT });
    let builder = new sdk.TransactionBuilder(new sdk.Account(source, account.sequence), {
      fee: String(fee), networkPassphrase: sdk.Networks.TESTNET, timebounds: { minTime: 0, maxTime: Math.floor(Date.parse(expiresAt) / 1000) }
    }).addOperation(operation);
    if (memo !== null) builder = builder.addMemo(sdk.Memo.text(memo));
    const transaction = builder.build();
    return { unsignedXdr: transaction.toXDR(), hash: Buffer.from(transaction.hash()).toString('hex'), source, destination, amount, assetCode, issuer: assetCode === 'USDC' ? USDC_ISSUER : null, feeStroops: transaction.fee, expiresAt, kind: input.kind, memo, ...(swap ? { swap } : {}) };
  }

  async function verifyReview(review: MobileTransactionReview) {
    const sdk = await import('@stellar/stellar-sdk');
    const mismatch = () => new Error('The transaction does not match its reviewed fields. Create a new review.');
    const expiry = Date.parse(review.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= now()) throw new Error('This transaction review has expired. Create a new review.');
    if (expiry > now() + 120000) throw mismatch();
    if (await publicKey(review.source) !== review.source || await publicKey(review.destination, 'Destination') !== review.destination) throw mismatch();
    assertHash(review.hash);
    const transaction = sdk.TransactionBuilder.fromXDR(review.unsignedXdr, sdk.Networks.TESTNET);
    if (!(transaction instanceof sdk.Transaction)) throw mismatch();
    if (transaction.operations.length !== 1 || transaction.signatures.length !== 0 || transaction.source !== review.source || Buffer.from(transaction.hash()).toString('hex') !== review.hash) throw mismatch();
    if (!/^\d+$/.test(review.feeStroops) || BigInt(review.feeStroops) < 100n || BigInt(review.feeStroops) > MAX_FEE || transaction.fee !== review.feeStroops) throw mismatch();
    if (!transaction.timeBounds || Number(transaction.timeBounds.minTime) !== 0 || Number(transaction.timeBounds.maxTime) * 1000 !== expiry) throw mismatch();
    if (review.amount !== formatStellarAmount(parseStellarAmount(review.amount, { maxUnits: MAX_AMOUNT }))) throw mismatch();
    const memo = transaction.memo.type === 'text' ? Buffer.from(transaction.memo.value as Uint8Array).toString('utf8') : null;
    if (!['none', 'text'].includes(transaction.memo.type) || memo !== review.memo || (memo !== null && Buffer.byteLength(memo, 'utf8') > 28)) throw mismatch();
    const operation = transaction.operations[0];
    if (operation.source !== undefined && operation.source !== review.source) throw mismatch();
    if (review.kind === 'PAYMENT' && operation.type === 'payment') {
      if (operation.destination !== review.destination || operation.amount !== review.amount) throw mismatch();
      if (review.assetCode === 'XLM') {
        if (!operation.asset.isNative() || review.issuer !== null) throw mismatch();
      } else if (review.assetCode !== 'USDC' || operation.asset.getCode() !== 'USDC' || operation.asset.getIssuer() !== USDC_ISSUER || review.issuer !== USDC_ISSUER) throw mismatch();
    } else if (review.kind === 'TRUSTLINE' && operation.type === 'changeTrust') {
      if (review.assetCode !== 'USDC' || review.issuer !== USDC_ISSUER || review.destination !== review.source || review.amount !== TRUSTLINE_LIMIT || operation.limit !== TRUSTLINE_LIMIT || !('getCode' in operation.line) || operation.line.getCode() !== 'USDC' || operation.line.getIssuer() !== USDC_ISSUER) throw mismatch();
    } else if (review.kind === 'SWAP' && operation.type === 'pathPaymentStrictSend') {
      const swap = review.swap;
      const matches = (asset: InstanceType<typeof sdk.Asset>, code: string) => code === 'XLM' ? asset.isNative() : code === 'USDC' && asset.getCode() === 'USDC' && asset.getIssuer() === USDC_ISSUER;
      if (!swap || review.destination !== review.source || operation.destination !== review.source || operation.sendAmount !== review.amount || !matches(operation.sendAsset, review.assetCode) ||
          review.issuer !== (review.assetCode === 'USDC' ? USDC_ISSUER : null) || swap.destinationAssetCode === review.assetCode || !matches(operation.destAsset, swap.destinationAssetCode) ||
          !Number.isInteger(swap.slippageBps) || swap.slippageBps < 1 || swap.slippageBps > 500 || !Array.isArray(swap.path) || swap.path.length > 5 || operation.path.length !== swap.path.length ||
          operation.path.some((asset, index) => !matches(asset, swap.path[index])) || operation.destMin !== swap.minimumAmount ||
          parseStellarAmount(swap.minimumAmount) !== parseStellarAmount(swap.quotedAmount) * BigInt(10000 - swap.slippageBps) / 10000n) throw mismatch();
    } else throw mismatch();
    return transaction;
  }

  function confirmed(data: JsonRecord, hash: string): MobileTransactionResult | null {
    if (data.hash !== hash || !Number.isSafeInteger(data.ledger ?? data.ledger_attr) || Number(data.ledger ?? data.ledger_attr) <= 0) return null;
    if (data.successful === true) return result('SUCCESS', hash, 'Confirmed on Stellar Testnet.');
    if (data.successful === false) return result('FAILED', hash, 'Stellar Testnet confirmed that this transaction failed.');
    return null;
  }

  async function reconcileMobileTransaction(hash: string, expiresAt?: string): Promise<MobileTransactionResult> {
    assertHash(hash);
    const expiry = expiresAt === undefined ? null : Date.parse(expiresAt);
    if (expiresAt !== undefined && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(expiresAt) || !Number.isFinite(expiry) || Number(expiry) <= 0)) {
      throw new Error('Invalid transaction review expiry.');
    }
    if (expiresAt !== undefined && new Date(Number(expiry)).toISOString().replace('.000Z', 'Z') !== expiresAt.replace('.000Z', 'Z')) {
      throw new Error('Invalid transaction review expiry.');
    }
    const deadline = now() + 60000;
    while (now() < deadline) {
      try {
        const found = confirmed(await request(`/transactions/${hash}`, {}, Math.min(4000, deadline - now())), hash);
        if (found) return found;
      } catch (error) {
        // Not found, transport failures, and timeouts cannot prove rejection.
        if (expiry !== null && error instanceof HorizonRequestError && error.status === 404 && now() < deadline) {
          try {
            const latest = records(await request('/ledgers?order=desc&limit=1', {}, Math.min(4000, deadline - now())))[0];
            const ingestedCloseTime = typeof latest?.closed_at === 'string' ? Date.parse(latest.closed_at) : NaN;
            if (Number.isFinite(ingestedCloseTime) && ingestedCloseTime >= expiry && now() < deadline) {
              // Recheck after the ingested ledger query; a preceding 404 can race ledger ingestion.
              try {
                const found = confirmed(await request(`/transactions/${hash}`, {}, Math.min(4000, deadline - now())), hash);
                if (found) return found;
              } catch (lookupError) {
                if (lookupError instanceof HorizonRequestError && lookupError.status === 404) {
                  return result('FAILED', hash, 'The reviewed transaction expired without appearing in Stellar Testnet after Horizon ingested its expiry ledger. No payment was confirmed.');
                }
              }
            }
          } catch {
            // A lagging or unavailable ledger cannot clear a potentially submitted payment.
          }
        }
      }
      const remaining = deadline - now();
      if (remaining > 0) await wait(Math.min(1000, remaining));
    }
    return result('UNKNOWN', hash, 'Confirmation is unresolved. Keep this transaction hash and check again before sending another payment.');
  }

  async function submitMobileTransaction(review: MobileTransactionReview, secretKey: string, onSigned?: (hash: string) => Promise<void>): Promise<MobileTransactionResult> {
    const transaction = await verifyReview(review);
    const { Keypair } = await import('@stellar/stellar-sdk');
    let signer;
    try {
      signer = Keypair.fromSecret(secretKey);
    } catch {
      throw new Error('The local signing key is invalid.');
    }
    if (signer.publicKey() !== review.source) throw new Error('The signer does not match the reviewed source wallet.');
    transaction.sign(signer);
    // Persist the identity before the first request: a killed app can reconcile without repeating the transfer.
    await onSigned?.(review.hash);
    try {
      const data = await request('/transactions', {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `tx=${encodeURIComponent(transaction.toXDR())}`
      }, 20000);
      const resolved = confirmed(data, review.hash);
      if (resolved) return resolved;
    } catch (error) {
      if (error instanceof HorizonRequestError && error.status === 400) {
        const extras = error.data.extras as { result_codes?: { transaction?: string; operations?: string[] } } | undefined;
        const code = extras?.result_codes?.transaction;
        if (code && code !== 'tx_bad_seq' && code !== 'tx_internal_error') return result('FAILED', review.hash, `Stellar Testnet rejected this transaction (${code}).`);
      }
    }
    return reconcileMobileTransaction(review.hash, review.expiresAt);
  }

  return { fetchMobileLedger, prepareMobileTransaction, submitMobileTransaction, reconcileMobileTransaction };
}

const client = createMobileStellarClient();
export const fetchMobileLedger = client.fetchMobileLedger;
export const prepareMobileTransaction = client.prepareMobileTransaction;
export const submitMobileTransaction = client.submitMobileTransaction;
export const reconcileMobileTransaction = client.reconcileMobileTransaction;
