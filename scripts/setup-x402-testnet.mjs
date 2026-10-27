import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(new URL('../server/package.json', import.meta.url));
const { Keypair, Horizon } = require('@stellar/stellar-sdk');
const envPath = new URL('../server/.env', import.meta.url);
let env = readFileSync(envPath, 'utf8');
const value = key => env.match(new RegExp(`^${key}="?([^"\\r\\n]+)"?$`, 'm'))?.[1];
if ((value('STELLAR_NETWORK') ?? 'TESTNET') !== 'TESTNET') throw new Error('Only disposable Testnet accounts can be provisioned.');
const facilitator = value('STELLAR_X402_FACILITATOR_SECRET')
  ? Keypair.fromSecret(value('STELLAR_X402_FACILITATOR_SECRET')) : Keypair.random();
const privateDirectory = join(homedir(), '.config/piggybanq');
mkdirSync(privateDirectory, { recursive: true, mode: 0o700 });
const merchantFile = join(privateDirectory, 'x402-testnet-merchant.key');
const merchant = existsSync(merchantFile) ? Keypair.fromSecret(readFileSync(merchantFile, 'utf8').trim()) : Keypair.random();
if (!existsSync(merchantFile)) writeFileSync(merchantFile, merchant.secret() + '\n', { mode: 0o600, flag: 'wx' });
if (value('STELLAR_X402_PAY_TO') && value('STELLAR_X402_PAY_TO') !== merchant.publicKey()) {
  throw new Error('An existing merchant is configured; refusing to replace it.');
}
for (const [key, setting] of Object.entries({ STELLAR_X402_ENABLED: 'true',
  STELLAR_X402_FACILITATOR_SECRET: facilitator.secret(), STELLAR_X402_PAY_TO: merchant.publicKey() })) {
  const line = `${key}="${setting}"`;
  env = new RegExp(`^${key}=.*$`, 'm').test(env) ? env.replace(new RegExp(`^${key}=.*$`, 'm'), line) : env.trimEnd() + '\n' + line + '\n';
}
chmodSync(envPath, 0o600);
writeFileSync(envPath, env);
const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');
for (const account of [facilitator, merchant]) {
  try { await horizon.loadAccount(account.publicKey()); }
  catch (error) {
    if (error.response?.status !== 404) throw error;
    const response = await fetch(`https://friendbot.stellar.org/?addr=${account.publicKey()}`, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Friendbot funding failed with HTTP ${response.status}; rerun setup later.`);
  }
}
console.log('Disposable Testnet accounts ready. Restart the API to load the configuration.');
console.log(`Facilitator: ${facilitator.publicKey()}\nMerchant: ${merchant.publicKey()}`);
