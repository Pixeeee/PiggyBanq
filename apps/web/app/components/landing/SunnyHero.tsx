import Link from 'next/link';
import { ResponsiveHeroMedia } from '../ResponsiveHeroMedia';
import { SavingsArt } from './SavingsArt';

export function SunnyHero({onChapter}:{onChapter:(index:number)=>void}) {
 const cards=[{title:'A pocket for every dream',label:'01 / PLANT A GOAL',chapter:0},{title:'Little by little, a little more',label:'02 / FIND YOUR RHYTHM',chapter:1},{title:'Your keys. Your own path.',label:'03 / STAY IN CONTROL',chapter:3}];
 return <section id="top" className="sunny-hero" aria-labelledby="sunny-title">
  <div className="sunny-scenery"><ResponsiveHeroMedia /></div>
  <div className="sunny-hero-copy">
   <p className="sunny-kicker" data-hero-enter>A LITTLE TODAY. A BRIGHTER TOMORROW.</p>
   <h1 id="sunny-title"><span data-title-line>Small steps.</span><span data-title-line>Big dreams.</span></h1>
   <p className="sunny-hero-description" data-hero-enter>A pocket for your plans. A place for your progress.<br className="sunny-desktop-break"/> Grow good saving habits, with the keys in your hands.</p>
   <div className="sunny-hero-actions" data-hero-enter><Link className="sunny-pill sunny-pill-primary" href="/signup" prefetch={false}>Start Saving <span aria-hidden="true">↗</span></Link><a className="sunny-pill sunny-pill-soft" href="#playground"><span aria-hidden="true">▷</span> Try the playground</a></div>
   <p className="sunny-testnet-note" data-hero-enter>SELF-CUSTODIAL · STELLAR TESTNET · NOT A BANK</p>
  </div>
  <div className="sunny-chapters">
   <div className="sunny-chapters-heading" data-hero-enter><h2>Your next chapters</h2><a href="#how">Explore the story <span aria-hidden="true">↗</span></a></div>
   <div className="sunny-chapter-track" aria-label="Explore savings chapters">{cards.map((card,i)=><button className={`sunny-chapter-card chapter-card-${i}`} onClick={()=>onChapter(card.chapter)} key={card.title} data-hero-enter><div className="sunny-chapter-art"><SavingsArt chapter={card.chapter} percent={[25,65,90][i]}/></div><span className="sunny-chapter-number">{card.label}</span><strong>{card.title}</strong><span className="sunny-chapter-arrow" aria-hidden="true">↗</span></button>)}</div>
  </div>
 </section>;
}
