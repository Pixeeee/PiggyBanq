import Link from 'next/link';
import { ResponsiveHeroMedia } from './components/ResponsiveHeroMedia';

const savingsMetrics = [
  ['0', 'Private keys stored'],
  ['100%', 'Self-custodial'],
  ['24/7', 'Wallet access'],
  ['Testnet', 'Current network']
] as const;

const footerGroups = [
  ['Wallet', [['Create wallet', '/signup'], ['Sign in', '/login']]],
  ['Product', [['How it works', '#how'], ['Open dashboard', '/dashboard']]],
  ['Safety', [['Security posture', '#security'], ['Stellar testnet', '#network']]]
] as const;

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-hero-section">
        <ResponsiveHeroMedia />

        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-panel landing-hero-left liquid-glass-strong">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow animate-fade-rise">No-KYC micro savings, built on Stellar.</p>
              <h1 id="landing-title" className="animate-fade-rise">
                Small savings.<br /><em>Brighter tomorrows.</em>
              </h1>
              <p className="animate-fade-rise-delay">
                A self-custodial wallet for the goals you care about. Your keys stay on your device. Stellar Testnet only.
              </p>
              <div className="landing-actions animate-fade-rise-delay-2">
                <Link className="landing-primary liquid-glass-strong" href="/signup">
                  Start Saving
                  <span className="landing-action-icon" aria-hidden="true"><DownloadIcon /></span>
                </Link>
              </div>

            </div>

          </div>

        </section>
        <a className="hero-scroll-cue" href="#how">Explore PiggyBanq <span aria-hidden="true">↓</span></a>
      </header>

      <div className="landing-content-sections">
        <section className="landing-metrics" aria-label="PiggyBanq platform facts">
          {savingsMetrics.map(([value, label]) => (
            <article key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          ))}
        </section>

        <section id="how" tabIndex={-1} className="landing-bento-intro">
          <div>
            <p>Built for everyday saving</p>
            <h2>Architected for calm, self-custodial money habits.</h2>
          </div>
        </section>

        <section className="landing-bento-grid" aria-label="PiggyBanq savings capabilities">
          <article className="landing-bento-card landing-bento-tall">
            <span>01 · YOUR WALLET</span>
            <div>
              <h3>Unlock the freedom of money you control.</h3>
              <p>Create a Stellar wallet on your device, back up the recovery phrase, and keep the private key away from PiggyBanq servers.</p>
            </div>
          </article>

          <article className="landing-bento-card landing-bento-wide">
            <span>02 · SAVINGS VIEW</span>
            <div>
              <h3>See every pocket in one clear workspace.</h3>
              <p>Organize emergency funds, tuition, bills, and other goals without moving custody to the platform.</p>
            </div>
            <Link href="/dashboard">View dashboard <ArrowRightIcon /></Link>
          </article>

          <article id="security" tabIndex={-1} className="landing-bento-card landing-bento-small">
            <span>03 · SECURITY</span>
            <div>
              <h3>Public-key-only account records.</h3>
              <p>Wallet ownership is verified with a signed challenge while secrets remain local.</p>
            </div>
          </article>

          <article id="network" tabIndex={-1} className="landing-bento-card landing-bento-small landing-network-card">
            <span>04 · STELLAR TESTNET</span>
            <div className="landing-network-orbit" aria-hidden="true"><i>✦</i></div>
            <p>Current payment and anchor preparation flows stay on testnet until audit and legal review.</p>
          </article>
        </section>

        <section className="landing-content-banner">
          <div>
            <p>SAVE WITH INTENTION</p>
            <h2>Turn scattered goals into a savings system you own.</h2>
            <span>Plan pockets, track progress, and prepare for Stellar rails without handing over your keys.</span>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-footer-brand">
            <Link href="/">PiggyBanq<sup>®</sup></Link>
            <p>Self-custodial savings tools for clearer goals, safer wallet access, and practical Stellar testnet preparation.</p>
          </div>
          <nav className="landing-footer-nav" aria-label="Footer navigation">
            {footerGroups.map(([heading, links]) => (
              <div key={heading}>
                <strong>{heading}</strong>
                {links.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
              </div>
            ))}
          </nav>
          <div className="landing-footer-legal">
            <span>© 2026 PiggyBanq. Testnet only.</span>
            <span>Private keys stay on your device.</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}
