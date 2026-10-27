import Link from 'next/link';
import { ResponsiveHeroMedia } from './components/ResponsiveHeroMedia';
import { LandingMotion } from './components/LandingMotion';
import './editorial-landing.css';

const statement = 'We believe better money habits start with ownership. A little saved with intention. A clear view of every goal. And the confidence that your keys, your choices, and your next chapter stay yours.';

export default function LandingPage() {
  return <LandingMotion>
    <section className="landing-hero-section editorial-hero" aria-labelledby="landing-title">
      <div className="editorial-topline"><span>SMALL STEPS. BIG POSSIBILITIES.</span><span className="editorial-network"><i /> STELLAR TESTNET</span></div>
      <div className="editorial-intro">
        <span className="editorial-kicker" data-reveal>YOUR NEXT CHAPTER</span>
        <h1 id="landing-title"><span data-reveal>SMALL</span><span data-reveal>SAVINGS<span className="editorial-title-dot">.</span></span></h1>
        <div className="editorial-about" data-reveal><p className="editorial-kicker">● (ABOUT PIGGYBANQ)</p><p>A little today. More possibilities tomorrow.<br />Self-custodial savings, built around you.</p><Link className="editorial-button" href="/signup">Start Saving <span aria-hidden="true">↗</span></Link></div>
      </div>
      <div className="editorial-art" data-reveal>
        <ResponsiveHeroMedia />
        <div className="editorial-brand-plate"><span className="editorial-plate-symbol" aria-hidden="true">✳</span><strong>PIGGYBANQ</strong><span aria-hidden="true">＝</span></div>
        <div className="editorial-art-caption"><span>YOUR KEYS.</span><span>YOUR GOALS.</span><span>YOUR FUTURE.</span></div>
      </div>
      <aside className="editorial-aside" aria-label="Explore PiggyBanq">
        <span className="editorial-growth" data-reveal><span>✓</span> Little by little.</span>
        <p className="editorial-available" data-reveal>A space to save.<br /><span>● A future to build.</span></p>
        <Link className="editorial-preview" href="/dashboard" data-reveal><span className="editorial-kicker">A CLEARER PICTURE / 01</span><div className="editorial-pocket-art" aria-hidden="true"><i /><i /><i /><span>↗</span></div><div><span>Savings pockets</span><strong>Make room<br />for what matters.</strong></div><span className="editorial-preview-line" /></Link>
      </aside>
      <div className="editorial-facts" data-reveal><article className="editorial-local"><span className="editorial-kicker">BUILT ON OWNERSHIP</span><strong><span data-count="100">100</span><small>%</small></strong><p>Local wallet signing</p><div><span>YOUR DEVICE</span><span>YOUR APPROVAL</span></div></article><article className="editorial-goals"><span className="editorial-kicker">A PLAN FOR EVERY POSSIBILITY</span><div className="editorial-mini-goals" aria-hidden="true"><span>✳</span><span>↗</span><span>♡</span></div><strong>One step<br />closer.</strong><p>Plan your goals.<br />See your progress.</p></article></div>
      <div className="editorial-hero-bottom"><span>SELF-CUSTODIAL BY DESIGN</span><a className="hero-scroll-cue" href="#how">SCROLL TO EXPLORE <span>↓</span></a><a className="hero-skip-story" href="#how">Skip animation ↗</a></div>
    </section>
    <section id="how" tabIndex={-1} className="editorial-manifesto" aria-labelledby="manifesto-title">
      <div className="editorial-section-label"><span>01 / OUR BELIEF</span><span>A LITTLE GOES A LONG WAY.</span></div>
      <h2 id="manifesto-title" className="editorial-statement">{statement.split(' ').map((word,index)=><span data-word key={index}>{word}{' '}</span>)}</h2>
      <p className="editorial-subline">Savings with intention. Control by design.<br /><span>Built for the life you’re working toward.</span></p>
    </section>
    <section id="security" tabIndex={-1} className="editorial-trust" aria-labelledby="trust-title">
      <div className="editorial-trust-panel">
        <div className="editorial-trust-intro" data-reveal><span className="editorial-kicker">02 / MADE FOR YOUR PEACE OF MIND</span><h2 id="trust-title">Small habits.<br />Clear goals.<br /><em>Your control.</em></h2><p>Private keys stay on your device. Plan savings pockets, review every payment, and sign only when you’re ready.</p></div>
        <article className="editorial-trust-card editorial-ownership" data-reveal><div className="editorial-symbol-grid" aria-hidden="true">{['↗','✳','♡','◎','⌁','⊕','✧','↗'].map((symbol,i)=><span key={i}>{symbol}</span>)}</div><div><strong>Yours.</strong><h3>From the very first step.</h3><p>One wallet. Your recovery phrase.<br />Your responsibility. Your control.</p></div></article>
        <article className="editorial-trust-card editorial-security" data-reveal><strong>0</strong><h3>Your wallet keys on our servers.</h3><div className="editorial-seal" aria-hidden="true"><span>LOCAL SIGNING</span><b>✳</b><span>YOUR APPROVAL</span></div><p>Every payment starts with a review and your explicit approval.</p></article>
        <article id="network" tabIndex={-1} className="editorial-trust-card editorial-network-card" data-reveal><span className="editorial-kicker">EXPLORE SAFELY</span><span className="editorial-network-symbol" aria-hidden="true">✧</span><div><h3>Built on<br />Stellar Testnet.</h3><p>Test tokens. Real practice.<br />PiggyBanq is not a bank.</p></div></article>
      </div>
      <footer className="editorial-footer"><Link href="/" aria-label="PiggyBanq home">PiggyBanq<span>®</span></Link><span>Small savings. Brighter tomorrows.</span><nav aria-label="Footer navigation"><Link href="/login">Sign in ↗</Link><Link href="/signup">Create wallet ↗</Link></nav><small>© 2026 PiggyBanq · Testnet only</small></footer>
    </section>
  </LandingMotion>;
}
