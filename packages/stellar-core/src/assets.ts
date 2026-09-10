export type StellarAssetCode = 'XLM' | 'USDC';

export type StellarAssetMetadata = Readonly<{
  code: StellarAssetCode;
  type: 'native' | 'credit_alphanum4';
  issuer: string | null;
  decimals: 7;
}>;

export const STELLAR_TESTNET_ASSETS: Readonly<Record<StellarAssetCode, StellarAssetMetadata>> = Object.freeze({
  XLM: Object.freeze({ code: 'XLM', type: 'native', issuer: null, decimals: 7 }),
  USDC: Object.freeze({
    code: 'USDC',
    type: 'credit_alphanum4',
    issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    decimals: 7
  })
});

export function resolveStellarAsset(code: string): StellarAssetMetadata {
  const normalized = code.toUpperCase() as StellarAssetCode;
  const asset = STELLAR_TESTNET_ASSETS[normalized];
  if (!asset) throw new Error(`${code || 'Asset'} is not enabled on PiggyBanq Stellar Testnet.`);
  return asset;
}
