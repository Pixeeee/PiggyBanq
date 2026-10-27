'use client';

import { Keypair } from '@stellar/stellar-sdk';
import { assertX402Requirements, signApprovedX402Payment, type X402Intent } from '@piggybanq/stellar-core/x402';
import { unlockWalletAccount } from '../(app)/dashboard/secure-wallet';

export type { X402Intent } from '@piggybanq/stellar-core/x402';

export async function x402Request(path: string, options: RequestInit = {}) {
  const response = await fetch(`/backend/api/x402${path}`, { ...options, credentials: 'same-origin',
    signal: AbortSignal.timeout(90_000) });
  const data = await response.json();
  if (!response.ok && response.status !== 402) throw new Error(data.error?.message ?? 'Testnet payment request failed.');
  return { response, data };
}

export async function signX402Payment(input: { username: string; password: string; intent: X402Intent; isActive?: () => boolean }) {
  const { intent } = input;
  assertX402Requirements(intent.requirements);
  if (intent.status !== 'APPROVED' || Date.parse(intent.expiresAt) <= Date.now()) throw new Error('A current, approved quote is required.');
  const { account, vault } = await unlockWalletAccount(input.username, input.password);
  const signer = Keypair.fromSecret(vault.secretKey);
  if (account.publicKey !== intent.payer || signer.publicKey() !== intent.payer || vault.publicKey !== intent.payer) {
    throw new Error('The unlocked wallet does not match the reviewed payer.');
  }
  return signApprovedX402Payment({ intent, wallet: vault,
    rpcUrl: new URL('/backend/api/x402/rpc', window.location.origin).toString(),
    allowHttp: window.location.protocol === 'http:', isActive: input.isActive ?? (() => true) });
}
