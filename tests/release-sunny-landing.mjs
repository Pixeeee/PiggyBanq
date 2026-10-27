import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin=process.env.RELEASE_WEB_URL??'http://127.0.0.1:3010';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 for(const width of [360,390,768,1024,1440]) {
  const context=await browser.newContext({viewport:{width,height:width<800?844:1000},reducedMotion:'no-preference'});
  const page=await context.newPage(),errors=[],payments=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/backend/'))payments.push(r.url());});
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Small steps. Big dreams.'}).waitFor({timeout:process.env.RED_CHECK?2000:30000});
  await page.locator('.sunny-intro').waitFor({state:'hidden',timeout:4000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}px: no page overflow`);
  await page.getByRole('button',{name:'Open navigation menu'}).click();
  await page.getByRole('dialog',{name:'Find your way'}).waitFor();await page.keyboard.press('Escape');
  if(width===1440){
   await page.getByRole('link',{name:'Our story',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.sunny-story-count')?.textContent?.includes('01'));
   await page.waitForTimeout(800);
   const before=await page.locator('.sunny-story-count').textContent();
   await page.evaluate(()=>scrollBy({top:650,behavior:'instant'}));
   await page.waitForFunction(before=>document.querySelector('.sunny-story-count')?.textContent!==before,before);
   const story=await page.locator('#how').boundingBox();assert.ok(story.y>60&&story.y<105,'desktop story stays pinned while its chapter changes');
  }
  await page.getByRole('link',{name:'Try the playground',exact:true}).click();
  await page.getByRole('heading',{name:'Make room for your dreams.'}).waitFor();
  const saved=page.getByTestId('demo-saved');
  await page.getByRole('slider',{name:'Monthly saving in pesos'}).press('Home');
  await page.waitForFunction(()=>document.querySelector('[data-testid="demo-saved"]')?.textContent?.includes('600'));
  await page.getByRole('button',{name:'Add a demo saving'}).click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="demo-saved"]')?.textContent?.includes('700'));
  await page.getByRole('radio',{name:'New laptop',exact:true}).click();
  await page.getByRole('tab',{name:'Review',exact:true}).click();
  await page.getByText('Every real payment needs your review.',{exact:true}).waitFor();
  if(width===1440){
   const canvas=page.locator('#playground canvas');await canvas.waitFor({timeout:30000});
   await page.getByRole('button',{name:'Enable rotate view',exact:true}).click();
   await page.waitForTimeout(1500);const before=await canvas.screenshot();const box=await canvas.boundingBox();
   await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.55,{steps:12});await page.mouse.up();await page.waitForTimeout(500);
   assert.equal(before.equals(await canvas.screenshot()),false,'dragging changes the real 3D scene');
   await page.getByRole('button',{name:'Finish rotating',exact:true}).click();
  }
  await page.getByRole('button',{name:'Use simple view',exact:true}).click();
  await page.getByTestId('simple-savings-view').waitFor();
  await page.getByRole('button',{name:'Reset playground',exact:true}).click();
  await page.getByRole('heading',{name:'A little help. You approve.'}).scrollIntoViewIfNeeded();
  assert.equal(await page.getByRole('button',{name:'Approve demo plan',exact:true}).count(),0);
  await page.getByRole('button',{name:'Preview demo plan',exact:true}).click();
  await page.getByRole('button',{name:'Approve demo plan',exact:true}).click();
  await page.getByText('Demo receipt ready. No funds moved.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Reset agent demo',exact:true}).click();
  await page.getByLabel('Paid API requests',{exact:true}).press('Enter');
  await page.getByText(/Explore x402 on Stellar Testnet/).waitFor();
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`qa-screenshots/sunny-landing-${width}.png`,animations:'disabled'});
  assert.deepEqual(errors,[]);assert.deepEqual(payments,[],'landing demos make no backend/payment requests');
  await page.getByRole('link',{name:'Start Saving',exact:true}).click();await page.waitForURL('**/signup');
  assert.equal(await page.locator('.pin-spacer').count(),0,'pinned story cleans up on navigation');
  assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.locator('.site-header-sunny').count(),0);
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${width}px navigation, demo savings, mode/goal controls, simple fallback, explicit agent approval and no backend calls`);
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage(),videos=[];page.on('request',r=>{if(r.url().endsWith('.mp4'))videos.push(r.url());});
 await page.goto(origin,{waitUntil:'networkidle'});
 assert.deepEqual(videos,[]);assert.equal(await page.locator('.sunny-intro').count(),0);
 await page.getByRole('link',{name:'Try the playground',exact:true}).click();
 await page.getByTestId('simple-savings-view').waitFor();
 assert.equal(await page.locator('#playground canvas').count(),0);
 console.log('PASS: reduced motion has no video, loader or WebGL; simple controls remain available');await context.close();
 const fallbackBrowser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-webgl']});
 const fallback=await fallbackBrowser.newPage({viewport:{width:1440,height:1000}});await fallback.goto(origin,{waitUntil:'networkidle'});
 await fallback.getByRole('link',{name:'Try the playground',exact:true}).click();await fallback.getByTestId('simple-savings-view').waitFor();
 await fallback.getByRole('button',{name:'Add a demo saving'}).click();
 console.log('PASS: WebGL unavailable uses an interactive simple view');await fallbackBrowser.close();
}finally{await browser.close();}
