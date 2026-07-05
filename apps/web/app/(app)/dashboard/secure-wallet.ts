import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { Buffer } from 'buffer';
import { Keypair } from '@stellar/stellar-sdk';

export const WALLET_ACCOUNTS_KEY = 'piggybanq.walletAccounts';
export const ACTIVE_WALLET_SESSION_KEY = 'piggybanq.activeWalletSession';

const PBKDF2_ITERATIONS = 210_000;

export type WalletAccountRecord = {
  username: string;
  publicKey: string;
  salt: string;
  passwordVerifier: string;
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
  const normalizedUsername = normalizeUsername(username);
  const passwordCheck = validatePasswordStrength(password);

  if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
    throw new Error('Username must be 3-24 characters and use lowercase letters, numbers, or underscores.');
  }

  if (usernameExists(normalizedUsername)) {
    throw new Error('Username is already taken on this device.');
  }

  if (!passwordCheck.ok) {
    throw new Error(passwordCheck.errors.join(' '));
  }

  const publicKey = await publicKeyFromRecoveryPhrase(recoveryPhrase);
  const secretKey = await secretKeyFromRecoveryPhrase(recoveryPhrase);
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const derivedBytes = await derivePasswordBytes(password, saltBytes);
  const encryptedVault = await encryptVault(
    {
      recoveryPhrase,
      secretKey,
      publicKey,
      createdAt: new Date().toISOString()
    },
    derivedBytes
  );
  const record = {
    username: normalizedUsername,
    publicKey,
    salt: toBase64(saltBytes),
    passwordVerifier: await sha256Base64(derivedBytes),
    encryptedVault,
    createdAt: new Date().toISOString()
  };
  const accounts = [record, ...readAccounts()];

  localStorage.setItem(WALLET_ACCOUNTS_KEY, JSON.stringify(accounts));

  return record;
}

export async function loginWithWalletAccount(username: string, password: string) {
  const account = readAccounts().find((item) => item.username.toLowerCase() === normalizeUsername(username));

  if (!account) {
    throw new Error('Wallet account was not found.');
  }

  const derivedBytes = await derivePasswordBytes(password, fromBase64(account.salt));
  const verifier = await sha256Base64(derivedBytes);

  if (verifier !== account.passwordVerifier) {
    throw new Error('Username or password is incorrect.');
  }

  await decryptVault(account.encryptedVault, derivedBytes);

  const session = {
    username: account.username,
    publicKey: account.publicKey,
    loginAt: new Date().toISOString()
  };

  localStorage.setItem(ACTIVE_WALLET_SESSION_KEY, JSON.stringify(session));

  return session;
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
  const seedHash = await crypto.subtle.digest('SHA-256', toArrayBuffer(new TextEncoder().encode(recoveryPhrase.trim().toLowerCase())));

  return Keypair.fromRawEd25519Seed(Buffer.from(seedHash));
}

async function derivePasswordBytes(password: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey('raw', toArrayBuffer(new TextEncoder().encode(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
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

async function sha256Base64(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest('SHA-256', toArrayBuffer(bytes));

  return toBase64(new Uint8Array(hash));
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
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
