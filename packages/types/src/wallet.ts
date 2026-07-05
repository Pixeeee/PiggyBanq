export interface WalletAccountLink {
  userId: string;
  publicKey: string;
  displayAlias: string;
}

export function createWalletAccountLink(input: WalletAccountLink): WalletAccountLink {
  if (!input.userId.trim()) {
    throw new Error('userId is required');
  }

  if (!input.publicKey.startsWith('G')) {
    throw new Error('wallet linkage accepts public keys only');
  }

  return {
    userId: input.userId,
    publicKey: input.publicKey,
    displayAlias: input.displayAlias.trim()
  };
}

