import * as SecureStore from 'expo-secure-store';
import { Keypair } from '@stellar/stellar-sdk';

export const MOBILE_WALLET_STORAGE_KEY = 'piggybanq.testnet.wallet';

export type MobileStoredWallet = {
  publicKey: string;
  secretKey: string;
  createdAt: string;
};

export async function loadStoredLocalWallet(): Promise<MobileStoredWallet | null> {
  const stored = await SecureStore.getItemAsync(MOBILE_WALLET_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  return JSON.parse(stored) as MobileStoredWallet;
}

export async function createAndStoreLocalWallet(): Promise<MobileStoredWallet> {
  const keypair = Keypair.random();
  const wallet = {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
    createdAt: new Date().toISOString()
  };

  await SecureStore.setItemAsync(MOBILE_WALLET_STORAGE_KEY, JSON.stringify(wallet));

  return wallet;
}
