import { authorizeEntry, contract, Keypair, nativeToScVal, rpc, Address, Asset, Networks, StrKey, Transaction, TransactionBuilder, scValToNative, type xdr } from '@stellar/stellar-sdk';

export const X402_NETWORK = 'stellar:testnet' as const;
export const X402_ASSET = Asset.native().contractId(Networks.TESTNET);
export const X402_PRICE_UNITS = '1000'; // 0.0001 Testnet XLM
export const X402_PAYMENT_CAP_UNITS = 10_000n;
export const X402_DAILY_CAP_UNITS = 100_000n;

export type X402Requirements = {
  scheme: 'exact'; network: typeof X402_NETWORK; asset: string; amount: string;
  payTo: string; maxTimeoutSeconds: number; extra: { areFeesSponsored: true };
};

export function assertX402Requirements(value: unknown): asserts value is X402Requirements {
  const r = value as X402Requirements | null;
  if (!r || r.scheme !== 'exact' || r.network !== X402_NETWORK || r.asset !== X402_ASSET
    || typeof r.amount !== 'string' || !/^\d+$/.test(r.amount) || r.amount.length > 12
    || BigInt(r.amount) <= 0n || BigInt(r.amount) > X402_PAYMENT_CAP_UNITS
    || typeof r.payTo !== 'string' || !StrKey.isValidEd25519PublicKey(r.payTo)
    || r.maxTimeoutSeconds !== 60 || r.extra?.areFeesSponsored !== true) {
    throw new Error('Payment must be an exact, fee-sponsored Testnet XLM transfer within the payment cap.');
  }
}

function assertInvocation(invocation: xdr.InvokeContractArgs, requirements: X402Requirements, payer: string) {
  const args = invocation.args;
  if (Address.fromScAddress(invocation.contractAddress).toString() !== requirements.asset
    || invocation.functionName.toString() !== 'transfer' || args.length !== 3
    || scValToNative(args[0]) !== payer || scValToNative(args[1]) !== requirements.payTo
    || scValToNative(args[2]) !== BigInt(requirements.amount)) {
    throw new Error('The authorization does not match the reviewed token, payer, recipient and amount.');
  }
}

export function assertX402Authorization(entry: xdr.SorobanAuthorizationEntry, requirements: X402Requirements, payer: string) {
  assertX402Requirements(requirements);
  const credentials = entry.credentials;
  const address = credentials.type === 'sorobanCredentialsAddress' ? credentials.address
    : credentials.type === 'sorobanCredentialsAddressV2' ? credentials.addressV2 : null;
  const invocation = entry.rootInvocation;
  if (!address || Address.fromScAddress(address.address).toString() !== payer
    || invocation.subInvocations.length !== 0
    || invocation.function.type !== 'sorobanAuthorizedFunctionTypeContractFn') {
    throw new Error('Only one direct authorization by the reviewed wallet is allowed.');
  }
  assertInvocation(invocation.function.contractFn, requirements, payer);
}

export function decodeX402Transfer(envelope: string, requirements: X402Requirements, payer: string) {
  assertX402Requirements(requirements);
  if (!StrKey.isValidEd25519PublicKey(payer) || payer === requirements.payTo) throw new Error('Invalid payer.');
  const tx = TransactionBuilder.fromXDR(envelope, Networks.TESTNET);
  if (!(tx instanceof Transaction) || tx.operations.length !== 1 || tx.memo.type !== 'none') throw new Error('Only one reviewed contract call is allowed.');
  const operation = tx.operations[0];
  if (operation.type !== 'invokeHostFunction' || operation.func.type !== 'hostFunctionTypeInvokeContract'
    || operation.auth?.length !== 1) throw new Error('Invalid x402 operation.');
  assertInvocation(operation.func.invokeContract, requirements, payer);
  assertX402Authorization(operation.auth[0], requirements, payer);
  return { transaction: tx, authorization: operation.auth[0] };
}


export type X402Intent = {
  id: string; status: string; payer: string; requirements: X402Requirements;
  resource: { url: string; description: string; mimeType: string }; expiresAt: string;
  errorCode: string | null; limits: { perPaymentUnits: string; rolling24HourUnits: string };
  receipt: null | { verified: boolean; transaction: string; ledger: number; network: string };
};

export async function signApprovedX402Payment(input: { intent: X402Intent; wallet: { publicKey: string; secretKey: string };
  rpcUrl: string; allowHttp?: boolean; isActive: () => boolean }) {
  const { intent, rpcUrl, wallet } = input;
  const active = () => {
    if (!input.isActive() || intent.status !== 'APPROVED' || !Number.isFinite(Date.parse(intent.expiresAt)) || Date.parse(intent.expiresAt) <= Date.now()) {
      throw new Error('A current approved payment and unlocked wallet are required. Nothing further was signed or submitted.');
    }
  };
  active();
  assertX402Requirements(intent.requirements);
  const signer = Keypair.fromSecret(wallet.secretKey);
  if (wallet.publicKey !== intent.payer || signer.publicKey() !== intent.payer) throw new Error('The unlocked wallet does not match the reviewed payer.');
  const latest = await new rpc.Server(rpcUrl, { allowHttp: input.allowHttp === true }).getLatestLedger();
  const expiration = latest.sequence + 12;
  const transfer = await contract.AssembledTransaction.build({ contractId: intent.requirements.asset,
    method: 'transfer', args: [nativeToScVal(intent.payer, { type: 'address' }),
      nativeToScVal(intent.requirements.payTo, { type: 'address' }), nativeToScVal(intent.requirements.amount, { type: 'i128' })],
    networkPassphrase: Networks.TESTNET, rpcUrl, allowHttp: input.allowHttp === true,
    parseResultXdr: result => result });
  if (!transfer.simulation || rpc.Api.isSimulationError(transfer.simulation) || rpc.Api.isSimulationRestore(transfer.simulation)) {
    throw new Error('The Testnet transfer simulation did not succeed. Fund your Testnet wallet first.');
  }
  decodeX402Transfer(transfer.built!.toXDR(), intent.requirements, intent.payer);
  active();
  await transfer.signAuthEntries({ address: intent.payer, expiration, authorizeEntry: async entry => {
    active();
    assertX402Authorization(entry, intent.requirements, intent.payer);
    return authorizeEntry(entry, signer, expiration, Networks.TESTNET);
  } });
  active();
  await transfer.simulate();
  if (!transfer.simulation || rpc.Api.isSimulationError(transfer.simulation) || rpc.Api.isSimulationRestore(transfer.simulation)) {
    throw new Error('The signed authorization failed simulation.');
  }
  const transaction = transfer.built!.toXDR();
  decodeX402Transfer(transaction, intent.requirements, intent.payer);
  active();
  return { x402Version: 2 as const, accepted: intent.requirements, resource: intent.resource, payload: { transaction } };
}
