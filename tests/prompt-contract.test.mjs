import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('PiggyBanq Codex master prompt covers web, app, Stellar, and security requirements', () => {
  const promptPath = 'docs/piggybanq-codex-master-prompt.md';

  assert.equal(existsSync(promptPath), true);

  const prompt = readFileSync(promptPath, 'utf8');

  assert.match(prompt, /PiggyBanq/);
  assert.match(prompt, /No-KYC Micro Savings Account/);
  assert.match(prompt, /Expo/);
  assert.match(prompt, /Next\.js/);
  assert.match(prompt, /Stellar Fullstack App/i);
  assert.match(prompt, /@stellar\/stellar-sdk/);
  assert.match(prompt, /JWT access tokens/);
  assert.match(prompt, /HttpOnly cookies/);
  assert.match(prompt, /bcrypt/);
  assert.match(prompt, /MFA/);
  assert.match(prompt, /SEP-24/);
  assert.match(prompt, /public\/piggy\.png/);
  assert.match(prompt, /No fake dashboard data/);
  assert.doesNotMatch(prompt, /APY|yield/i);
});
