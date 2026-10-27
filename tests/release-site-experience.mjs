import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin=process.env.RELEASE_WEB_URL ?? 'http://127.0.0.1:3010';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try {
 for(const [width,height] of [[320,740],[390,844],[430,932],[1440,1000]]) {
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'no-preference'});
  const page=await context.newPage(); const videos=[]; const errors=[];
  page.on('request',request=>{if(request.url().endsWith('.mp4'))videos.push(request.url());});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Pause background animation'}).waitFor();
  await page.waitForFunction(()=>document.querySelector('video')?.getAttribute('src'));
  assert.ok(videos.length>0);
  assert.ok(videos.every(url=>url.endsWith(width<=700?'piggy-portrait.mp4':'piggy-landscape.mp4')),`only intended video at ${width}px`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const cue=await page.locator('.hero-scroll-cue').boundingBox();
  assert.ok(cue.y+cue.height<=height+1,'scroll cue is in the initial viewport');
  await page.getByRole('button',{name:'Pause background animation'}).click();
  assert.equal(await page.locator('video').evaluate(el=>el.paused),true);
  await page.screenshot({path:`qa-screenshots/persistent-hero-${width}.png`,animations:'disabled'});
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  assert.ok((await page.locator('.site-header').boundingBox()).y<=1);
  await page.getByRole('button',{name:'Open navigation menu'}).click();
  const dialog=page.getByRole('dialog',{name:'Find your way'});
  await dialog.waitFor();
  assert.equal(await page.getByRole('button',{name:'Close navigation menu'}).evaluate(el=>el===document.activeElement),true);
  await dialog.getByRole('link').last().focus(); await page.keyboard.press('Tab');
  assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true,'keyboard focus stays inside menu');
  await page.keyboard.press('Escape'); await dialog.waitFor({state:'hidden'});
  assert.equal(await page.getByRole('button',{name:'Open navigation menu'}).evaluate(el=>el===document.activeElement),true);
  await page.getByRole('button',{name:'Open navigation menu'}).click();
  await dialog.getByRole('link',{name:'How it works',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  await page.waitForFunction(()=>location.hash==='#how');
  await page.waitForFunction(()=>document.querySelector('#how').getBoundingClientRect().top>=document.querySelector('.site-header').getBoundingClientRect().bottom-1);
  if(width===390) {
   await page.setViewportSize({width:1200,height:900}); await page.evaluate(()=>scrollTo(0,0));
   await page.getByRole('button',{name:'Play background animation'}).click();
   await page.waitForFunction(()=>document.querySelector('video')?.getAttribute('src')?.includes('landscape'));
   assert.equal(await page.locator('video').count(),1);
  }
  await page.goto(`${origin}/login`,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Open navigation menu'}).click();
  await page.getByRole('button',{name:'Close navigation menu'}).click();
  assert.deepEqual(errors,[]);
  console.log(`PASS: persistent navigation, focus, Escape, anchors, composition and media selection at ${width}x${height}`);
  await context.close();
 }
 for(const mode of ['reduced','failure']) {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  const page=await context.newPage();const videos=[];
  page.on('request',r=>{if(r.url().endsWith('.mp4'))videos.push(r.url());});
  if(mode==='failure')await page.route('**/*.mp4',route=>route.abort());
  await page.goto(origin,{waitUntil:'networkidle'});
  assert.ok(await page.locator('.responsive-hero-media img').evaluate(el=>el.complete&&el.naturalWidth>0));
  if(mode==='reduced')assert.deepEqual(videos,[],'reduced motion fetches no video');
  await page.getByRole('button',{name:'Open navigation menu'}).click();
  await page.getByRole('button',{name:'Close navigation menu'}).click();
  await page.screenshot({path:`qa-screenshots/persistent-hero-${mode}.png`,animations:'disabled'});
  console.log(`PASS: usable poster and navigation in ${mode} mode`);await context.close();
 }
}finally{await browser.close();}
