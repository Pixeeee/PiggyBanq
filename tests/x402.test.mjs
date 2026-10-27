import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../server/package.json', import.meta.url));
const { Account, Address, Asset, Keypair, Networks, Operation, TransactionBuilder, nativeToScVal, xdr } = require('@stellar/stellar-sdk');
const subject = await import('../packages/stellar-core/src/x402.ts').catch(() => null);
const payer = Keypair.random().publicKey();
const merchant = Keypair.random().publicKey();

function requirements(overrides = {}) {
  return { scheme: 'exact', network: 'stellar:testnet', asset: Asset.native().contractId(Networks.TESTNET),
    amount: '1000', payTo: merchant, maxTimeoutSeconds: 60, extra: { areFeesSponsored: true }, ...overrides };
}

function payload({ amount = '1000', to = merchant, nested = false } = {}) {
  const invocation = new xdr.InvokeContractArgs({ contractAddress: Address.fromString(requirements().asset).toScAddress(),
    functionName: 'transfer', args: [nativeToScVal(payer, { type: 'address' }), nativeToScVal(to, { type: 'address' }), nativeToScVal(amount, { type: 'i128' })] });
  const fn = xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(invocation);
  const root = new xdr.SorobanAuthorizedInvocation({ function: fn, subInvocations: nested ? [new xdr.SorobanAuthorizedInvocation({ function: fn, subInvocations: [] })] : [] });
  const auth = new xdr.SorobanAuthorizationEntry({ rootInvocation: root,
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(new xdr.SorobanAddressCredentials({
      address: Address.fromString(payer).toScAddress(), nonce: xdr.Int64.fromString('1'), signatureExpirationLedger: 100,
      signature: xdr.ScVal.scvVoid()
    })) });
  return new TransactionBuilder(new Account(Keypair.random().publicKey(), '0'), { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.invokeHostFunction({ func: xdr.HostFunction.hostFunctionTypeInvokeContract(invocation), auth: [auth] }))
    .setTimeout(60).build().toXDR();
}

test('x402 only authorizes the reviewed Testnet XLM transfer with no extra invocations', () => {
  assert.ok(subject, 'x402 payment validation must be implemented');
  subject.assertX402Requirements(requirements());
  subject.decodeX402Transfer(payload(), requirements(), payer);
  for (const change of [{ network: 'stellar:pubnet' }, { amount: '10001' }, { amount: '-1' }, { scheme: 'upto' },
    { asset: Asset.native().contractId(Networks.PUBLIC) }, { payTo: 'not-an-address' }, { extra: { areFeesSponsored: false } }]) {
    assert.throws(() => subject.assertX402Requirements(requirements(change)));
  }
  for (const change of [{ amount: '1001' }, { to: Keypair.random().publicKey() }, { nested: true }]) {
    assert.throws(() => subject.decodeX402Transfer(payload(change), requirements(), payer));
  }
  assert.throws(() => subject.decodeX402Transfer(payload(), requirements(), Keypair.random().publicKey()));
});
