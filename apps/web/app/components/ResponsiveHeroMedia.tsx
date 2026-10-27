'use client';
import { useEffect, useRef, useState } from 'react';

export function ResponsiveHeroMedia() {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const updateRef = useRef<() => void>(()=>{});
  const [staticOnly, setStaticOnly] = useState(true);
  useEffect(()=>{
    const element=video.current;
    if(!element || !container.current) return;
    const phone=matchMedia('(max-width: 700px)'), reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const connection=(navigator as Navigator & {connection?: {saveData?: boolean}}).connection;
    let visible=false, failed=false;
    function release() { element!.pause();element!.removeAttribute('src');element!.load();setPlaying(false); }
    function update() {
      const still=reduced.matches || connection?.saveData===true;
      setStaticOnly(still || failed);
      const target=`/media/piggy-${phone.matches?'portrait':'landscape'}.mp4`;
      if(still || failed) {release();return;}
      if(element!.getAttribute('src') && element!.getAttribute('src')!==target) release();
      if(!visible || pausedRef.current || document.hidden) {element!.pause();return;}
      if(element!.getAttribute('src')!==target) element!.src=target;
      void element!.play().catch(()=>{});
    }
    updateRef.current=update;
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();});
    observer.observe(container.current);
    const error=()=>{failed=true;setStaticOnly(true);release();};
    element.addEventListener('error',error);phone.addEventListener('change',update);reduced.addEventListener('change',update);document.addEventListener('visibilitychange',update);
    update();
    return ()=>{observer.disconnect();element.removeEventListener('error',error);phone.removeEventListener('change',update);reduced.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);element.pause();element.removeAttribute('src');element.load();};
  },[]);
  return <div className="responsive-hero-media" ref={container}>
    <picture><source media="(max-width: 700px)" srcSet="/media/piggy-portrait.webp" /><img src="/media/piggy-landscape.webp" alt="" fetchPriority="high" decoding="async" width="864" height="480" /></picture>
    <video ref={video} className={playing?'is-playing':''} muted playsInline loop preload="none" aria-hidden="true" onPlaying={()=>setPlaying(true)} />
    {!staticOnly ? <button className="hero-motion-toggle" aria-label={paused?'Play background animation':'Pause background animation'} onClick={()=>{const next=!paused;setPaused(next);pausedRef.current=next;updateRef.current();}}>{paused?'Play motion':'Pause motion'}</button> : null}
  </div>;
}
