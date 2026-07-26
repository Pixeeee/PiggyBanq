export type FreighterWalletConnection = {
  publicKey: string;
  network: 'TESTNET';
  networkPassphrase: string;
};

export type SocialIdentityProvider = {
  id: 'privy' | 'web3auth';
  label: string;
  methods: string;
  walletRequirement: string;
};

export const SOCIAL_IDENTITY_PROVIDERS: SocialIdentityProvider[] = [
  {
    id: 'privy',
    label: 'Privy identity login',
    methods: 'Google, X, email, or phone',
    walletRequirement: 'Freighter is still required before Stellar actions.'
  },
  {
    id: 'web3auth',
    label: 'Web3Auth identity login',
    methods: 'Google, X, email, or phone',
    walletRequirement: 'Freighter is still required before Stellar actions.'
  }
];

export async function connectFreighterWallet(): Promise<FreighterWalletConnection> {
  const { getNetwork, isConnected, requestAccess } = await import('@stellar/freighter-api');
  const connection = await isConnected();

  if ('error' in connection && connection.error) {
    throw new Error(toFreighterErrorMessage(connection.error));
  }

  if (!connection.isConnected) {
    throw new Error('Install or unlock Freighter before connecting your Stellar wallet.');
  }

  const access = await requestAccess();
  if ('error' in access && access.error) {
    throw new Error(toFreighterErrorMessage(access.error));
  }

  if (!access.address) {
    throw new Error('Freighter did not return a Stellar public key.');
  }

  const network = await getNetwork();
  if ('error' in network && network.error) {
    throw new Error(toFreighterErrorMessage(network.error));
  }

  if (network.network !== 'TESTNET') {
    throw new Error('Switch Freighter to TESTNET before using PiggyBanq testnet flows.');
  }

  return {
    publicKey: access.address,
    network: 'TESTNET',
    networkPassphrase: network.networkPassphrase
  };
}

export async function signFreighterAuthChallenge(message: string, address: string): Promise<string> {
  const { signMessage } = await import('@stellar/freighter-api');
  const signed = await signMessage(message, { address });

  if ('error' in signed && signed.error) {
    throw new Error(toFreighterErrorMessage(signed.error));
  }

  if (!signed.signedMessage) {
    throw new Error('Freighter did not sign the authentication challenge.');
  }

  return typeof signed.signedMessage === 'string' ? signed.signedMessage : signed.signedMessage.toString('base64');
}

export function usernameFromFreighterPublicKey(publicKey: string) {
  return `freighter_${publicKey.slice(1, 9).toLowerCase()}`;
}

function toFreighterErrorMessage(error: unknown) {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'Freighter request failed.';
}