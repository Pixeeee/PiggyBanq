import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { createRandomStellarWalletKeys, parseImportedSecretKey } from './local-wallet';
import { canUseLocalWebPreview, createWalletRepository } from './wallet-vault';
export type { MobileStoredWallet } from './wallet-vault';

export const MOBILE_WALLET_STORAGE_KEY = 'piggybanq.testnet.wallet';

// Plaintext storage is available only to an explicitly local development web preview.
function getWebPreviewStorage() {
  const host = globalThis as typeof globalThis & { location?: { hostname?: string }; localStorage?: { getItem(key: string): string | null; setItem(key: string, value: string): void } };
  return canUseLocalWebPreview(Platform.OS, __DEV__, host.location?.hostname ?? '') ? host.localStorage : undefined;
}
async function readWalletStorage() {
  if (await SecureStore.isAvailableAsync()) return SecureStore.getItemAsync(MOBILE_WALLET_STORAGE_KEY);
  const preview = getWebPreviewStorage();
  if (!preview) throw new Error('SecureStore is unavailable. Wallet access is disabled to protect your keys.');
  return preview.getItem(MOBILE_WALLET_STORAGE_KEY);
}
async function writeWalletStorage(value: string) {
  if (await SecureStore.isAvailableAsync()) {
    await SecureStore.setItemAsync(MOBILE_WALLET_STORAGE_KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    return;
  }
  const preview = getWebPreviewStorage();
  if (!preview) throw new Error('SecureStore is unavailable. Wallet access is disabled to protect your keys.');
  preview.setItem(MOBILE_WALLET_STORAGE_KEY, value);
}
const repository = createWalletRepository({ read: readWalletStorage, write: writeWalletStorage, kind: Platform.OS === 'web' ? 'web-preview-fallback' : 'secure-store' }, {
  create: () => createRandomStellarWalletKeys(), parse: parseImportedSecretKey
}, () => Crypto.getRandomBytesAsync(16));

export const inspectStoredLocalWallet = repository.inspect;
export const unlockStoredLocalWallet = repository.unlock;
export const protectLegacyLocalWallet = repository.protectLegacy;
export const confirmStoredWalletBackup = repository.confirmBackup;
export const createAndStoreLocalWallet = repository.create;
export const importAndStoreLocalWallet = repository.import;
