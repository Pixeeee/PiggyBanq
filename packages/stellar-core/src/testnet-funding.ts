import { isValidStellarPublicKey } from './address.ts';
import { parseStellarAmount } from './amounts.ts';
import { STELLAR_TESTNET_CONFIG } from './network.ts';

export type TestnetFundingResult = { status: 'FUNDED' | 'ALREADY_FUNDED'; balance: string };
type Options = { fetch?: typeof globalThis.fetch; wait?: (ms: number) => Promise<void> };
const pending = new Map<string, Promise<TestnetFundingResult>>();

/** Friendbot receives only the public address. Network endpoints cannot be caller-selected. */
export function requestTestnetXlm(address: string, options: Options = {}): Promise<TestnetFundingResult> {
  if (!isValidStellarPublicKey(address)) return Promise.reject(new Error('A valid Stellar public address is required.'));
  const existing = pending.get(address);
  if (existing) return existing;
  const task = fund(address, options).finally(() => pending.delete(address));
  pending.set(address, task);
  return task;
}

async function fund(address: string, options: Options): Promise<TestnetFundingResult> {
  const fetcher = options.fetch ?? globalThis.fetch;
  const wait = options.wait ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const deadline = Date.now() + 45000;
  async function request(url: string, readJson = false) {
    if (Date.now() >= deadline) throw new Error('Testnet funding timed out. Refresh your balance before requesting again.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(30000, deadline - Date.now()));
    try {
      const init = { signal: controller.signal, credentials: 'omit' as const, redirect: 'error' as const };
      const response = await fetcher(url, init);
      if (response.url && response.url !== url) throw new Error('Unexpected Testnet redirect.');
      const data = readJson && response.ok ? await response.json() : null;
      return { response, data };
    }
    catch { throw new Error('Stellar Testnet is unavailable. Refresh your balance before requesting again.'); }
    finally { clearTimeout(timer); }
  }
  async function balance(): Promise<string | null> {
    const { response, data } = await request(`${STELLAR_TESTNET_CONFIG.horizonUrl}/accounts/${address}`, true);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Stellar Testnet is unavailable. Try again later.');
    if (!data || data.account_id !== address || !Array.isArray(data.balances)) throw new Error('Stellar Testnet returned an invalid balance.');
    const native = data.balances.find((line: { asset_type: string } | null) => line?.asset_type === 'native');
    if (data.account_id !== address || typeof native?.balance !== 'string' || !/^\d+\.\d{7}$/.test(native.balance)) throw new Error('Stellar Testnet returned an invalid balance.');
    parseStellarAmount(native.balance, { allowZero: true });
    return native.balance;
  }
  const before = await balance();
  const faucet = `${STELLAR_TESTNET_CONFIG.friendbotUrl}/?addr=${encodeURIComponent(address)}`;
  const { response } = await request(faucet);
  if (response.status === 429) throw new Error('Friendbot request limit reached. Try again later.');
  if (!response.ok && response.status !== 400) throw new Error('Friendbot is unavailable. Try again later.');
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt) await wait(1500);
    const after = await balance();
    if (after !== null && parseStellarAmount(after, { allowZero: true }) > parseStellarAmount(before ?? '0', { allowZero: true })) return { status: 'FUNDED', balance: after };
    if (response.status === 400) {
      if (after !== null && parseStellarAmount(after, { allowZero: true }) > 0n) return { status: 'ALREADY_FUNDED', balance: after };
      throw new Error('Friendbot could not fund this account. Try again later.');
    }
  }
  throw new Error('Funding is not confirmed yet. Refresh your balance before requesting again.');
}
