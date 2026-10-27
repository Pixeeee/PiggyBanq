'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useMotionPreference } from './useMotionPreference';

export function useSunnyMotion(root:RefObject<HTMLElement|null>) {
 const reduced=useMotionPreference();
 useEffect(()=>{
  if(!root.current||reduced)return;
  gsap.registerPlugin(ScrollTrigger);
  const context=gsap.context(()=>{
   gsap.timeline({defaults:{ease:'power3.out'}})
    .from('[data-title-line]',{y:65,opacity:0,filter:'blur(9px)',duration:1,stagger:.16},.1)
    .from('[data-hero-enter]',{y:18,opacity:0,duration:.7,stagger:.07},.45);
   gsap.utils.toArray<HTMLElement>('[data-sunny-reveal]').forEach(node=>gsap.from(node,{y:35,opacity:0,duration:.8,ease:'power3.out',scrollTrigger:{trigger:node,start:'top 92%',once:true}}));
   gsap.fromTo('[data-mission-word]',{color:'#c9b7bd'},{color:'#64394e',stagger:.08,ease:'none',scrollTrigger:{trigger:'.sunny-mission',start:'top 70%',end:'bottom 50%',scrub:.6}});
   gsap.to('.sunny-kinetic-word',{xPercent:-12,ease:'none',scrollTrigger:{trigger:'.sunny-why',start:'top bottom',end:'bottom top',scrub:true}});
  },root);
  return()=>context.revert();
 },[reduced,root]);
}

export function SunnyIntro() {
 const [visible,setVisible]=useState(false),reduced=useMotionPreference();
 const root=useRef<HTMLDivElement>(null),timeline=useRef<gsap.core.Timeline|null>(null);
 useEffect(()=>{
  if(reduced){setVisible(false);return;}
  try{if(sessionStorage.getItem('piggybanq-sunny-intro'))return;sessionStorage.setItem('piggybanq-sunny-intro','seen');}catch{}
  setVisible(true);
 },[reduced]);
 useEffect(()=>{
  if(!visible||!root.current)return;
  const state={count:0};
  timeline.current=gsap.timeline({onComplete:()=>setVisible(false)}).to(state,{count:100,duration:1,ease:'power2.out',onUpdate:()=>{const counter=root.current?.querySelector('[data-intro-count]');if(counter)counter.textContent=String(Math.round(state.count)).padStart(3,'0');}}).to(root.current,{yPercent:-100,duration:.45,ease:'power3.inOut'});
  return()=>{timeline.current?.kill();};
 },[visible]);
 if(!visible||reduced)return null;
 return <div className="sunny-intro" ref={root} aria-label="PiggyBanq introduction"><span className="sunny-intro-brand">PiggyBanq<span aria-hidden="true">✳</span></span><span className="sunny-intro-caption">A little possibility, coming into view.</span><span className="sunny-intro-counter" data-intro-count aria-hidden="true">000</span><button onClick={()=>{timeline.current?.kill();setVisible(false);}}>Skip introduction ↗</button></div>;
}
