'use client';
import { useEffect, useRef, type ReactNode } from 'react';

export function LandingMotion({children}:{children:ReactNode}) {
  const root=useRef<HTMLElement>(null);
  useEffect(()=>{
    const element=root.current;
    if(!element)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const statement=element.querySelector<HTMLElement>('.editorial-statement');
    const words=Array.from(element.querySelectorAll<HTMLElement>('[data-word]'));
    const timers=new Set<number>();
    let frame=0;
    function paint(){
      frame=0;
      if(!statement)return;
      const box=statement.getBoundingClientRect();
      const progress=Math.max(0,Math.min(1,(innerHeight*.85-box.top)/(box.height+innerHeight*.35)));
      words.forEach((word,index)=>word.style.color=reduced.matches?'#fff3ee':`rgb(${[121,96,107].map((channel,i)=>Math.round(channel+([255,243,238][i]-channel)*Math.max(0,Math.min(1,(progress*(words.length+3)-index)/3)))).join(' ')})`);
    }
    function scroll(){if(!frame)frame=requestAnimationFrame(paint);}
    function reveal(node:HTMLElement){
      if(!reduced.matches)node.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:750,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
      node.querySelectorAll<HTMLElement>('[data-count]').forEach(counter=>{
        if(reduced.matches)return;
        const target=Number(counter.dataset.count),start=performance.now();
        function count(now:number){
          const t=Math.min(1,(now-start)/1400);
          counter.textContent=String(Math.round(target*(1-(1-t)**3)));
          if(t<1&&!reduced.matches){const id=requestAnimationFrame(time=>{timers.delete(id);count(time);});timers.add(id);}else counter.textContent=String(target);
        }
        count(start);
      });
    }
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){reveal(entry.target as HTMLElement);observer.unobserve(entry.target);}}),{threshold:.12});
    element.querySelectorAll<HTMLElement>('[data-reveal]').forEach(node=>observer.observe(node));
    function preference(){if(reduced.matches)element.getAnimations({subtree:true}).forEach(animation=>animation.finish());paint();}
    window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',scroll);reduced.addEventListener('change',preference);paint();
    return()=>{observer.disconnect();cancelAnimationFrame(frame);timers.forEach(cancelAnimationFrame);window.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll);reduced.removeEventListener('change',preference);};
  },[]);
  return <main className="editorial-landing" ref={root}>{children}</main>;
}
