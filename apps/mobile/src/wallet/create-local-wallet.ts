import * as SecureStore from 'expo-secure-store';
import { createRandomStellarWalletKeys, parseImportedSecretKey } from './local-wallet';

export const MOBILE_WALLET_STORAGE_KEY = 'piggybanq.testnet.wallet';

export type MobileStoredWallet = {
  publicKey: string;
  secretKey: string;
  createdAt: string;
  storageKind?: 'secure-store' | 'web-preview-fallback';
  source?: 'created' | 'imported-secret';
};

export async function loadStoredLocalWallet(): Promise<MobileStoredWallet | null> {
  const stored = await readWalletStorage();

  if (!stored) {
    return null;
  }

  return JSON.parse(stored) as MobileStoredWallet;
}

export async function createAndStoreLocalWallet(): Promise<MobileStoredWallet> {
  const keypair = await createRandomStellarWalletKeys();
  const wallet = {
    publicKey: keypair.publicKey,
    secretKey: keypair.secretKey,
    createdAt: new Date().toISOString(),
    storageKind: await getWalletStorageKind(),
    source: 'created' as const
  };

  await writeWalletStorage(JSON.stringify(wallet));

  return wallet;
}

export async function importAndStoreLocalWallet(secretKey: string): Promise<MobileStoredWallet> {
  const imported = await parseImportedSecretKey(secretKey);
  const wallet = {
    publicKey: imported.publicKey,
    secretKey: imported.secretKey,
    createdAt: new Date().toISOString(),
    storageKind: await getWalletStorageKind(),
    source: 'imported-secret' as const
  };

  await writeWalletStorage(JSON.stringify(wallet));

  return wallet;
}

async function readWalletStorage() {
  if (await canUseSecureStore()) {
    return SecureStore.getItemAsync(MOBILE_WALLET_STORAGE_KEY);
  }

  // web preview fallback: Expo SecureStore is Android/iOS-only, so localStorage keeps localhost UI testing interactive.
  return getWebPreviewStorage()?.getItem(MOBILE_WALLET_STORAGE_KEY) ?? null;
}

async function writeWalletStorage(value: string) {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(MOBILE_WALLET_STORAGE_KEY, value);
    return;
  }

  const storage = getWebPreviewStorage();
  if (!storage) {
    throw new Error('SecureStore is not available on this platform.');
  }

  // web preview fallback: this is only for localhost Expo web testing, not production Android storage.
  storage.setItem(MOBILE_WALLET_STORAGE_KEY, value);
}

async function getWalletStorageKind(): Promise<MobileStoredWallet['storageKind']> {
  return (await canUseSecureStore()) ? 'secure-store' : 'web-preview-fallback';
}

async function canUseSecureStore() {
  return SecureStore.isAvailableAsync();
}

function getWebPreviewStorage() {
  const host = globalThis as typeof globalThis & {
    localStorage?: {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
    };
  };

  return host.localStorage;
}
