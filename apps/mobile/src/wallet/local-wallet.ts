export interface LocalWalletActivationState {
  publicKey: string;
  mnemonicBackedUp: boolean;
  storedInSecureStore: boolean;
}

export function canActivateWallet(state: LocalWalletActivationState): boolean {
  return Boolean(state.publicKey) && state.mnemonicBackedUp && state.storedInSecureStore;
}

