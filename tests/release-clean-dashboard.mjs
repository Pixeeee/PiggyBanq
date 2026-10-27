// Layout fixtures are intercepted only in this isolated QA browser, never in the app.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(new URL('../server/package.json', import.meta.url));
const { Keypair } = require('@stellar/stellar-sdk');
const wallet=Keypair.random();
const publicKey=wallet.publicKey();
const origin=process.env.RELEASE_WEB_URL ?? 'http://127.0.0.1:3010';
const api='https://piggybanq-api.onrender.com';
const authOrigin='https://piggy-banq-web.vercel.app';
const post=(path,body)=>fetch(`${api}${path}`,{method:'POST',headers:{origin:authOrigin,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
const challengeResponse=await post('/api/auth/stellar/challenge',{publicKey,purpose:'SIGN_UP',network:'TESTNET'});
assert.equal(challengeResponse.status,200);
const challenge=await challengeResponse.json();
const signup=await post('/api/auth/stellar/signup',{publicKey,username:`layout_${Date.now().toString(36)}`,displayName:'Mika',challengeId:challenge.challengeId,signature:Buffer.from(wallet.sign(Buffer.from(challenge.message))).toString('base64')});
assert.equal(signup.status,200);
const [name,...cookieParts]=signup.headers.get('set-cookie').split(';')[0].split('=');
const balances=Object.fromEntries(['XLM','USDC'].map(asset=>[asset,{assetCode:asset,issuer:null,balanceUnits:asset==='XLM'?'24873600000':'964200000',buyingLiabilitiesUnits:'0',sellingLiabilitiesUnits:'0',availableUnits:asset==='XLM'?'24873600000':'964200000',trustline:true,authorized:true,limitUnits:null}]));
const peer=Keypair.random().publicKey();
const records=Array.from({length:12},(_,i)=>({id:`fixture-${i}`,type:'payment',direction:i%3?'IN':'OUT',source:i%3?peer:publicKey,destination:i%3?publicKey:peer,assetCode:'XLM',assetIssuer:null,amountUnits:String((i%3?35:18)*10000000),transactionHash:'a'.repeat(64),successful:true,createdAt:new Date(Date.UTC(2026,9,27-i)).toISOString()}));
const capabilities={network:'TESTNET',mode:'LIVE_TESTNET',enabledAssets:['XLM','USDC'],operations:['PAYMENT','CHANGE_TRUST','PATH_PAYMENT_STRICT_SEND'],selfCustody:true,localSigning:true,yield:'SIMULATION_ONLY',binance:'DISABLED',cctp:'DISABLED',mainnet:'DISABLED',emergencyReadOnly:false};
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try {
 for(const [label,width,height,theme,reduced] of [['desktop',1440,1040,'light','no-preference'],['phone',390,844,'light','reduce'],['dark',1440,1040,'dark','reduce']]) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:reduced});
  await context.addCookies([{name,value:cookieParts.join('='),url:origin,httpOnly:true,secure:origin.startsWith('https:'),sameSite:'Lax'}]);
  await context.addInitScript(theme=>localStorage.setItem('piggybanq-theme',theme),theme);
  const page=await context.newPage(); const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/backend/api/stellar/me/summary',route=>route.fulfill({json:{status:'LIVE',network:'TESTNET',publicKey,sequence:'1',subentryCount:1,balances,refreshedAt:new Date().toISOString()}}));
  await page.route('**/backend/api/stellar/me/activity?*',route=>route.fulfill({json:{network:'TESTNET',records,refreshedAt:new Date().toISOString()}}));
  await page.route('**/backend/api/stellar/capabilities',route=>route.fulfill({json:capabilities}));
  await page.route('**/backend/budget/plans',route=>route.fulfill({json:{plans:[{id:'fixture',month:'2026-10',categories:[['Rainy day','500000'],['A little adventure','120000'],['New laptop','320000']].map(([name,amountMinor],i)=>({id:`plan-${i}`,name,amountMinor,currency:'PHP'}))}]}}));
  await page.goto(`${origin}/dashboard`,{waitUntil:'networkidle',timeout:90000});
  await page.getByRole('heading',{name:'Money flow',exact:true}).waitFor();
  await page.getByText('12 confirmed XLM payments',{exact:true}).waitFor();
  assert.deepEqual(await page.locator('.clean-flow-totals strong').allTextContents(),['280.00','72.00']);
  await page.getByRole('button',{name:'USDC',exact:true}).click();
  await page.getByText('0 confirmed USDC payments',{exact:true}).waitFor();
  await page.getByRole('button',{name:'XLM',exact:true}).click();
  for(const button of await page.locator('.banking-asset-selector button').all()) assert.ok((await button.boundingBox()).height>=44,'asset controls retain touch targets');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${label}: no horizontal overflow`);
  if(width>960) { const side=await page.locator('.savings-sidebar').boundingBox(); const app=await page.locator('.savings-dashboard-app').boundingBox(); assert.ok(Math.abs(side.height-app.height)<4,'sidebar fills the dashboard frame'); }
  const box=await page.locator('.banking-balance-card').boundingBox(); assert.ok(box.width>=280);
  if(reduced==='reduce') assert.equal(await page.locator('.banking-home-grid').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.screenshot({path:`qa-screenshots/clean-dashboard-${label}.png`,fullPage:true,animations:'disabled'});
  if(label==='desktop') await page.screenshot({path:'qa-screenshots/clean-dashboard-preview.png',animations:'disabled'});
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  assert.ok((await page.locator('.site-header').boundingBox()).y<=1);
  await page.getByRole('button',{name:'Open navigation menu'}).click();
  const menu=page.getByRole('dialog',{name:'Find your way'});
  await menu.getByRole('link',{name:'Savings plans',exact:true}).waitFor();
  await page.keyboard.press('Escape');
  await menu.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Hide balances',exact:true}).click();
  await page.getByText('Activity hidden',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Show balances',exact:true}).click();
  await page.getByRole('button',{name:'Receive',exact:true}).click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('button',{name:'Close receive address',exact:true}).click();
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('button',{name:'Close transaction dialog',exact:true}).click();
  assert.deepEqual(errors,[],`${label}: no browser errors`);
  await context.close();
 }
 console.log('PASS: clean dashboard at desktop/phone, dark mode, reduced motion, exact data totals, balance privacy and receive/send dialogs. Screenshots use isolated layout fixtures.');
} finally {await browser.close();}
