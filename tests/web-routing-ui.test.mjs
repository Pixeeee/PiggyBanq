import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('web root is a warm-palette landing page and dashboard lives under dashboard route', () => {
  assert.equal(existsSync('apps/web/app/page.tsx'), true);
  assert.equal(existsSync('apps/web/app/(app)/dashboard/page.tsx'), true);

  const landing = readFileSync('apps/web/app/components/landing/SunnyHero.tsx', 'utf8');
  const dashboard = readFileSync('apps/web/app/(app)/dashboard/page.tsx', 'utf8');
  const css = readFileSync('apps/web/app/globals.css', 'utf8');

  assert.match(landing, /Small steps/);
  assert.match(landing, /Start Saving/);
  assert.match(landing, /Big dreams/);
  assert.match(landing, /href="\/signup"/);
  assert.match(landing, /SELF-CUSTODIAL/);
  assert.match(landing, /ResponsiveHeroMedia/);
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

test('interactive landing demos stay separate from real payment APIs', () => {
 const root=readFileSync('apps/web/app/page.tsx','utf8');
 const hero=readFileSync('apps/web/app/components/landing/SunnyHero.tsx','utf8');
 const agent=readFileSync('apps/web/app/components/landing/AgentDemo.tsx','utf8');
 const playground=readFileSync('apps/web/app/components/landing/SavingsPlayground.tsx','utf8');
 assert.match(root,/SunnyLanding/);
 assert.equal((hero.match(/href="\/signup"/g)||[]).length,1,'one primary signup action');
 for(const demo of [agent,playground]) assert.doesNotMatch(demo,/fetch\(|x402Request|signStellarTransaction|privateKey|secretKey/);
 assert.match(agent,/No funds moved/);
 assert.match(agent,/Approve demo plan/);
 assert.match(playground,/sample projection/);
 assert.match(playground,/simple-savings-view/);
});

test('Stellar auth uses the premium PiggyBanq split-screen design', () => {
  const landing = readFileSync('apps/web/app/page.tsx', 'utf8');
  const css = readFileSync('apps/web/app/globals.css', 'utf8');
  const component = readFileSync('apps/web/app/components/WalletAuthFlow.tsx', 'utf8');

  assert.match(component, /stellar-auth-brand-panel/);
  assert.match(component, /stellar-auth-workspace/);
  assert.match(component, /stellar-auth-progress/);
  assert.match(component, /ResponsiveHeroMedia/);
  const media = readFileSync('apps/web/app/components/ResponsiveHeroMedia.tsx', 'utf8');
  assert.match(media, /piggy-portrait\.webp/);
  assert.match(media, /prefers-reduced-motion/);
  assert.match(component, /className="stellar-auth-pig" src="\/piggy\.gif"/);
  assert.match(component, /function PigRail\(\)/);
  assert.match(component, /stellar-auth-pig-rail/);
  assert.equal((component.match(/<PigRail \/>/g) || []).length, 2);
  assert.match(component, /stellar-auth-login-card/);
  assert.doesNotMatch(component, /stellar-auth-mascot-dock/);
  assert.doesNotMatch(component, /stellar-auth-trust-list[\s\S]{0,240}className="stellar-auth-pig"/);
  assert.match(component, /Private keys stay encrypted on this device/);
  assert.match(component, /Stellar testnet/);
  assert.doesNotMatch(component, /stellar-auth-language/);

  assert.match(css, /Premium PiggyBanq auth experience/);
  assert.match(css, /\.stellar-auth-page\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1\.08fr\) minmax\(28rem, 0\.92fr\)/);
  assert.match(css, /\.stellar-auth-page\s*\{[\s\S]*font-family:\s*"Poppins", var\(--font-body\)/);
  assert.match(css, /\.stellar-auth-display[\s\S]*font-family:\s*"Source Serif 4", Georgia, serif/);
  assert.match(css, /@keyframes stellar-auth-pig-train/);
  assert.match(css, /--pig-footline:\s*-55\.9%/);
  assert.match(css, /--pig-track-lift:\s*-1\.125rem/);
  assert.match(css, /\.stellar-auth-pig-rail\s*\{[\s\S]*top:\s*var\(--pig-track-lift\)/);
  assert.match(css, /\.stellar-auth-pig-rail \.stellar-auth-pig[\s\S]*top:\s*0/);
  assert.match(css, /\.stellar-auth-pig-rail \.stellar-auth-pig[\s\S]*animation:\s*stellar-auth-pig-train 11s linear infinite/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.stellar-auth-pig-rail \.stellar-auth-pig[\s\S]*animation:\s*none/);
  assert.match(css, /\.stellar-auth-pig\s*\{[\s\S]*height:\s*auto/);
  assert.match(css, /\.stellar-auth-choice,\s*\.stellar-auth-card\s*\{[\s\S]*background:\s*var\(--auth-card\)/);
  assert.match(css, /@media \(max-width:\s*900px\)[\s\S]*\.stellar-auth-page\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);

  assert.match(landing, /SunnyLanding/);
});
