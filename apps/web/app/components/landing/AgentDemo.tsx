'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { advanceDemo, type DemoEvent, type DemoStage } from './demo';
import { useMotionPreference } from './useMotionPreference';

export function AgentDemo() {
 const [stage,setStage]=useState<DemoStage>('idle'),timeline=useRef<gsap.core.Timeline|null>(null),reduced=useMotionPreference();
 useEffect(()=>()=>{timeline.current?.kill();},[]);
 function event(value:DemoEvent){setStage(previous=>advanceDemo(previous,value));}
 function preview(){timeline.current?.kill();event('preview');timeline.current=gsap.timeline().to({value:0},{value:1,duration:reduced?0:.9}).call(()=>event('ready'));}
 function approve(){if(stage!=='awaiting-approval')return;event('approve');timeline.current=gsap.timeline().to({value:0},{value:1,duration:reduced?0:.8}).call(()=>event('finish'));}
 function reset(){timeline.current?.kill();event('reset');}
 const step=['idle','previewing','awaiting-approval','executing','complete'].indexOf(stage);
 return <section id="agent-demo" className="sunny-agent sunny-section" aria-labelledby="agent-title">
  <div className="sunny-agent-intro" data-sunny-reveal><p className="sunny-eyebrow">HELPFUL BY NATURE. YOURS BY DESIGN.</p><h2 id="agent-title">A little help.<br/>You approve.</h2><p>An agent can help prepare a plan. You decide what happens next.</p><p className="sunny-agent-disclaimer">This is a scripted demo, with sample planning data. It is not connected to an AI service or a payment API.</p></div>
  <div className="sunny-agent-demo" data-stage={stage}>
   <div className="sunny-agent-top"><span className="sunny-agent-avatar" aria-hidden="true">✳</span><div><strong>Your planning companion</strong><span>LOCAL INTERACTIVE DEMO</span></div><span className="sunny-agent-status">{stage==='complete'?'Complete':stage==='awaiting-approval'?'Your turn':'A little possibility'}</span></div>
   <p className="sunny-agent-prompt">“Help me plan a ₱10,000 rainy-day pocket.”</p>
   <ol className="sunny-agent-steps"><li className={step>=1?'active':''}><span>01</span><div><strong>Understand the goal</strong><p>A sample ₱10,000 rainy-day cushion.</p></div><i aria-hidden="true">{step>=2?'✓':'·'}</i></li><li className={step>=2?'active':''}><span>02</span><div><strong>Prepare a clear preview</strong><p>₱500 per month · 20 months · no assumed interest.</p></div><i aria-hidden="true">{step>=2?'✓':'·'}</i></li><li className={step>=3?'active':''}><span>03</span><div><strong>Wait for your approval</strong><p>{stage==='awaiting-approval'?'Your plan is ready to review. Nothing has been approved yet.':step>=3?'You approved this sample plan.':'You stay in control of the next step.'}</p></div><i aria-hidden="true">{step>=3?'✓':'·'}</i></li></ol>
   <div className="sunny-agent-result" role="status">{stage==='idle'?'Try a preview. No account or wallet is needed.':stage==='previewing'?'Preparing a sample plan…':stage==='awaiting-approval'?'Review the sample plan, then choose whether to approve.':stage==='executing'?'Recording your demo approval…':'Demo receipt ready. No funds moved.'}</div>
   {stage==='complete'&&<div className="sunny-demo-receipt"><span>DEMO RECEIPT / SAMPLE-001</span><strong>Rainy-day planning pocket</strong><p>Status: approved in this browser only.<br/>No blockchain transaction or verified payment receipt was created.</p></div>}
   <div className="sunny-agent-actions">{stage==='idle'&&<button className="sunny-pill sunny-pill-rose" onClick={preview}>Preview demo plan <span aria-hidden="true">↗</span></button>}{stage==='awaiting-approval'&&<button className="sunny-pill sunny-pill-rose" onClick={approve}>Approve demo plan <span aria-hidden="true">✓</span></button>}{stage!=='idle'&&<button className="sunny-text-button" onClick={reset}>Reset agent demo</button>}</div>
  </div>
 </section>;
}
