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

async function enlarge(page,scale){
 await page.evaluate(scale=>{
  const styles=[...document.querySelectorAll('body *')].map(el=>[el,getComputedStyle(el).fontSize,getComputedStyle(el).lineHeight]);
  for(const [el,size,line] of styles){el.style.fontSize=`${parseFloat(size)*scale}px`;if(line!=='normal')el.style.lineHeight=`${parseFloat(line)*scale}px`;}
 },scale);
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForTimeout(200);
}
async function audit(page,label){
 const issues=await page.evaluate(width=>{
  const issues=[];
  if(document.documentElement.scrollWidth>width+1)issues.push('page horizontal overflow');
  for(const el of document.querySelectorAll('h1,h2,h3,p,label,button,a,input,select,textarea')){
   const r=el.getBoundingClientRect(),s=getComputedStyle(el);
   if(!r.width||!r.height||s.visibility==='hidden'||s.display==='none')continue;
   if(['hidden','clip'].includes(s.overflowY)&&el.scrollHeight>el.clientHeight+2)issues.push(`${el.tagName}.${el.className}: vertically clipped`);
   if(r.left < -1 || r.right > width+1)issues.push(`${el.tagName}.${el.className}: outside viewport`);
   if(el.matches('button,a')&&el.textContent.trim()&&el.scrollWidth>el.clientWidth+2)issues.push(`${el.tagName}.${el.className}: label wider than control`);
  }
  return issues;
 },page.viewportSize().width);
 console.log(label,JSON.stringify(issues));
 assert.deepEqual(issues,[],label+' must fit the phone without clipping');
 await page.screenshot({path:`qa-screenshots/large-text-${label}.png`,fullPage:true,animations:'disabled'});
 return issues;
}
try {
 for(const width of [360,390])for(const scale of [1,2]){
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
  await context.addCookies([{name,value:cookieParts.join('='),url:origin,httpOnly:true,secure:origin.startsWith('https:'),sameSite:'Lax'}]);
  const page=await context.newPage();
  await page.goto(`${origin}/login`,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Create a local wallet',exact:true}).click();
  await page.evaluate(()=>document.fonts.ready);await enlarge(page,scale);
  await audit(page,`signup-${width}-${scale}`);
  await page.route('**/backend/api/stellar/capabilities',route=>route.fulfill({json:capabilities}));
  await page.route('**/backend/budget/plans',route=>route.fulfill({json:{plans:[]}}));
  await page.route('**/backend/api/stellar/me/summary',route=>route.fulfill({json:{status:'LIVE',network:'TESTNET',publicKey,sequence:'1',subentryCount:1,balances,refreshedAt:new Date().toISOString()}}));
  await page.route('**/backend/api/stellar/me/activity?*',route=>route.fulfill({json:{network:'TESTNET',records,refreshedAt:new Date().toISOString()}}));
  await page.goto(`${origin}/dashboard`,{waitUntil:'networkidle',timeout:90000});await page.getByRole('heading',{name:'Money flow',exact:true}).waitFor();
  await page.evaluate(()=>document.fonts.ready);await enlarge(page,scale);
  await audit(page,`dashboard-${width}-${scale}`);
  await page.screenshot({path:`qa-screenshots/bottom-nav-${width}-${scale}.png`,animations:'disabled'});
  const bar=page.getByRole('navigation',{name:'Mobile primary navigation',exact:true});
  assert.equal(await bar.getByRole('link').count(),4);
  assert.equal(await bar.locator('span').evaluateAll(labels=>labels.every(label=>{const range=document.createRange();range.selectNodeContents(label);return range.getClientRects().length===1;})),true,'short navigation labels stay whole');assert.equal(await page.locator('.savings-sidebar').isVisible(),false);
  await page.getByRole('button',{name:'More dashboard pages',exact:true}).click();
  const menu=page.getByRole('dialog',{name:'More wallet tools',exact:true});
  assert.equal(await menu.getByRole('link').count(),4);
  await audit(page,`more-${width}-${scale}`);
  await page.getByRole('button',{name:'Close dashboard pages',exact:true}).click();
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  const spacing=await page.evaluate(()=>{
   const bar=document.querySelector('.banking-bottom-nav').getBoundingClientRect(),workspace=document.querySelector('.savings-workspace');
   return {barBottom:bar.bottom,barTop:bar.top,contentBottom:workspace.getBoundingClientRect().bottom-parseFloat(getComputedStyle(workspace).paddingBottom)};
  });
  assert.ok(Math.abs(spacing.barBottom-844)<2,'mobile bar stays at viewport bottom');
  assert.ok(spacing.contentBottom<=spacing.barTop,'last content clears enlarged navigation');
  if(scale===2)for(const route of ['goals','allocations','pockets','agent','profile']){
   await page.waitForTimeout(6000);await page.goto(`${origin}/dashboard/${route}`,{waitUntil:'networkidle',timeout:90000});
   await page.locator('.savings-dashboard-shell').waitFor();await enlarge(page,scale);await audit(page,`${route}-${width}-${scale}`);
   if(route==='pockets')for(const tool of ['Swap','Yield Lab']){
    await page.getByRole('button',{name:'More dashboard pages',exact:true}).click();
    await page.getByRole('dialog',{name:'More wallet tools',exact:true}).getByRole('link',{name:tool,exact:true}).click();
    await page.getByRole('dialog',{name:'More wallet tools',exact:true}).waitFor({state:'hidden'});
   }
  }
  await context.close();
 }
 const desktop=await browser.newContext({viewport:{width:1440,height:1040}});
 await desktop.addCookies([{name,value:cookieParts.join('='),url:origin,httpOnly:true,secure:origin.startsWith('https:'),sameSite:'Lax'}]);
 const desktopPage=await desktop.newPage();await desktopPage.goto(`${origin}/dashboard`,{waitUntil:'networkidle',timeout:90000});
 assert.equal(await desktopPage.locator('.savings-sidebar').isVisible(),true,'desktop retains sidebar');
 assert.equal(await desktopPage.locator('.banking-bottom-nav').isVisible(),false,'bottom navigation is mobile-only');
 await desktop.close();
 console.log('PASS: mobile typography and bottom navigation at 360/390px and 100/200% text; all dashboard routes checked at 200%.');
} finally {await browser.close();}
