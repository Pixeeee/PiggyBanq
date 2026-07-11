import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('Stellar auth uses Ed25519 challenge signatures, not MetaMask', () => {
  const walletAuth = readFileSync('server/src/modules/auth/wallet-auth.ts', 'utf8');
  const flow = readFileSync('apps/web/app/components/WalletAuthFlow.tsx', 'utf8');
  const api = readFileSync('apps/web/app/lib/wallet-auth-api.ts', 'utf8');

  assert.match(walletAuth, /@stellar\/stellar-sdk/);
  assert.match(walletAuth, /Keypair\.fromPublicKey/);
  assert.match(walletAuth, /\.verify\(Buffer\.from\(message, 'utf8'\)/);
  assert.match(walletAuth, /Networks\.TESTNET/);
  assert.match(flow, /Create a new wallet/);
  assert.match(flow, /Save your Secret Recovery Phrase/);
  assert.match(flow, /signWalletAuthMessage/);
  assert.match(flow, /unlockWalletAccount/);
  assert.match(api, /\/api\/auth\/stellar\/challenge/);
  assert.doesNotMatch(`${walletAuth}\n${flow}\n${api}`, /MetaMask|personal_sign|ethers|Ethereum/i);
});

test('backend stores only hashed session tokens and one-time Stellar auth challenges', () => {
  const schema = readFileSync('server/prisma/schema.prisma', 'utf8');
  const envExample = readFileSync('server/.env.example', 'utf8');
  const migration = readFileSync('server/prisma/migrations/20260710100000_wallet_auth/migration.sql', 'utf8');
  const supabaseMigrationPath = 'server/prisma/migrations/20260711090000_supabase_baseline/migration.sql';
  const supabaseMigration = readFileSync(supabaseMigrationPath, 'utf8');
  const index = readFileSync('server/src/index.ts', 'utf8');
  const routes = readFileSync('server/src/modules/auth/routes.ts', 'utf8');

  assert.equal(existsSync(supabaseMigrationPath), true);
  assert.match(index, /loadLocalEnv\(new URL\('\.\.\/\.env', import\.meta\.url\)\)/);
  assert.match(index, /process\.env\[key\] = value/);
  assert.match(index, /await import\('\.\/server\.ts'\)/);
  assert.doesNotMatch(index, /import \{ buildServer \} from '\.\/server\.ts'/);
  assert.match(envExample, /DATABASE_URL=.*sslmode=disable/);
  assert.match(schema, /stellarPublicKey\s+String\?\s+@unique/);
  assert.match(schema, /username\s+String\?\s+@unique/);
  assert.match(schema, /model WalletAuthChallenge/);
  assert.match(schema, /publicKey/);
  assert.match(schema, /nonceHash/);
  assert.match(schema, /messageHash/);
  assert.match(schema, /usedAt/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.doesNotMatch(schema, /\btoken\s+String\s+@unique/);
  assert.match(migration, /Supabase baseline marker/);
  assert.doesNotMatch(migration, /ALTER TABLE "User"/);
  assert.match(supabaseMigration, /CREATE TYPE "AuthChallengePurpose"/);
  assert.match(supabaseMigration, /CREATE TABLE "User"/);
  assert.match(supabaseMigration, /CREATE TABLE "WalletAuthChallenge"/);
  assert.match(supabaseMigration, /CREATE UNIQUE INDEX "User_username_key"/);
  assert.match(supabaseMigration, /CREATE UNIQUE INDEX "Session_tokenHash_key"/);
  assert.match(routes, /updateMany\(\{\s*where:\s*\{\s*id:\s*challenge\.id,\s*usedAt:\s*null\s*\}/s);
  assert.match(routes, /tokenHash:\s*sha256\(token\)/);
  assert.doesNotMatch(routes, /localStorage/);
});
