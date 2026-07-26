import { createPaymentConfirmation, type PaymentConfirmation, type PaymentConfirmationInput } from '@piggybanq/stellar-core/payment-confirmation';
import { requiresTrustline } from '@piggybanq/stellar-core/trustline';
import { Keypair } from '@stellar/stellar-sdk';

export interface LocalWalletActivationState {
  publicKey: string;
  mnemonicBackedUp: boolean;
  storedInSecureStore: boolean;
}

export type WalletActivationStatus = 'ready' | 'needs_wallet' | 'needs_backup' | 'needs_secure_store';

export interface MobilePaymentReview {
  confirmation: PaymentConfirmation;
  requiresTrustline: boolean;
  networkLabel: 'TESTNET';
  pollingCopy: string;
  safetyChecklist: string[];
}

export interface ImportedSecretKeyPreview {
  publicKey: string;
  secretKey: string;
}

export function getWalletActivationStatus(state: LocalWalletActivationState): WalletActivationStatus {
  if (!state.publicKey) {
    return 'needs_wallet';
  }

  if (!state.storedInSecureStore) {
    return 'needs_secure_store';
  }

  if (!state.mnemonicBackedUp) {
    return 'needs_backup';
  }

  return 'ready';
}

export function canActivateWallet(state: LocalWalletActivationState): boolean {
  return getWalletActivationStatus(state) === 'ready';
}

export function createMobilePaymentReview(input: PaymentConfirmationInput): MobilePaymentReview {
  const confirmation = createPaymentConfirmation(input);
  const trustlineRequired = requiresTrustline({
    assetCode: confirmation.assetCode,
    issuer: undefined
  });

  return {
    confirmation,
    requiresTrustline: trustlineRequired,
    networkLabel: 'TESTNET',
    pollingCopy: 'PENDING is not success. PiggyBanq polls the Stellar transaction until SUCCESS, FAILED, or timeout.',
    safetyChecklist: [
      'Review amount, asset, destination, and network fee before signing.',
      'Secret keys stay on this Android device.',
      trustlineRequired ? 'Recipient must have a trustline before receiving this asset.' : 'Native XLM does not require a trustline.',
      'After submit, wait for SUCCESS before treating funds as moved.'
    ]
  };
}

export function parseImportedSecretKey(secretKey: string): ImportedSecretKeyPreview {
  const normalizedSecret = secretKey.trim().toUpperCase();

  try {
    const keypair = Keypair.fromSecret(normalizedSecret);

    return {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret()
    };
  } catch {
    throw new Error('Enter a valid Stellar secret key.');
  }
}
