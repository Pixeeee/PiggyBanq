'use client';
import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { goals, type GoalId, type SceneMode } from './content';
import { projectSavings } from './demo';
import { SavingsArt } from './SavingsArt';
import { useMotionPreference } from './useMotionPreference';

const PocketScene=dynamic(()=>import('./PocketScene'),{ssr:false,loading:()=> <div className="sunny-scene-loading"><SavingsArt/><span>Making a little room for your dreams…</span></div>});
const money=(minor:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(minor/100);
class SceneBoundary extends Component<{onFailure:()=>void;children:ReactNode},{failed:boolean}> {
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){this.props.onFailure();}render(){return this.state.failed?null:this.props.children;}
}

export function SavingsPlayground() {
 const root=useRef<HTMLElement>(null),reduced=useMotionPreference();
 const [selected,setSelected]=useState<GoalId>('rainy-day'),[mode,setMode]=useState<SceneMode>('plan');
 const [monthly,setMonthly]=useState(500),[months,setMonths]=useState(6),[extras,setExtras]=useState<Record<GoalId,number>>({'rainy-day':0,laptop:0,adventure:0});
 const [pulse,setPulse]=useState(0),[inspect,setInspect]=useState(false),[simple,setSimple]=useState(false),[active,setActive]=useState(false),[seen,setSeen]=useState(false),[gpu,setGpu]=useState<'checking'|'available'|'unavailable'>('checking'),[scrollProgress,setScrollProgress]=useState(0),[notice,setNotice]=useState('');
 const goal=goals.find(item=>item.id===selected)!;
 const projection=useMemo(()=>projectSavings({monthlyMinor:monthly*100,months,targetMinor:goal.targetMinor,extraMinor:extras[selected]}),[monthly,months,goal.targetMinor,extras,selected]);
 const fail=useCallback(()=>setGpu('unavailable'),[]);
 useEffect(()=>{
  if(!root.current)return;
  let inView=false;const sync=()=>setActive(inView&&!document.hidden);
  const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)setSeen(true);sync();},{rootMargin:'100px'});observer.observe(root.current);
  document.addEventListener('visibilitychange',sync);
  return()=>{observer.disconnect();document.removeEventListener('visibilitychange',sync);};
 },[]);
 useEffect(()=>{
  if(!seen||reduced||simple||gpu!=='checking')return;
  try{const canvas=document.createElement('canvas');const context=canvas.getContext('webgl2');setGpu(context?'available':'unavailable');context?.getExtension('WEBGL_lose_context')?.loseContext();}catch{setGpu('unavailable');}
 },[seen,reduced,simple,gpu]);
 useEffect(()=>{
  if(reduced||!seen||!root.current)return;
  gsap.registerPlugin(ScrollTrigger);
  const trigger=ScrollTrigger.create({trigger:root.current,start:'top bottom',end:'bottom top',onUpdate:state=>setScrollProgress(Math.round(state.progress*20)/20)});
  return()=>trigger.kill();
 },[reduced,seen]);
 const show3D=seen&&!simple&&!reduced&&gpu==='available';
 function reset(){setSelected('rainy-day');setMode('plan');setMonthly(500);setMonths(6);setExtras({'rainy-day':0,laptop:0,adventure:0});setPulse(0);setInspect(false);setNotice('Playground reset. This is sample data only.');}
 function deposit(){setExtras(previous=>({...previous,[selected]:Math.min(goal.targetMinor,previous[selected]+monthly*100)}));setPulse(previous=>previous+1);setMode('grow');setNotice(`Added ${money(monthly*100)} to this demo. No funds moved.`);}
 return <section id="playground" className="sunny-playground sunny-section" ref={root} aria-labelledby="playground-title" tabIndex={-1}>
  <div className="sunny-section-heading" data-sunny-reveal><p className="sunny-eyebrow">A LITTLE ROOM TO EXPLORE</p><h2 id="playground-title">Make room for your dreams.</h2><p>Pick a pocket. Find your pace. See what a little could become.</p><span className="sunny-demo-label">PLAYGROUND · SAMPLE PHP VALUES · NO FUNDS MOVE</span></div>
  <div className="sunny-playground-grid">
   <div className="sunny-pocket-stage" data-mode={mode}>
    <div className="sunny-scene-toolbar"><span>{show3D?'YOUR POCKETS, IN 3D':'YOUR POCKETS, SIMPLIFIED'}</span><button onClick={()=>{setSimple(value=>!value);setInspect(false);}} disabled={reduced||gpu==='unavailable'}>{reduced||gpu==='unavailable'?'Simple view':simple?'Enable 3D view':'Use simple view'}</button></div>
    <div className="sunny-pocket-frame">{show3D?<SceneBoundary onFailure={fail}><PocketScene selected={selected} mode={mode} percent={projection.percent} depositPulse={pulse} inspect={inspect} active={active} scrollProgress={scrollProgress} onSelect={setSelected} onFailure={fail}/></SceneBoundary>:<div className="sunny-simple-view" data-testid="simple-savings-view"><SavingsArt chapter={mode==='review'?3:mode==='grow'?1:0} percent={projection.percent}/></div>}</div>
    <div className="sunny-scene-bottom"><span>{show3D?'Tap a pocket to explore it.':'Same ideas. A lighter view.'}</span>{show3D&&<button aria-pressed={inspect} onClick={()=>setInspect(value=>!value)}>{inspect?'Finish rotating':'Enable rotate view'} <span aria-hidden="true">⤾</span></button>}</div>
    <p className="sunny-fallback-note">{gpu==='unavailable'?'3D isn’t available here. You can still try every control.':reduced?'A calm illustration for your reduced-motion preference.':'A procedural piggy bank, made for exploring—not a live wallet.'}</p>
   </div>
   <div className="sunny-pocket-controls">
    <div className="sunny-mode-tabs" role="tablist" aria-label="Playground mode">{(['plan','grow','review'] as SceneMode[]).map(value=><button role="tab" aria-selected={mode===value} aria-controls="playground-mode-panel" id={`mode-${value}`} key={value} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const modes:SceneMode[]=['plan','grow','review'];const next=modes[(modes.indexOf(value)+(event.key==='ArrowRight'?1:2))%3];setMode(next);document.getElementById(`mode-${next}`)?.focus();}}} tabIndex={mode===value?0:-1} onClick={()=>setMode(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div>
    <div role="radiogroup" aria-label="Choose a demo pocket" className="sunny-goal-options">{goals.map(item=><button key={item.id} role="radio" aria-checked={selected===item.id} tabIndex={selected===item.id?0:-1} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const index=goals.findIndex(goal=>goal.id===item.id),next=goals[(index+(event.key==='ArrowRight'?1:2))%3];setSelected(next.id);const parent=event.currentTarget.parentElement;parent?.querySelector<HTMLButtonElement>(`[data-goal="${next.id}"]`)?.focus();}}} data-goal={item.id} onClick={()=>setSelected(item.id)}><span style={{backgroundColor:item.color}} aria-hidden="true">{item.symbol}</span>{item.name}<i aria-hidden="true">{selected===item.id?'✓':'↗'}</i></button>)}</div>
    <div className="sunny-pocket-result"><span>{goal.name} · sample projection</span><strong data-testid="demo-saved">{money(projection.savedMinor)}</strong><p>of {money(goal.targetMinor)} · {projection.percent}% of your goal</p><div className="sunny-progress" role="progressbar" aria-label="Sample goal progress" aria-valuenow={projection.percent} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${projection.percent}%`}}/></div></div>
    <label className="sunny-range-label" htmlFor="demo-monthly">A little each month <strong>{money(monthly*100)}</strong></label><input id="demo-monthly" aria-label="Monthly saving in pesos" aria-valuetext={`${monthly} pesos`} type="range" min="100" max="10000" step="100" value={monthly} onChange={event=>setMonthly(Number(event.target.value))}/>
    <label className="sunny-range-label" htmlFor="demo-months">Give it some time <strong>{months} months</strong></label><input id="demo-months" aria-label="Months to plan" type="range" min="1" max="24" step="1" value={months} onChange={event=>setMonths(Number(event.target.value))}/>
    <div id="playground-mode-panel" role="tabpanel" aria-labelledby={`mode-${mode}`} className="sunny-mode-note">{mode==='plan'?<><strong>A plan starts with a possibility.</strong><p>{projection.monthsToGoal===null?'Choose a contribution to explore your pace.':`${projection.monthsToGoal} months to fund this target at your chosen pace, including demo extras. No interest is assumed.`}</p></>:mode==='grow'?<><strong>Small contributions add up.</strong><p>{money(projection.remainingMinor)} left in this sample projection. Each demo saving adds your monthly amount once.</p></>:<><strong>Every real payment needs your review.</strong><p>Check the asset, amount, destination and fee. In PiggyBanq, your wallet signs locally after your approval.</p></>}</div>
    <div className="sunny-playground-actions"><button className="sunny-pill sunny-pill-rose" onClick={deposit}>Add a demo saving <span aria-hidden="true">＋</span></button><button className="sunny-text-button" onClick={reset}>Reset playground</button></div>
    <p className="sunny-demo-notice" role="status">{notice||'This illustration is not an account balance or investment forecast.'}</p>
   </div>
  </div>
 </section>;
}
