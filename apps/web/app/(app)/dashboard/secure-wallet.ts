import { generateMnemonic, mnemonicToSeedWebcrypto, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { Buffer } from 'buffer';
import { Keypair } from '@stellar/stellar-sdk';

export const WALLET_ACCOUNTS_KEY = 'piggybanq.walletAccounts';
export const ACTIVE_WALLET_SESSION_KEY = 'piggybanq.activeWalletSession';

const PBKDF2_ITERATIONS = 210_000;
const STELLAR_BIP44_PATH = "m/44'/148'/0'";

export type WalletAccountRecord = {
  version?: 1 | 2;
  username: string;
  publicKey: string;
  salt: string;
  passwordVerifier?: string;
  kdfIterations?: number;
  derivation?: {
    standard: 'SLIP-0010';
    path: typeof STELLAR_BIP44_PATH;
  };
  encryptedVault: {
    iv: string;
    data: string;
  };
  createdAt: string;
};

export type ActiveWalletSession = {
  username: string;
  publicKey: string;
  loginAt: string;
};

export type WalletVault = {
  recoveryPhrase: string;
  secretKey: string;
  publicKey: string;
  createdAt: string;
};

export type PreparedWalletAccount = WalletAccountRecord & {
  vault: WalletVault;
};

export function validatePasswordStrength(password: string) {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters.');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must include an uppercase letter.');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must include a lowercase letter.');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must include a number.');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must include a special character.');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function generateRecoveryPhrase() {
  const entropyProbe = new Uint8Array(16);
  crypto.getRandomValues(entropyProbe);
  const words = generateMnemonic(wordlist, 128).split(' ');

  return Array.from({ length: 12 }, (_, index) => words[index]).join(' ');
}

export function usernameExists(username: string) {
  return readAccounts().some((account) => account.username.toLowerCase() === normalizeUsername(username));
}

export async function createSecureWalletAccount({
  username,
  password,
  recoveryPhrase
}: {
  username: string;
  password: string;
  recoveryPhrase: string;
}) {
  return prepareSecureWalletAccount({ username, password, recoveryPhrase });
}

export async function prepareSecureWalletAccount({
  username,
  password,
  recoveryPhrase
}: {
  username: string;
  password: string;
  recoveryPhrase: string;
}) {
  const normalizedUsername = normalizeUsername(username);
  const passwordCheck = validatePasswordStrength(password);
  const normalizedPhrase = normalizeRecoveryPhrase(recoveryPhrase);

  if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
    throw new Error('Username must be 3-24 characters and use lowercase letters, numbers, or underscores.');
  }

  if (usernameExists(normalizedUsername)) {
    throw new Error('Username is already taken on this device.');
  }

  if (!passwordCheck.ok) {
    throw new Error(passwordCheck.errors.join(' '));
  }

  if (!validateMnemonic(normalizedPhrase, wordlist)) {
    throw new Error('Recovery phrase is invalid.');
  }

  const keypair = await keypairFromRecoveryPhrase(normalizedPhrase);
  const publicKey = keypair.publicKey();
  const secretKey = keypair.secret();
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const derivedBytes = await derivePasswordBytes(password, saltBytes);
  const vault = {
    recoveryPhrase: normalizedPhrase,
    secretKey,
    publicKey,
    createdAt: new Date().toISOString()
  };
  const encryptedVault = await encryptVault(vault, derivedBytes);
  const record: PreparedWalletAccount = {
    version: 2,
    username: normalizedUsername,
    publicKey,
    salt: toBase64(saltBytes),
    kdfIterations: PBKDF2_ITERATIONS,
    derivation: {
      standard: 'SLIP-0010' as const,
      path: STELLAR_BIP44_PATH
    },
    encryptedVault,
    createdAt: new Date().toISOString(),
    vault
  };

  return record;
}

