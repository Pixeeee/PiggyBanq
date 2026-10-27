import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin=process.env.RELEASE_WEB_URL??'http://127.0.0.1:3010';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try {
 for(const width of [320,390,768,1440,1920]) {
  const context=await browser.newContext({viewport:{width,height:width<701?844:1000},reducedMotion:'no-preference'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:/SMALL.*SAVINGS/}).waitFor();
  assert.equal(await page.locator('.editorial-hero a[href="/signup"]').count(),1,'one primary signup action');
  assert.equal(await page.locator('.editorial-hero a[href="#how"]').count(),1,'one scroll control');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}: no overflow`);
  if(width>700){
   const action=await page.getByRole('link',{name:'Start Saving',exact:true}).boundingBox();
   const facts=await page.locator('.editorial-facts').boundingBox();
   assert.ok(action.y+action.height<facts.y,'fact cards do not cover the main action');
  }
  const statement=page.locator('.editorial-statement');
  const initial=await statement.locator('[data-word]').last().evaluate(el=>getComputedStyle(el).color);
  await page.locator('.editorial-trust').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-word]')).every(el=>getComputedStyle(el).color==='rgb(255, 243, 238)'));
  assert.notEqual(initial,'rgb(255, 243, 238)','words fill as the page scrolls');
  await page.waitForFunction(()=>document.querySelector('[data-count]')?.textContent==='100');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.waitForFunction(()=>scrollY<1);
  await page.screenshot({path:`qa-screenshots/editorial-page-${width}.png`,fullPage:true,animations:'disabled'});
  if(width===1440)await page.screenshot({path:'qa-screenshots/editorial-hero-desktop.png',animations:'disabled'});
  await page.getByRole('link',{name:'Start Saving',exact:true}).click();
  await page.waitForURL('**/signup');
  assert.deepEqual(errors,[]);console.log(`PASS: editorial sections, scroll fill, counter, signup and overflow at ${width}px`);await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();const videos=[];page.on('request',r=>{if(r.url().endsWith('.mp4'))videos.push(r.url());});
 await page.goto(origin,{waitUntil:'networkidle'});
 assert.deepEqual(videos,[]);
 assert.equal(await page.locator('[data-count]').textContent(),'100');
 assert.equal(await page.locator('[data-word]').first().evaluate(el=>getComputedStyle(el).color),'rgb(255, 243, 238)');
 assert.equal(await page.locator('.editorial-landing').evaluate(el=>el.getAnimations({subtree:true}).length),0);
 console.log('PASS: reduced motion displays complete statement/counter and loads no video');await context.close();
}finally{await browser.close();}
