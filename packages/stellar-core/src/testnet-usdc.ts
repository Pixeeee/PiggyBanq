import { isValidStellarPublicKey } from './address.ts';
import { parseStellarAmount } from './amounts.ts';
import { STELLAR_TESTNET_ASSETS } from './assets.ts';
import { STELLAR_TESTNET_CONFIG } from './network.ts';

export const TESTNET_USDC_FAUCET_URL = 'https://faucet.circle.com/';
export type TestnetUsdcStatus = { status: 'UNFUNDED' | 'TRUSTLINE_REQUIRED' | 'UNAUTHORIZED' | 'FULL' | 'READY'; balance: string; issuer: string | null };
export const USDC_REQUEST_GUIDANCE = {
  UNFUNDED: 'Request test XLM first to activate your Stellar Testnet wallet.',
  TRUSTLINE_REQUIRED: 'Enable the official Testnet USDC trustline. Review its reserve and fee, then sign locally.',
  UNAUTHORIZED: 'This USDC trustline is not authorized. The faucet cannot make it usable.',
  FULL: 'Your USDC trustline has no receiving capacity. Use existing USDC for a swap or adjust its limit.',
  READY: 'Copy your public address, open Circle’s faucet, select Stellar Testnet and USDC, and submit your request there. Then check your USDC balance here.'
} as const;

export async function getTestnetUsdcStatus(address: string, options: { fetch?: typeof globalThis.fetch } = {}): Promise<TestnetUsdcStatus> {
  if (!isValidStellarPublicKey(address)) throw new Error('A valid Stellar public address is required.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const issuer = STELLAR_TESTNET_ASSETS.USDC.issuer;
  const result = (status: TestnetUsdcStatus['status'], balance = '0.0000000'): TestnetUsdcStatus => ({ status, balance, issuer });
  try {
    const url = `${STELLAR_TESTNET_CONFIG.horizonUrl}/accounts/${address}`;
    const init = { signal: controller.signal, credentials: 'omit' as const, redirect: 'error' as const };
    const response = await (options.fetch ?? globalThis.fetch)(url, init);
    if (response.url && response.url !== url) throw new Error('Unexpected Testnet redirect.');
    if (response.status === 404) return result('UNFUNDED');
    if (!response.ok) throw new Error('Stellar Testnet is unavailable. Try again later.');
    const data = await response.json();
    if (!data || data.account_id !== address || !Array.isArray(data.balances)) throw new Error('Invalid Testnet account.');
    const line = data.balances.find((entry: { asset_type?: string; asset_code?: string; asset_issuer?: string } | null) => entry?.asset_type === 'credit_alphanum4' && entry.asset_code === 'USDC' && entry.asset_issuer === issuer);
    if (!line) return result('TRUSTLINE_REQUIRED');
    for (const value of [line.balance,line.limit,line.buying_liabilities ?? '0.0000000']) if (typeof value !== 'string' || !/^\d+\.\d{7}$/.test(value)) throw new Error('Invalid Testnet USDC balance.');
    const balance = parseStellarAmount(line.balance,{allowZero:true});
    const capacity = parseStellarAmount(line.limit,{allowZero:true}) - balance - parseStellarAmount(line.buying_liabilities ?? '0',{allowZero:true});
    if (line.is_authorized !== true) return result('UNAUTHORIZED',line.balance);
    return result(capacity > 0n ? 'READY' : 'FULL',line.balance);
  } catch { throw new Error('Stellar Testnet USDC status is unavailable. Try again later.'); }
  finally { clearTimeout(timer); }
}
