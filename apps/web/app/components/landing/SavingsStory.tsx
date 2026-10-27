'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { chapters } from './content';
import { SavingsArt } from './SavingsArt';
import { useMotionPreference } from './useMotionPreference';

export function SavingsStory({chapter,onChapter,onProgress}:{chapter:number;onChapter:(index:number,scroll?:boolean)=>void;onProgress:(index:number)=>void}) {
 const root=useRef<HTMLElement>(null),reduced=useMotionPreference();
 useEffect(()=>{
  gsap.registerPlugin(ScrollTrigger);
  const media=gsap.matchMedia();
  media.add('(min-width: 1024px)',()=>{
   if(reduced||!root.current)return;
   const tween=gsap.to(root.current.querySelector('.sunny-story-viz'),{'--story-turn':1,ease:'none',scrollTrigger:{id:'piggy-story',trigger:root.current,start:'top top+=82',end:'+=1800',pin:true,scrub:.6,onUpdate:trigger=>onProgress(Math.min(3,Math.floor(trigger.progress*4)))}});
   return()=>tween.kill();
  });
  return()=>media.revert();
 },[reduced,onProgress]);
 const active=chapters[chapter];
 return <section id="how" className="sunny-story sunny-section" ref={root} aria-labelledby="story-heading" tabIndex={-1}>
  <div className="sunny-story-copy"><p className="sunny-eyebrow">YOUR STORY, AT YOUR PACE</p><h2 id="story-heading">Good things<br/>grow with you.</h2><p className="sunny-story-intro">You don’t need to have it all figured out.<br/>Just a place to begin.</p>
   <div className="sunny-story-tabs" role="tablist" aria-label="Savings story chapters">{chapters.map((item,index)=><button role="tab" id={`chapter-tab-${index}`} aria-controls="chapter-panel" aria-selected={chapter===index} tabIndex={chapter===index?0:-1} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const next=(index+(event.key==='ArrowRight'?1:3))%4;onChapter(next,false);document.getElementById(`chapter-tab-${next}`)?.focus();}}} onClick={()=>onChapter(index,false)} key={item.short}><span>{String(index+1).padStart(2,'0')}</span><span>{item.title}</span><span aria-hidden="true">↗</span></button>)}</div>
  </div>
  <div className="sunny-story-panel" role="tabpanel" id="chapter-panel" aria-labelledby={`chapter-tab-${chapter}`} style={{backgroundColor:active.color}}>
   <span className="sunny-story-count">CHAPTER {String(chapter+1).padStart(2,'0')} / 04</span><div className="sunny-story-viz"><SavingsArt chapter={chapter} percent={[20,65,85,100][chapter]}/></div>
   <div className="sunny-story-detail"><h3>{active.detail}</h3><p>{active.body}</p></div><div className="sunny-story-dots" aria-hidden="true">{chapters.map((_,i)=><i key={i} className={i===chapter?'active':''}/>)}</div>
  </div>
 </section>;
}
