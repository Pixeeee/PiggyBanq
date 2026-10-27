'use client';

import { authorizeEntry, contract, Keypair, nativeToScVal, Networks, rpc } from '@stellar/stellar-sdk';
import { assertX402Authorization, assertX402Requirements, decodeX402Transfer, type X402Requirements } from '@piggybanq/stellar-core/x402';
import { unlockWalletAccount } from '../(app)/dashboard/secure-wallet';

export type X402Intent = {
  id: string; status: string; payer: string; requirements: X402Requirements;
  resource: { url: string; description: string; mimeType: string }; expiresAt: string;
  errorCode: string | null; limits: { perPaymentUnits: string; rolling24HourUnits: string };
  receipt: null | { verified: boolean; transaction: string; ledger: number; network: string };
};

export async function x402Request(path: string, options: RequestInit = {}) {
  const response = await fetch(`/backend/api/x402${path}`, { ...options, credentials: 'same-origin',
    signal: AbortSignal.timeout(90_000) });
  const data = await response.json();
  if (!response.ok && response.status !== 402) throw new Error(data.error?.message ?? 'Testnet payment request failed.');
  return { response, data };
}

export async function signX402Payment(input: { username: string; password: string; intent: X402Intent }) {
  const { intent } = input;
  assertX402Requirements(intent.requirements);
  if (intent.status !== 'APPROVED' || Date.parse(intent.expiresAt) <= Date.now()) throw new Error('A current, approved quote is required.');
  const { account, vault } = await unlockWalletAccount(input.username, input.password);
  const signer = Keypair.fromSecret(vault.secretKey);
  if (account.publicKey !== intent.payer || signer.publicKey() !== intent.payer || vault.publicKey !== intent.payer) {
    throw new Error('The unlocked wallet does not match the reviewed payer.');
  }
  const rpcUrl = new URL('/backend/api/x402/rpc', window.location.origin).toString();
  const latest = await new rpc.Server(rpcUrl, { allowHttp: window.location.protocol === 'http:' }).getLatestLedger();
  const expiration = latest.sequence + 12;
  const transfer = await contract.AssembledTransaction.build({ contractId: intent.requirements.asset,
    method: 'transfer', args: [nativeToScVal(intent.payer, { type: 'address' }),
      nativeToScVal(intent.requirements.payTo, { type: 'address' }), nativeToScVal(intent.requirements.amount, { type: 'i128' })],
    networkPassphrase: Networks.TESTNET, rpcUrl, allowHttp: window.location.protocol === 'http:',
    parseResultXdr: result => result });
  if (!transfer.simulation || rpc.Api.isSimulationError(transfer.simulation) || rpc.Api.isSimulationRestore(transfer.simulation)) {
    throw new Error('The Testnet transfer simulation did not succeed. Fund your Testnet wallet first.');
  }
  decodeX402Transfer(transfer.built!.toXDR(), intent.requirements, intent.payer);
  await transfer.signAuthEntries({ address: intent.payer, expiration, authorizeEntry: async entry => {
    assertX402Authorization(entry, intent.requirements, intent.payer);
    return authorizeEntry(entry, signer, expiration, Networks.TESTNET);
  } });
  await transfer.simulate();
  if (!transfer.simulation || rpc.Api.isSimulationError(transfer.simulation) || rpc.Api.isSimulationRestore(transfer.simulation)) {
    throw new Error('The signed authorization failed simulation.');
  }
  const transaction = transfer.built!.toXDR();
  decodeX402Transfer(transaction, intent.requirements, intent.payer);
  return { x402Version: 2 as const, accepted: intent.requirements, resource: intent.resource, payload: { transaction } };
}
