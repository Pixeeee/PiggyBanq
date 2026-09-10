import { parseStellarAmount } from '@piggybanq/stellar-core/amounts';

export type StellarServerConfig = Readonly<{
  network: 'TESTNET';
  horizonUrl: string;
  friendbotUrl: string;
  friendbotEnabled: boolean;
  quoteTtlSeconds: number;
  maxPaymentUnits: bigint;
  maxSwapUnits: bigint;
  maxTrustlineLimitUnits: bigint;
  webOrigins: readonly string[];
  secureCookie: boolean;
  emergencyReadOnly: boolean;
}>;

type Environment = Record<string, string | undefined>;

function parseBoolean(name: string, value: string | undefined, fallback: boolean) {
  if (value === undefined || value === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false.`);
}

function parseBoundedInteger(name: string, value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function parseUrl(name: string, value: string, production: boolean) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:')) {
    throw new Error(`${name} must use ${production ? 'HTTPS' : 'HTTP or HTTPS'}.`);
  }
  return url.toString().replace(/\/$/, '');
}

export function loadStellarConfig(environment: Environment = process.env): StellarServerConfig {
  const network = environment.STELLAR_NETWORK ?? 'TESTNET';
  if (network !== 'TESTNET') throw new Error('PiggyBanq server supports Stellar Testnet only.');
  const allowedAuthNetworks = (environment.AUTH_ALLOWED_STELLAR_NETWORKS ?? 'TESTNET').split(',').map((value) => value.trim()).filter(Boolean);
  if (allowedAuthNetworks.length !== 1 || allowedAuthNetworks[0] !== 'TESTNET') throw new Error('AUTH_ALLOWED_STELLAR_NETWORKS must be TESTNET only.');

  const production = environment.NODE_ENV === 'production';
  const origins = (environment.AUTH_ALLOWED_ORIGINS ?? 'http://127.0.0.1:3010,http://localhost:3010')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (origins.length === 0) throw new Error('AUTH_ALLOWED_ORIGINS must include at least one web origin.');
  for (const origin of origins) parseUrl('AUTH_ALLOWED_ORIGINS', origin, production);

  return Object.freeze({
    network: 'TESTNET',
    horizonUrl: parseUrl('STELLAR_HORIZON_URL', environment.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org', production),
    friendbotUrl: parseUrl('STELLAR_FRIENDBOT_URL', environment.STELLAR_FRIENDBOT_URL ?? 'https://friendbot.stellar.org', production),
    friendbotEnabled: parseBoolean('STELLAR_FRIENDBOT_ENABLED', environment.STELLAR_FRIENDBOT_ENABLED, !production),
    quoteTtlSeconds: parseBoundedInteger('STELLAR_QUOTE_TTL_SECONDS', environment.STELLAR_QUOTE_TTL_SECONDS, 300, 30, 900),
    maxPaymentUnits: parseStellarAmount(environment.STELLAR_MAX_PAYMENT_AMOUNT ?? '1000000'),
    maxSwapUnits: parseStellarAmount(environment.STELLAR_MAX_SWAP_AMOUNT ?? '100000'),
    maxTrustlineLimitUnits: parseStellarAmount(environment.STELLAR_MAX_TRUSTLINE_LIMIT ?? '1000000'),
    webOrigins: Object.freeze(origins),
    secureCookie: production,
    emergencyReadOnly: parseBoolean('STELLAR_EMERGENCY_READ_ONLY', environment.STELLAR_EMERGENCY_READ_ONLY, false)
  });
}
