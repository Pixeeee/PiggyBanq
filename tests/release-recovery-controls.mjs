import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin=process.env.RELEASE_WEB_URL??'http://127.0.0.1:3010';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try {
 for(const fail of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(fail=>{window.qaCopies=[];Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(fail)throw new Error('denied');window.qaCopies.push(text);}}});},fail);
  const page=await context.newPage();await page.goto(`${origin}/signup`,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Create a local wallet',exact:true}).click();
  await page.getByLabel('Username',{exact:true}).fill('copy_qa');
  await page.getByLabel('Create new password',{exact:true}).fill('SampleOnly!23456');
  await page.getByLabel('Confirm password',{exact:true}).fill('SampleOnly!23456');
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Create password',exact:true}).click();
  const copy=page.getByRole('button',{name:'Copy recovery phrase',exact:true});
  assert.equal(await copy.isDisabled(),true);assert.equal(await page.evaluate(()=>window.qaCopies.length),0);
  await page.getByRole('button',{name:/Tap to reveal/}).click();
  assert.deepEqual(await page.locator('.stellar-phrase-number').allTextContents(),Array.from({length:12},(_,i)=>String(i+1)));
  const words=await page.locator('.stellar-phrase-word').allTextContents();await copy.click();
  if(fail){await page.getByRole('status').filter({hasText:'Could not copy'}).waitFor();assert.equal(await page.evaluate(()=>window.qaCopies.length),0);}
  else{await page.getByRole('status').filter({hasText:'Recovery phrase copied'}).waitFor();assert.equal(await page.evaluate(()=>window.qaCopies[0]),words.join(' '));}
  assert.equal(await page.getByRole('button',{name:'Continue',exact:true}).isDisabled(),true,'copy does not acknowledge or confirm the phrase');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(!fail)await page.screenshot({path:'qa-screenshots/recovery-controls-phone.png',fullPage:true,mask:[page.locator('.stellar-phrase-word')],animations:'disabled'});
  await context.close();console.log(`PASS: numbered recovery words and user-triggered clipboard ${fail?'failure':'success'}; confirmation still required`);
 }
}finally{await browser.close();}
