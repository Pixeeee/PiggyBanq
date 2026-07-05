import { isValidStellarPublicKey } from './address.ts';

export interface PaymentConfirmationInput {
  amount: string;
  assetCode: string;
  destination: string;
  estimatedFeeStroops: string;
}

export interface PaymentConfirmation {
  amount: string;
  assetCode: string;
  destination: string;
  estimatedFeeStroops: string;
  requiresUserSignature: true;
  network: 'TESTNET';
}

export function createPaymentConfirmation(
  input: PaymentConfirmationInput
): PaymentConfirmation {
  if (!/^\d+(\.\d{1,7})?$/.test(input.amount)) {
    throw new Error('payment amount must be a positive decimal string');
  }

  if (!isValidStellarPublicKey(input.destination)) {
    throw new Error('destination must be a valid Stellar public key');
  }

  if (!/^\d+$/.test(input.estimatedFeeStroops)) {
    throw new Error('estimated fee must be stroops');
  }

  return {
    amount: input.amount,
    assetCode: input.assetCode.toUpperCase(),
    destination: input.destination,
    estimatedFeeStroops: input.estimatedFeeStroops,
    requiresUserSignature: true,
    network: 'TESTNET'
  };
}

