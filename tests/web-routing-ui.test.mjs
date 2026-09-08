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
  assert.match(landing, /Create wallet/);
  assert.match(landing, /href="\/signup"/);
  assert.match(landing, /Self-custodial/);
  assert.match(landing, /\/piggy\.png/);
  assert.doesNotMatch(landing, /E2EE|APY|yield/i);

  assert.match(dashboard, /PortfolioDashboard/);
  assert.match(dashboard, /requireWalletSession/);
  assert.doesNotMatch(dashboard, /\/dashboard\/community|relief|Global chat|Private chat/i);

  assert.match(css, /--cream:\s*#FFF7CD/i);
  assert.match(css, /--peach:\s*#FDC3A1/i);
  assert.match(css, /--salmon:\s*#FB9B8F/i);
  assert.match(css, /--rose:\s*#F57799/i);
  assert.match(css, /background-image:\s*url\("\/piggy\.png"\)/);
});

test('landing content uses the approved white bento reference layout without unrelated copy', () => {
  const landing = readFileSync('apps/web/app/page.tsx', 'utf8');
  const css = readFileSync('apps/web/app/globals.css', 'utf8');

  assert.match(landing, /landing-metrics/);
  assert.match(landing, /landing-bento-grid/);
  assert.match(landing, /landing-content-banner/);
  assert.match(landing, /landing-footer/);
  assert.match(landing, /Architected for calm, self-custodial money habits/);
  assert.match(landing, /Private keys stay on your device/);
  assert.doesNotMatch(landing, /Nexus|Revenue Acceleration|Search Visibility|Web Architecture|Case Studies/);
  assert.match(css, /\.landing-content-sections\s*\{[\s\S]*font-family:\s*"Poppins", var\(--font-body\)/);
  assert.match(css, /\.landing-content-sections\s*\{[\s\S]*background:\s*#fff/);
  assert.match(css, /\.landing-content-sections \.landing-bento-grid\s*\{/);
  assert.match(css, /\.landing-content-sections \.landing-bento-tall\s*\{[\s\S]*grid-row:\s*1 \/ 3/);
  assert.match(css, /\.landing-content-sections \.landing-bento-wide\s*\{[\s\S]*grid-column:\s*2 \/ 4/);
});

test('Stellar auth uses the premium PiggyBanq split-screen design', () => {
  const landing = readFileSync('apps/web/app/page.tsx', 'utf8');
  const css = readFileSync('apps/web/app/globals.css', 'utf8');
  const component = readFileSync('apps/web/app/components/WalletAuthFlow.tsx', 'utf8');

  assert.match(component, /stellar-auth-brand-panel/);
  assert.match(component, /stellar-auth-workspace/);
  assert.match(component, /stellar-auth-progress/);
  assert.match(component, /src="\/piggy_bg\.mp4"/);
  assert.match(component, /poster="\/piggy\.png"/);
  assert.match(component, /className="stellar-auth-pig" src="\/piggy\.gif"/);
  assert.match(component, /stellar-auth-mascot-dock/);
  assert.match(component, /screen === 'choice' \|\| screen === 'login'/);
  assert.match(component, /Encrypted locally · Self-custodial/);
  assert.match(component, /stellar-auth-login-card/);
  assert.doesNotMatch(component, /stellar-auth-trust-list[\s\S]{0,240}className="stellar-auth-pig"/);
  assert.match(component, /Private keys stay encrypted on this device/);
  assert.match(component, /Stellar testnet/);
  assert.doesNotMatch(component, /stellar-auth-language/);

  assert.match(css, /Premium PiggyBanq auth experience/);
  assert.match(css, /\.stellar-auth-page\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1\.08fr\) minmax\(28rem, 0\.92fr\)/);
  assert.match(css, /\.stellar-auth-page\s*\{[\s\S]*font-family:\s*"Poppins", var\(--font-body\)/);
  assert.match(css, /\.stellar-auth-display[\s\S]*font-family:\s*"Source Serif 4", Georgia, serif/);
  assert.match(css, /\.stellar-auth-mascot-dock \.stellar-auth-pig\s*\{[\s\S]*position:\s*static/);
  assert.match(css, /\.stellar-auth-pig\s*\{[\s\S]*height:\s*auto/);
  assert.match(css, /\.stellar-auth-choice,\s*\.stellar-auth-login-card\s*\{[\s\S]*background:\s*var\(--auth-card\)/);
  assert.match(css, /@media \(max-width:\s*900px\)[\s\S]*\.stellar-auth-page\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);

  assert.match(landing, /className="landing-hero-section"/);
  assert.match(landing, /src="\/piggy_bg\.mp4"/);
});
