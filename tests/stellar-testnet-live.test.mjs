import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const runLive = process.env.RUN_STELLAR_TESTNET_E2E === '1';
const serverRequire = createRequire(new URL('../server/package.json', import.meta.url));

test('live Stellar Testnet funding, trustlines, XLM payment, history, and path lookup', { skip: !runLive, timeout: 120_000 }, async () => {
  const { Account, Asset, Horizon, Keypair, Networks, Operation, TransactionBuilder } = serverRequire('@stellar/stellar-sdk');
  void Account;
  const horizon = new Horizon.Server(process.env.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org');
  const source = Keypair.random();
  const destination = Keypair.random();
  const usdc = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

  async function friendbot(publicKey) {
    const endpoint = new URL(process.env.STELLAR_FRIENDBOT_URL ?? 'https://friendbot.stellar.org');
    endpoint.searchParams.set('addr', publicKey);
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(30_000) });
    assert.equal(response.ok, true, `Friendbot rejected ${publicKey.slice(0, 8)}… with HTTP ${response.status}`);
  }

  async function signAndSubmit(keypair, operation) {
    const [account, fee] = await Promise.all([horizon.loadAccount(keypair.publicKey()), horizon.fetchBaseFee()]);
    const transaction = new TransactionBuilder(account, { fee: String(Math.max(100, fee)), networkPassphrase: Networks.TESTNET })
      .addOperation(operation)
      .setTimeout(60)
      .build();
    transaction.sign(keypair);
    return horizon.submitTransaction(transaction);
  }

  await Promise.all([friendbot(source.publicKey()), friendbot(destination.publicKey())]);
  const funded = await horizon.loadAccount(source.publicKey());
  assert.ok(funded.balances.some((balance) => balance.asset_type === 'native' && Number(balance.balance) > 0));

  await signAndSubmit(source, Operation.changeTrust({ asset: usdc, limit: '10000.0000000' }));
  await signAndSubmit(destination, Operation.changeTrust({ asset: usdc, limit: '10000.0000000' }));
  const trusted = await horizon.loadAccount(destination.publicKey());
  assert.ok(trusted.balances.some((balance) => balance.asset_type !== 'native' && 'asset_code' in balance && balance.asset_code === 'USDC' && balance.asset_issuer === usdc.getIssuer()));

  const before = await horizon.loadAccount(destination.publicKey());
  const beforeXlm = Number(before.balances.find((balance) => balance.asset_type === 'native').balance);
  const payment = await signAndSubmit(source, Operation.payment({ destination: destination.publicKey(), asset: Asset.native(), amount: '1.0000000' }));
  const after = await horizon.loadAccount(destination.publicKey());
  const afterXlm = Number(after.balances.find((balance) => balance.asset_type === 'native').balance);
  assert.ok(afterXlm >= beforeXlm + 1);

  const activity = await horizon.payments().forAccount(destination.publicKey()).order('desc').limit(20).call();
  assert.ok(activity.records.some((record) => record.transaction_hash === payment.hash));

  const paths = await horizon.strictSendPaths(Asset.native(), '1.0000000', [usdc]).call();
  assert.ok(Array.isArray(paths.records), 'A live path response must resolve to a list, including an honest empty list.');
});
