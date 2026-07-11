import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { Keypair, Networks } from '@stellar/stellar-sdk';
import { z } from 'zod';

export const AUTH_COOKIE_NAME = process.env.AUTH_SESSION_COOKIE_NAME ?? 'piggybanq_wallet_session';
export const AUTH_PURPOSES = ['SIGN_UP', 'LOGIN'] as const;
export const AUTH_NETWORKS = ['TESTNET', 'PUBLIC'] as const;

export type AuthPurpose = (typeof AUTH_PURPOSES)[number];
export type AuthNetwork = (typeof AUTH_NETWORKS)[number];

export type SafeUser = {
  id: string;
  username: string | null;
  stellarPublicKey: string | null;
  displayName: string;
  email: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
};

export const stellarPublicKeySchema = z.string().trim().min(56).max(56).refine((value) => isValidStellarPublicKey(value), {
  message: 'Invalid Stellar public key.'
});
export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/, 'Username must be 3-24 characters and use lowercase letters, numbers, or underscores.');
export const purposeSchema = z.enum(AUTH_PURPOSES);
export const networkSchema = z.enum(AUTH_NETWORKS);

export function normalizeStellarPublicKey(publicKey: string) {
  const parsed = stellarPublicKeySchema.parse(publicKey);
  return parsed.trim().toUpperCase();
}

export function normalizeUsername(username: string) {
  return usernameSchema.parse(username);
}

export function isValidStellarPublicKey(publicKey: string) {
  try {
    Keypair.fromPublicKey(publicKey.trim().toUpperCase());
    return true;
  } catch {
    return false;
  }
}

export function getAuthConfig() {
  const applicationName = process.env.AUTH_APP_NAME ?? 'PiggyBanq';
  const applicationUrl = process.env.AUTH_APP_URL ?? 'http://127.0.0.1:3010';
  const domain = process.env.AUTH_DOMAIN ?? new URL(applicationUrl).host;
  const allowedNetworks = (process.env.AUTH_ALLOWED_STELLAR_NETWORKS ?? 'TESTNET')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is AuthNetwork => AUTH_NETWORKS.includes(value as AuthNetwork));
  const challengeTtlMs = Number(process.env.AUTH_CHALLENGE_TTL_SECONDS ?? 300) * 1000;
  const sessionTtlMs = Number(process.env.AUTH_SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7) * 1000;

  return {
    applicationName,
    applicationUrl,
    domain,
    allowedNetworks,
    challengeTtlMs,
    sessionTtlMs,
    secureCookie: process.env.NODE_ENV === 'production'
  };
}

export function assertAllowedNetwork(network: AuthNetwork) {
  const config = getAuthConfig();
  if (!config.allowedNetworks.includes(network)) {
    throw new AuthError('UNSUPPORTED_NETWORK', 'Unsupported Stellar network.');
  }
}

export function resolveNetworkPassphrase(network: AuthNetwork) {
  return network === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET;
}

export function createNonce() {
  return randomBytes(24).toString('base64url');
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function safeHashEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function buildAuthMessage({
  publicKey,
  purpose,
  network,
  nonce,
  issuedAt,
  expiresAt
}: {
  publicKey: string;
  purpose: AuthPurpose;
  network: AuthNetwork;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
}) {
  const config = getAuthConfig();
  const purposeLabel = purpose === 'SIGN_UP' ? 'Sign-up authentication' : 'Login authentication';
  const networkPassphrase = resolveNetworkPassphrase(network);

  return `${config.domain} wants you to sign in with your Stellar account:
${publicKey}

Signing this message proves ownership of your Stellar wallet. This action will not create a blockchain transaction or charge a fee.

URI: ${config.applicationUrl}
Version: 1
Stellar Network: ${network}
Network Passphrase: ${networkPassphrase}
Nonce: ${nonce}
Issued At: ${issuedAt.toISOString()}
Expiration Time: ${expiresAt.toISOString()}
Purpose: ${purposeLabel}
Application: ${config.applicationName}`;
}

export function verifyStellarSignature(message: string, signature: string, publicKey: string) {
  try {
    const keypair = Keypair.fromPublicKey(publicKey);
    const signatureBytes = Buffer.from(signature, 'base64');
    return keypair.verify(Buffer.from(message, 'utf8'), signatureBytes);
  } catch {
    return false;
  }
}

export function toSafeUser(user: {
  id: string;
  username: string | null;
  stellarPublicKey: string | null;
  displayName: string;
  email: string | null;
  role: string;
  status: string;
  lastLoginAt: Date | null;
}): SafeUser {
  return {
    id: user.id,
    username: user.username,
    stellarPublicKey: user.stellarPublicKey,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null
  };
}

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}
