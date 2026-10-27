'use client';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SunnyHero } from './SunnyHero';
import { SavingsStory } from './SavingsStory';
import { SavingsPlayground } from './SavingsPlayground';
import { AgentDemo } from './AgentDemo';
import { capabilities } from './content';
import { SunnyIntro, useSunnyMotion } from './SunnyMotion';
import { useMotionPreference } from './useMotionPreference';

const belief='A little intention. A little consistency. A future that feels a little more yours.';
const reasons=[
 {title:'Your keys stay with you.',text:'PiggyBanq keeps your wallet keys encrypted on your device. Your recovery phrase is your backup—save it somewhere only you can access.',symbol:'⌁'},
 {title:'Every move gets a moment.',text:'Review the asset, amount, destination and fee. Real payments require your explicit approval and a signature from your own wallet.',symbol:'✓'},
 {title:'Practice without the pressure.',text:'PiggyBanq currently runs on Stellar Testnet. Learn the flows with test tokens, which have no monetary value. PiggyBanq is not a bank.',symbol:'✳'}
];

export function SunnyLanding() {
 const root=useRef<HTMLElement>(null),reduced=useMotionPreference();
 const [chapter,setChapter]=useState(0),[reason,setReason]=useState(0);
 useSunnyMotion(root);
 const progress=useCallback((index:number)=>setChapter(index),[]);
 const chooseChapter=useCallback((index:number,scroll=true)=>{
  setChapter(index);
  const trigger=ScrollTrigger.getById('piggy-story');
  if(trigger){window.scrollTo({top:trigger.start+(trigger.end-trigger.start)*(index+.1)/4,behavior:reduced?'instant':'smooth'});}
  else if(scroll)document.getElementById('how')?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});
 },[reduced]);
 return <main className="sunny-landing relative isolate" ref={root}>
  <SunnyIntro/>
  <SunnyHero onChapter={chooseChapter}/>
  <section className="sunny-mission sunny-section" aria-labelledby="sunny-belief-title"><p className="sunny-eyebrow">NOT EVERY DREAM STARTS BIG.</p><h2 id="sunny-belief-title">{belief.split(' ').map((word,i)=><span key={i} data-mission-word>{word}{' '}</span>)}</h2><p className="sunny-mission-foot">A self-custodial wallet for everyday possibilities.<br/>Built around your goals. Held in your hands.</p></section>
  <SavingsStory chapter={chapter} onChapter={chooseChapter} onProgress={progress}/>
  <SavingsPlayground/>
  <section id="security" tabIndex={-1} className="sunny-why sunny-section" aria-labelledby="why-title">
   <div className="sunny-kinetic" aria-hidden="true"><span className="sunny-kinetic-word">YOURS. ALWAYS.</span></div>
   <div className="sunny-why-layout"><div data-sunny-reveal><p className="sunny-eyebrow">A LITTLE MORE PEACE OF MIND.</p><h2 id="why-title">Good habits.<br/>Clear boundaries.</h2><div className={`sunny-reason-symbol reason-symbol-${reason}`} aria-hidden="true">{reasons[reason].symbol}</div></div><div className="sunny-reasons">{reasons.map((item,index)=><div className={index===reason?'sunny-reason is-active':'sunny-reason'} key={item.title}><button aria-expanded={index===reason} aria-controls={`reason-${index}`} onClick={()=>setReason(index)}><span>{String(index+1).padStart(2,'0')}</span><strong>{item.title}</strong><i aria-hidden="true">{index===reason?'−':'＋'}</i></button><p id={`reason-${index}`} hidden={index!==reason}>{item.text}</p></div>)}</div></div>
  </section>
  <AgentDemo/>
  <section className="sunny-capabilities sunny-section" aria-labelledby="capabilities-title"><div className="sunny-section-heading" data-sunny-reveal><p className="sunny-eyebrow">EXPLORE WHAT’S POSSIBLE</p><h2 id="capabilities-title">A little world of possibilities.</h2><p>Open a chapter to see what’s already inside PiggyBanq.</p></div><div className="sunny-capability-list">{capabilities.map((item,index)=><details key={item.title}><summary aria-label={item.title}><span>{String(index+1).padStart(2,'0')}</span><h3>{item.title}</h3><i aria-hidden="true">↗</i></summary><p>{item.text}</p></details>)}</div></section>
  <section id="network" className="sunny-closing sunny-section" aria-labelledby="closing-title" tabIndex={-1}><div data-sunny-reveal><p className="sunny-eyebrow">ONE SMALL STEP IS STILL A STEP.</p><h2 id="closing-title">Your next chapter<br/>starts with you.</h2><p>Bring a little curiosity. We’ll make room for the possibilities.</p><a className="sunny-pill sunny-pill-rose" href="#top">Back to the beginning <span aria-hidden="true">↑</span></a></div><div className="sunny-closing-mark" aria-hidden="true"><img src="/media/piggy-portrait.webp" width="360" height="640" alt="" loading="lazy"/></div></section>
  <footer className="sunny-footer"><Link className="sunny-footer-brand" href="/" prefetch={false}><img src="/media/piggy-mark.webp" width="24" height="36" alt=""/>PiggyBanq</Link><p>Small savings. Brighter tomorrows.</p><nav aria-label="Footer navigation"><Link href="/login" prefetch={false}>Sign in ↗</Link><Link href="/dashboard" prefetch={false}>Dashboard ↗</Link><a href="#security">Your keys ↗</a></nav><div className="sunny-footer-notes"><span>© 2026 PiggyBanq · Stellar Testnet only · Not a bank</span><span>Private keys stay on your device. Never share your recovery phrase.</span></div></footer>
 </main>;
}
