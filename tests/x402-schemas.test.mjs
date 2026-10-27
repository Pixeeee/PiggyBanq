import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../server/package.json', import.meta.url));
const stellarRequire = createRequire(require.resolve('@x402/stellar'));
const coreRequire = createRequire(stellarRequire.resolve('@x402/core/schemas'));
const requirements = { scheme: 'exact', network: 'stellar:testnet', asset: 'token', amount: '1000', payTo: 'merchant', maxTimeoutSeconds: 60, extra: { areFeesSponsored: true } };
const resource = { url: 'https://example.test/api', description: 'test', mimeType: 'application/json' };

test('x402 ESM and CJS schemas use patched Zod 4 and preserve payment records', async () => {
  assert.match(coreRequire('zod/package.json').version, /^4\.6\.[7-9]|^4\.[7-9]\./);
  for (const schemas of [stellarRequire('@x402/core/schemas'), await import(stellarRequire.resolve('@x402/core/schemas').replace('/cjs/', '/esm/').replace(/\.js$/, '.mjs'))]) {
    const payload = { x402Version: 2, accepted: requirements, resource, payload: { transaction: 'envelope' } };
    assert.deepEqual(schemas.validatePaymentPayload(payload), payload);
    const challenge = { x402Version: 2, resource, accepts: [requirements] };
    assert.deepEqual(schemas.validatePaymentRequired(challenge), challenge);
    assert.equal(schemas.isPaymentPayload({ ...payload, payload: null }), false);
    assert.equal(schemas.isPaymentRequirements({ ...requirements, network: 42 }), false);
    const oversized = schemas.ResourceInfoSchema.safeParse({ ...resource, tags: Array(10000).fill(null) });
    assert.equal(oversized.success, false);
    assert.equal(oversized.error.issues.length, 1, 'oversized constrained arrays fail before per-element issue allocation');
  }
});
