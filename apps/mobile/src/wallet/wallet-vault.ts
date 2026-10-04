import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

const ITERATIONS = 210_000;
type Keys = { publicKey: string; secretKey: string };
type Credential = { algorithm: 'PBKDF2-SHA256'; iterations: number; salt: string; hash: string };
export type MobileStoredWallet = Keys & {
  createdAt: string;
  storageKind?: 'secure-store' | 'web-preview-fallback';
  source?: 'created' | 'imported-secret';
  username?: string;
  credential?: Credential;
  backupConfirmed?: boolean;
};
type Storage = { read(): Promise<string | null>; write(value: string): Promise<void>; kind: NonNullable<MobileStoredWallet['storageKind']> };
type KeyFactory = { create(): Promise<Keys>; parse(secret: string): Promise<Keys> };

export function canUseLocalWebPreview(platform: string, development: boolean, hostname: string) {
  return platform === 'web' && development && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
}

export function shouldLockWalletForAppState(state: string, deviceAuthenticationInProgress: boolean) {
  return state !== 'active' && !(state === 'inactive' && deviceAuthenticationInProgress);
}

export function validateMobilePassword(password: string) {
  const errors = [
    password.length >= 12 ? '' : 'Use at least 12 characters.',
    password.length <= 512 ? '' : 'Use at most 512 characters.',
    /[A-Z]/.test(password) ? '' : 'Add an uppercase letter.',
    /[a-z]/.test(password) ? '' : 'Add a lowercase letter.',
    /\d/.test(password) ? '' : 'Add a number.',
    /[^A-Za-z0-9]/.test(password) ? '' : 'Add a special character.'
  ].filter(Boolean);
  return { errors, ok: errors.length === 0 };
}

export function createWalletRepository(storage: Storage, keys: KeyFactory, randomSalt: () => Promise<Uint8Array>) {
  let writing = false;
  async function writeLocked<T>(action: () => Promise<T>) {
    if (writing) throw new Error('Wallet storage is busy. Try again.');
    writing = true;
    try { return await action(); } finally { writing = false; }
  }
  async function read() {
    const raw = await storage.read();
    if (raw === null) return null;
    try {
      const wallet: MobileStoredWallet = JSON.parse(raw);
      if (!wallet || typeof wallet.secretKey !== 'string' || typeof wallet.publicKey !== 'string' || typeof wallet.createdAt !== 'string') throw new Error();
      const parsed = await keys.parse(wallet.secretKey);
      if (parsed.publicKey !== wallet.publicKey) throw new Error();
      if (wallet.credential && (wallet.credential.algorithm !== 'PBKDF2-SHA256' || wallet.credential.iterations !== ITERATIONS || !/^[a-f0-9]{32}$/.test(wallet.credential.salt) || !/^[a-f0-9]{64}$/.test(wallet.credential.hash))) throw new Error();
      return wallet;
    } catch {
      throw new Error('Stored wallet is damaged or unsupported. Your record has been preserved; do not create a replacement.');
    }
  }
  async function credential(password: string): Promise<Credential> {
    const check = validateMobilePassword(password);
    if (!check.ok) throw new Error(check.errors.join(' '));
    const salt = await randomSalt();
    if (salt.length !== 16) throw new Error('Secure randomness unavailable.');
    return { algorithm: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: hex(salt), hash: hex(await derive(password, salt)) };
  }
  async function saveNew(password: string, username: string, importedSecret?: string) {
    return writeLocked(async () => {
      if (await storage.read() !== null) throw new Error('A wallet is already stored on this device. Unlock it; creating or importing a replacement is disabled.');
      const normalizedUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) throw new Error('Username must be 3–24 letters, numbers, or underscores.');
      const passwordCredential = await credential(password);
      const key = importedSecret === undefined ? await keys.create() : await keys.parse(importedSecret);
      const wallet: MobileStoredWallet = { ...key, createdAt: new Date().toISOString(), storageKind: storage.kind, source: importedSecret === undefined ? 'created' : 'imported-secret', username: normalizedUsername, credential: passwordCredential, backupConfirmed: false };
      await storage.write(JSON.stringify(wallet));
      return wallet;
    });
  }
  return {
    async inspect() {
      const wallet = await read();
      return { hasStoredWallet: Boolean(wallet), legacyWalletNeedsPassword: Boolean(wallet && !wallet.credential) };
    },
    create: (password: string, username: string) => saveNew(password, username),
    import: (secret: string, password: string, username: string) => saveNew(password, username, secret),
    async unlock(password: string) {
      const wallet = await read();
      if (!wallet) throw new Error('No wallet is stored on this device.');
      if (!wallet.credential) throw new Error('Set a password to protect this existing wallet first.');
      if (password.length > 512) throw new Error('Wallet password is incorrect.');
      const expected = bytes(wallet.credential.hash);
      const actual = await derive(password, bytes(wallet.credential.salt));
      let difference = 0;
      for (let index = 0; index < expected.length; index++) difference |= expected[index] ^ actual[index];
      if (difference !== 0) throw new Error('Wallet password is incorrect.');
      return wallet;
    },
    async protectLegacy(password: string, username: string) {
      return writeLocked(async () => {
        const wallet = await read();
        if (!wallet) throw new Error('No wallet is stored on this device.');
        if (wallet.credential) throw new Error('This wallet already has a password. Unlock it instead.');
        if (!/^[a-z0-9_]{3,24}$/.test(username.trim().toLowerCase())) throw new Error('Username must be 3–24 letters, numbers, or underscores.');
        const protectedWallet = { ...wallet, username: wallet.username ?? username.trim().toLowerCase(), credential: await credential(password), backupConfirmed: wallet.backupConfirmed === true };
        await storage.write(JSON.stringify(protectedWallet));
        return protectedWallet;
      });
    },
    async confirmBackup(publicKey: string) {
      return writeLocked(async () => {
        const wallet = await read();
        if (!wallet || !wallet.credential || wallet.publicKey !== publicKey) throw new Error('Unlock this wallet before confirming backup.');
        const confirmed = { ...wallet, backupConfirmed: true };
        await storage.write(JSON.stringify(confirmed));
        return confirmed;
      });
    }
  };
}

function derive(password: string, salt: Uint8Array) {
  return pbkdf2Async(sha256, password, salt, { c: ITERATIONS, dkLen: 32, asyncTick: 10 });
}
function hex(value: Uint8Array) { return Array.from(value, byte => byte.toString(16).padStart(2, '0')).join(''); }
function bytes(value: string) { return Uint8Array.from(value.match(/.{2}/g) ?? [], byte => parseInt(byte, 16)); }
