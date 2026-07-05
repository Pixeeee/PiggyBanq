import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('web root is a warm-palette landing page and dashboard lives under dashboard route', () => {
  assert.equal(existsSync('apps/web/app/page.tsx'), true);
  assert.equal(existsSync('apps/web/app/(app)/dashboard/page.tsx'), true);

  const landing = readFileSync('apps/web/app/page.tsx', 'utf8');
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');
  const css = readFileSync('apps/web/app/globals.css', 'utf8');

  assert.match(landing, /No-KYC micro savings/);
  assert.match(landing, /Start Saving/);
  assert.match(landing, /Self-custodial/);
  assert.match(landing, /\/piggy\.png/);
  assert.doesNotMatch(landing, /E2EE|APY|yield/i);

  assert.match(dashboard, /WALLET FOUNDATION/);
  assert.doesNotMatch(dashboard, /₱12,345\.67|G\.\.\.B4T2|G\.\.\.9KLM|Emergency Fund/);
  assert.match(dashboard, /Beware of phishing/);
  assert.match(dashboard, /No wallet linked/);

  assert.match(css, /--cream:\s*#FFF7CD/i);
  assert.match(css, /--peach:\s*#FDC3A1/i);
  assert.match(css, /--salmon:\s*#FB9B8F/i);
  assert.match(css, /--rose:\s*#F57799/i);
  assert.match(css, /background-image:\s*url\("\/piggy\.png"\)/);
});
