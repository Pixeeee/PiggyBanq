// Disposable funded Testnet wallet; never run this with a user's recovery phrase.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(new URL('../server/package.json', import.meta.url));
const { register } = await import(require.resolve('tsx/esm/api'));
register();
const secure = await import('../apps/web/app/(app)/dashboard/secure-wallet.ts');
const { Keypair } = require('@stellar/stellar-sdk');
const origin = 'https://piggy-banq-web.vercel.app';
globalThis.localStorage = { getItem: () => null };
const password = 'DisposableWeb!402';
const username = `web402_${Date.now().toString(36)}`;
const prepared = await secure.prepareSecureWalletAccount({ username, password, recoveryPhrase: secure.generateRecoveryPhrase() });
const { vault, ...encrypted } = prepared;
const signer = Keypair.fromSecret(vault.secretKey);
const funded = await fetch(`https://friendbot.stellar.org/?addr=${prepared.publicKey}`, { signal: AbortSignal.timeout(45000) });
assert.equal(funded.ok, true);
const request = (path, body) => fetch(`${origin}/backend${path}`, { method:'POST', headers:{'content-type':'application/json', origin}, body:JSON.stringify(body), signal:AbortSignal.timeout(90000) });
const challenge = await (await request('/api/auth/stellar/challenge',{publicKey:prepared.publicKey,purpose:'SIGN_UP',network:'TESTNET'})).json();
const signup = await request('/api/auth/stellar/signup',{publicKey:prepared.publicKey,username,challengeId:challenge.challengeId,signature:Buffer.from(signer.sign(Buffer.from(challenge.message))).toString('base64')});
assert.equal(signup.status,200);
const cookie = signup.headers.get('set-cookie').split(';')[0];
const [name,...value] = cookie.split('=');
const browser = await chromium.launch({headless:true,executablePath:process.env.RELEASE_BROWSER_EXECUTABLE ?? '/usr/bin/google-chrome',args:['--no-sandbox']});
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addCookies([{name,value:value.join('='),url:origin,httpOnly:true,secure:true,sameSite:'Lax'}]);
 await context.addInitScript(({encrypted,username,publicKey})=>{
  if(!localStorage.getItem('piggybanq.walletAccounts')) localStorage.setItem('piggybanq.walletAccounts',JSON.stringify([encrypted]));
  localStorage.setItem('piggybanq.activeWalletSession',JSON.stringify({username,publicKey,loginAt:new Date().toISOString()}));
 },{encrypted,username,publicKey:prepared.publicKey});
 const page=await context.newPage();
 await page.goto(`${origin}/dashboard/agent`,{waitUntil:'networkidle',timeout:90000});
 await page.getByRole('button',{name:'Preview test API payment',exact:true}).click();
 await page.getByRole('button',{name:'Approve payment',exact:true}).click();
 await page.getByLabel('Local wallet password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Sign locally and pay',exact:true}).click();
 await page.getByText('Payment verified on Stellar Testnet. The paid API returned its result.',{exact:true}).waitFor({timeout:90000});
 await page.getByRole('heading',{name:'Build a small emergency buffer',exact:true}).waitFor();
 await page.screenshot({path:new URL('../qa-screenshots/x402-web-verified.png',import.meta.url).pathname,fullPage:true,animations:'disabled'});
 const receipt=await page.locator('a[href*="stellar.expert/explorer/testnet/tx/"]').getAttribute('href');
 assert.match(receipt,/\/tx\/[a-f0-9]{64}$/);
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Refresh payment status',exact:true}).click();
 await page.getByText('Verified receipt recovered. This result does not require another payment.',{exact:true}).waitFor({timeout:90000});
 console.log('PASS: hosted web UI preview, explicit approval, local password/signing, real x402 settlement and receipt recovery.',receipt);
} finally { await browser.close(); }
