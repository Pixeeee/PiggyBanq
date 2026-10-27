import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../server/package.json', import.meta.url));

test('x402 approval serializes spending reservations and releases expired unsigned quotes', {
  skip: process.env.RUN_DATABASE_X402_TESTS !== '1', timeout: 30_000
}, async () => {
  process.loadEnvFile(new URL('../server/.env', import.meta.url));
  const { X402Service } = await import('../server/src/modules/x402/service.ts');
  const { prisma } = await import('../server/src/prisma.ts');
  const { Account, Address, Keypair, Networks, Operation, TransactionBuilder, nativeToScVal, xdr } = require('@stellar/stellar-sdk');
  const service = new X402Service();
  const user = await prisma.user.create({ data: { displayName: 'Disposable x402 limits test', stellarPublicKey: Keypair.random().publicKey() } });
  try {
    const quote = await service.quote(user, crypto.randomUUID());
    await service.approve(user.id, quote.id);
    await prisma.x402Payment.update({ where: { id: quote.id }, data: { expiresAt: new Date(0) } });
    assert.equal((await service.owned(user.id, quote.id)).status, 'EXPIRED');
    await assert.rejects(service.owned('another-user', quote.id), error => error.statusCode === 404);
    const template = { userId: user.id, payer: user.stellarPublicKey, payTo: quote.payTo,
      amountUnits: 1000n, requirements: quote.requirements, approvedAt: new Date(), expiresAt: new Date(Date.now() + 300_000) };
    await prisma.x402Payment.createMany({ data: Array.from({ length: 99 }, (_, i) => ({ ...template,
      idempotencyKey: crypto.randomUUID(), status: ['SUCCEEDED', 'SUBMITTING', 'UNKNOWN'][i % 3] })) });
    const a = await service.quote(user, crypto.randomUUID());
    const b = await service.quote(user, crypto.randomUUID());
    const results = await Promise.allSettled([service.approve(user.id, a.id), service.approve(user.id, b.id)]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const denied = results.find(result => result.status === 'rejected');
    assert.equal(denied.reason.statusCode, 429);
    const accepted = results.find(result => result.status === 'fulfilled').value;
    assert.equal((await service.approve(user.id, accepted.id)).status, 'APPROVED');
    assert.equal(await prisma.x402Payment.count({ where: { userId: user.id, status: { in: ['APPROVED', 'SUBMITTING', 'UNKNOWN', 'SUCCEEDED'] } } }), 100);
    assert.equal((await service.cancel(user.id, accepted.id)).status, 'CANCELLED');
    assert.equal((await service.approve(user.id, results[0].status === 'rejected' ? a.id : b.id)).status, 'APPROVED');
    const interrupted = await prisma.x402Payment.create({ data: { ...template, idempotencyKey: crypto.randomUUID(),
      status: 'SUBMITTING', updatedAt: new Date(Date.now() - 120_000) } });
    assert.equal((await service.reconcile(interrupted)).status, 'FAILED');
    const pending = await prisma.x402Payment.create({ data: { ...template, idempotencyKey: crypto.randomUUID(),
      status: 'UNKNOWN', transactionHash: 'a'.repeat(64), settlementXdr: 'fixture' } });
    let release;
    const wait = new Promise(resolve => { release = resolve; });
    const slow = new X402Service({ getTransaction: async () => { await wait; throw new Error('RPC timeout'); } });
    const refresh = slow.reconcile(pending);
    await prisma.x402Payment.update({ where: { id: pending.id }, data: { status: 'SUCCEEDED', receipt: { verified: true } } });
    release();
    assert.equal((await refresh).status, 'SUCCEEDED', 'a stale RPC timeout must never overwrite success');
    const invocation = new xdr.InvokeContractArgs({ contractAddress: Address.fromString(quote.requirements.asset).toScAddress(),
      functionName: 'transfer', args: [nativeToScVal(user.stellarPublicKey, { type: 'address' }),
        nativeToScVal(quote.payTo, { type: 'address' }), nativeToScVal('1000', { type: 'i128' })] });
    const auth = new xdr.SorobanAuthorizationEntry({ rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(invocation), subInvocations: [] }),
      credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(new xdr.SorobanAddressCredentials({
        address: Address.fromString(user.stellarPublicKey).toScAddress(), nonce: xdr.Int64.fromString('1'),
        signatureExpirationLedger: 100, signature: xdr.ScVal.scvVoid() })) });
    const envelope = new TransactionBuilder(new Account(Keypair.random().publicKey(), '0'), { fee: '100', networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.invokeHostFunction({ func: xdr.HostFunction.hostFunctionTypeInvokeContract(invocation), auth: [auth] }))
      .setTimeout(60).build();
    const prepared = await prisma.x402Payment.create({ data: { ...template, idempotencyKey: crypto.randomUUID(), status: 'UNKNOWN',
      transactionHash: Buffer.from(envelope.hash()).toString('hex'), settlementXdr: envelope.toXDR() } });
    let broadcasts = 0;
    let ledgerTime = Math.floor(Date.now() / 1000);
    const recovery = new X402Service({ getTransaction: async () => ({ status: 'NOT_FOUND',
      latestLedgerCloseTime: ledgerTime, oldestLedgerCloseTime: Math.floor(Date.now() / 1000) - 120 }),
      sendTransaction: async tx => { assert.equal(tx.toXDR(), envelope.toXDR()); broadcasts++; return { status: 'PENDING' }; } });
    assert.equal((await recovery.reconcile(prepared)).status, 'UNKNOWN');
    assert.equal(broadcasts, 1, 'recovery broadcasts only the original envelope');
    const previousEnabled = process.env.STELLAR_X402_ENABLED;
    const previousReadOnly = process.env.STELLAR_EMERGENCY_READ_ONLY;
    const { ExactStellarScheme } = await import('../server/node_modules/@x402/stellar/dist/esm/exact/facilitator/index.mjs');
    const previousVerify = ExactStellarScheme.prototype.verify;
    const previousSettle = ExactStellarScheme.prototype.settle;
    try {
      for (const [enabled, readOnly] of [['false', 'false'], ['true', 'true']]) {
        process.env.STELLAR_X402_ENABLED = enabled;
        process.env.STELLAR_EMERGENCY_READ_ONLY = readOnly;
        await recovery.reconcile(prepared);
        assert.equal(broadcasts, 1, 'disabled payments must never re-broadcast on status refresh');
        const stopped = error => error.statusCode === 503;
        await assert.rejects(service.quote(user, crypto.randomUUID()), stopped);
        await assert.rejects(service.approve(user.id, a.id), stopped);
        await assert.rejects(service.pay(user.id, a.id, {}), stopped);
        const receiptOnly = new X402Service({ getTransaction: async () => ({ status: 'SUCCESS',
          envelopeXdr: { toXDR: () => envelope.toXDR() }, ledger: 123 }) });
        const receipt = await receiptOnly.reconcile(prepared);
        assert.equal(receipt.status, 'SUCCEEDED', 'disabled payments still verify ledger receipts');
        await prisma.x402Payment.update({ where: { id: prepared.id }, data: { status: 'UNKNOWN' } });
      }
      ExactStellarScheme.prototype.verify = async () => ({ isValid: true, payer: user.stellarPublicKey });
      for (const stage of ['queued', 'signing']) {
        process.env.STELLAR_X402_ENABLED = 'true';
        process.env.STELLAR_EMERGENCY_READ_ONLY = 'false';
        const queued = new X402Service();
        let releaseQueue;
        let reachedQueue;
        const gate = new Promise(resolve => { releaseQueue = resolve; });
        const reached = new Promise(resolve => { reachedQueue = resolve; });
        queued.settlementQueue = { then: (...handlers) => { reachedQueue(); return gate.then(...handlers); } };
        let settlements = 0;
        ExactStellarScheme.prototype.settle = async function () {
          settlements++;
          process.env.STELLAR_EMERGENCY_READ_ONLY = 'true';
          const signer = this.signerMap.values().next().value;
          await signer.signTransaction(envelope.toXDR(), { networkPassphrase: Networks.TESTNET });
          assert.fail('a stopped signing callback must never return an envelope to broadcast');
        };
        const approval = await prisma.x402Payment.create({ data: { ...template,
          idempotencyKey: crypto.randomUUID(), status: 'APPROVED' } });
        const payment = queued.pay(user.id, approval.id, { x402Version: 2,
          accepted: quote.requirements, payload: { transaction: envelope.toXDR() } });
        await reached;
        if (stage === 'queued') process.env.STELLAR_X402_ENABLED = 'false';
        releaseQueue();
        const stopped = await payment;
        assert.equal(stopped.status, 'FAILED');
        assert.equal(stopped.transactionHash, null, 'stopped settlement must not prepare a signed envelope');
        assert.equal(settlements, stage === 'queued' ? 0 : 1);
        await prisma.x402Payment.delete({ where: { id: approval.id } });
      }
    } finally {
      ExactStellarScheme.prototype.verify = previousVerify;
      ExactStellarScheme.prototype.settle = previousSettle;
      if (previousEnabled === undefined) delete process.env.STELLAR_X402_ENABLED;
      else process.env.STELLAR_X402_ENABLED = previousEnabled;
      if (previousReadOnly === undefined) delete process.env.STELLAR_EMERGENCY_READ_ONLY;
      else process.env.STELLAR_EMERGENCY_READ_ONLY = previousReadOnly;
    }
    ledgerTime += 120;
    assert.equal((await recovery.reconcile(prepared)).status, 'FAILED');
    assert.equal(broadcasts, 1, 'proven-expired payments are never broadcast again');
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
});