export function persistSecureWalletAccount(record: WalletAccountRecord) {
  const persistedRecord = { ...record } as Partial<PreparedWalletAccount>;
  delete persistedRecord.vault;
  const accounts = [persistedRecord, ...readAccounts()];

  localStorage.setItem(WALLET_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function loginWithWalletAccount(username: string, password: string) {
  const { account } = await unlockWalletAccount(username, password);

  const session = {
    username: account.username,
    publicKey: account.publicKey,
    loginAt: new Date().toISOString()
  };

  localStorage.setItem(ACTIVE_WALLET_SESSION_KEY, JSON.stringify(session));

  return session;
}

export async function unlockWalletAccount(username: string, password: string) {
  const account = readAccounts().find((item) => item.username.toLowerCase() === normalizeUsername(username));

  if (!account) {
    throw new Error('Wallet account was not found.');
  }

  const derivedBytes = await derivePasswordBytes(password, fromBase64(account.salt), account.kdfIterations);
  const vault = await decryptWalletVault(account, derivedBytes);

  if (vault.publicKey !== account.publicKey) {
    throw new Error('Encrypted wallet vault does not match this account.');
  }

  return { account, vault };
}

export function signWalletAuthMessage(secretKey: string, message: string) {
  const keypair = Keypair.fromSecret(secretKey);
  const signature = keypair.sign(Buffer.from(message, 'utf8'));

  return toBase64(signature);
}

export function getActiveWalletSession(): ActiveWalletSession | null {
  const stored = localStorage.getItem(ACTIVE_WALLET_SESSION_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as ActiveWalletSession;
  } catch {
    localStorage.removeItem(ACTIVE_WALLET_SESSION_KEY);
    return null;
  }
}

export function readAccounts(): WalletAccountRecord[] {
  const stored = localStorage.getItem(WALLET_ACCOUNTS_KEY);

  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as WalletAccountRecord[];
  } catch {
    localStorage.removeItem(WALLET_ACCOUNTS_KEY);
    return [];
  }
}

async function publicKeyFromRecoveryPhrase(recoveryPhrase: string) {
  return (await keypairFromRecoveryPhrase(recoveryPhrase)).publicKey();
}

async function secretKeyFromRecoveryPhrase(recoveryPhrase: string) {
  return (await keypairFromRecoveryPhrase(recoveryPhrase)).secret();
}

async function keypairFromRecoveryPhrase(recoveryPhrase: string) {
  const seed = await deriveStellarSeedFromMnemonic(recoveryPhrase);

  return Keypair.fromRawEd25519Seed(Buffer.from(seed));
}

async function deriveStellarSeedFromMnemonic(recoveryPhrase: string) {
  const seed = await mnemonicToSeedWebcrypto(normalizeRecoveryPhrase(recoveryPhrase));
  const node = await slip10DerivePath(seed, STELLAR_BIP44_PATH);

  return node.key;
}

async function slip10DerivePath(seed: Uint8Array, path: string) {
  const master = await hmacSha512(new TextEncoder().encode('ed25519 seed'), seed);
  let key = master.slice(0, 32);
  let chainCode = master.slice(32);

  for (const segment of parseHardenedPath(path)) {
    const data = concatBytes(new Uint8Array([0]), key, serializeUint32(segment));
    const child = await hmacSha512(chainCode, data);
    key = child.slice(0, 32);
    chainCode = child.slice(32);
  }

  return { key, chainCode };
}

function parseHardenedPath(path: string) {
  const parts = path.split('/');
  if (parts[0] !== 'm') throw new Error('Invalid Stellar derivation path.');

  return parts.slice(1).map((part) => {
    if (!part.endsWith("'")) throw new Error('Stellar derivation path must be hardened.');
    const index = Number(part.slice(0, -1));
    if (!Number.isInteger(index) || index < 0 || index >= 0x80000000) throw new Error('Invalid Stellar derivation index.');

    return index + 0x80000000;
  });
}

function serializeUint32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

async function hmacSha512(keyBytes: Uint8Array, dataBytes: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', toArrayBuffer(keyBytes), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, toArrayBuffer(dataBytes));

  return new Uint8Array(signature);
}

async function derivePasswordBytes(password: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS) {
  const keyMaterial = await crypto.subtle.importKey('raw', toArrayBuffer(new TextEncoder().encode(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return new Uint8Array(bits);
}

async function importAesKey(derivedBytes: Uint8Array) {
  return crypto.subtle.importKey('raw', toArrayBuffer(derivedBytes), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptVault(vault: object, derivedBytes: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesKey(derivedBytes);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(new TextEncoder().encode(JSON.stringify(vault)))
  );

  return {
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted))
  };
}

async function decryptVault(encryptedVault: WalletAccountRecord['encryptedVault'], derivedBytes: Uint8Array) {
  const key = await importAesKey(derivedBytes);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(fromBase64(encryptedVault.iv)) },
    key,
    toArrayBuffer(fromBase64(encryptedVault.data))
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function decryptWalletVault(account: WalletAccountRecord, derivedBytes: Uint8Array) {
  if (account.passwordVerifier) {
    const verifier = await sha256Base64(derivedBytes);

    if (verifier !== account.passwordVerifier) {
      throw new Error('Username or password is incorrect.');
    }
  }

  try {
    return (await decryptVault(account.encryptedVault, derivedBytes)) as WalletVault;
  } catch {
    throw new Error('Username or password is incorrect.');
  }
}

async function sha256Base64(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest('SHA-256', toArrayBuffer(bytes));

  return toBase64(new Uint8Array(hash));
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function normalizeRecoveryPhrase(recoveryPhrase: string) {
  return recoveryPhrase.trim().toLowerCase().replace(/\s+/g, ' ');
}

function concatBytes(...arrays: Uint8Array[]) {
  const length = arrays.reduce((total, bytes) => total + bytes.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;

  for (const bytes of arrays) {
    result.set(bytes, offset);
    offset += bytes.length;
  }

  return result;
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array) {
  return new Uint8Array(bytes).buffer;
}
