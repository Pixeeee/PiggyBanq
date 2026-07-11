import Link from 'next/link';

const featurePills = ['No-KYC Signup', 'Self-custodial', 'Savings Pockets', 'Relief Pledges', 'Stellar Testnet'];
const heroPills = ['Monochrome', 'Typography-first', 'Self-custodial'];
const socialLinks = ['X', 'in', 'ig'];

const steps = [
  ['01', 'Create wallet', 'Generate a Stellar wallet on-device and back up the recovery phrase before opening the workspace.'],
  ['02', 'Split money into pockets', 'Plan emergency funds, tuition, bills, and crypto balances without giving PiggyBanq custody.'],
  ['03', 'Prepare for anchor rails', 'Future deposit and withdrawal handoffs stay gated behind trustline checks and licensed partners.']
] as const;

const safetyItems = [
  'Backend stores public keys only',
  'Perks stay cosmetic and utility-only',
  'Relief pledges never auto-send funds',
  'Mainnet requires audit and legal review'
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-hero-section">
        <video
          className="landing-hero-video"
          aria-hidden="true"
          autoPlay
          loop
          muted
          playsInline
          poster="/piggy.png"
        >
          <source src="/piggy_bg.mp4" type="video/mp4" />
        </video>
        <div className="landing-hero-media" aria-hidden="true" data-background="/piggy.png" />

        <nav className="landing-nav" aria-label="Marketing navigation">
          <Link className="landing-brand" href="/">
            <span className="landing-brand-mark">P</span>
            PiggyBanq<sup>&reg;</sup>
          </Link>
          <button className="landing-nav-cta liquid-glass" type="button">
            Menu
            <MenuIcon />
          </button>
        </nav>

        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-panel landing-hero-left liquid-glass-strong">
            <div className="landing-hero-copy">
              <div className="landing-hero-emblem" aria-hidden="true">P</div>
              <p className="landing-eyebrow animate-fade-rise">No-KYC micro savings, built on Stellar.</p>
              <h1 id="landing-title" className="animate-fade-rise">
                Type does the talking for <em>quiet, precise savings.</em>
              </h1>
              <p className="animate-fade-rise-delay">
                PiggyBanq is a Self-custodial wallet workspace shaped by a monochrome, typography-first design
                language. Whitespace is structure, keys stay local, and the current product remains testnet-only.
              </p>
              <div className="landing-actions animate-fade-rise-delay-2">
                <Link className="landing-primary liquid-glass-strong" href="/signup">
                  Start Saving
                  <span className="landing-action-icon" aria-hidden="true"><DownloadIcon /></span>
                </Link>
              </div>
              <div className="landing-availability" aria-label="PiggyBanq status">
                {heroPills.map((pill) => (
                  <span className="liquid-glass" key={pill}>{pill}</span>
                ))}
              </div>
            </div>

            <div className="landing-hero-quote">
              <span>VISIONARY DESIGN</span>
              <blockquote>
                We imagined a realm with <em>no ending.</em>
              </blockquote>
      
            </div>
          </div>

          <aside className="landing-hero-right" aria-label="PiggyBanq ecosystem preview">
            <div className="landing-hero-social">
              <div className="landing-social-pill liquid-glass">
                {socialLinks.map((label) => (
                  <a key={label} href="#community" aria-label={`Open ${label} community link`}>{label}</a>
                ))}
                <ArrowRightIcon />
              </div>
              <Link className="landing-spark-button liquid-glass" href="/signup" aria-label="Create PiggyBanq wallet">
                <SparklesIcon />
              </Link>
              <Link className="landing-account-pill liquid-glass" href="/login">Account</Link>
            </div>

            <div className="landing-community-card liquid-glass">
              <span>ENTER OUR ECOSYSTEM</span>
              <strong>Calamity help, groups, and savings signals in one wallet surface.</strong>
            </div>

            <div className="landing-feature-stack liquid-glass-strong">
              <div className="landing-mini-grid">
                <article className="liquid-glass">
                  <WandIcon />
                  <span>Processing</span>
                  <p>Local wallet readiness and recovery checks.</p>
                </article>
                <article className="liquid-glass">
                  <BookIcon />
                  <span>Growth Archive</span>
                  <p>Append-only savings pockets and milestones.</p>
                </article>
              </div>
              <article className="landing-wide-card liquid-glass">
                <div className="landing-wide-thumb" aria-hidden="true" />
                <div>
                  <span>Advanced Savings Sculpting</span>
                  <p>Budget allocation, relief pledges, and Stellar testnet rails.</p>
                </div>
                <Link href="/dashboard" aria-label="Open dashboard">+</Link>
              </article>
            </div>
          </aside>
        </section>
      </header>

      <div className="landing-content-sections">
        <section className="landing-strip" aria-label="PiggyBanq highlights">
          {featurePills.map((feature) => (
            <span key={feature}>{feature}</span>
          ))}
        </section>

        <section id="how" className="landing-section">
          <p className="landing-section-label">01 - how it works</p>
          <div className="landing-step-grid">
            {steps.map(([number, title, body]) => (
              <article key={number} className="landing-step">
                <span>{number}</span>
                <h2>{title}</h2>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="security" className="landing-security">
          <div>
            <p className="landing-section-label">02 - security posture</p>
            <h2>Finance-first social savings without pretending to be a bank.</h2>
            <p>
              The current product slice is testnet-only. Production mainnet launch requires a full security audit,
              legal review, and current BSP/AMLC threshold confirmation.
            </p>
          </div>
          <ul>
            {safetyItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section id="community" className="landing-cta">
          <p className="landing-section-label">03 - community</p>
          <h2>Calamity help posts, groups, and chats stay connected to your wallet workspace.</h2>
          <Link className="landing-primary" href="/dashboard">Open Community</Link>
        </section>

        <section className="landing-cta">
          <p className="landing-section-label">04 - demo</p>
          <h2>Your savings workspace is ready to inspect.</h2>
          <Link className="landing-primary" href="/dashboard">Open Dashboard</Link>
        </section>
      </div>
    </main>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
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

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 11 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
    </svg>
  );
}

function WandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 4 5 5M4 20 20 4M14 9l1 1M5 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h10a4 4 0 0 1 4 4v12H8a3 3 0 0 0-3-3V4Zm0 13V4" />
    </svg>
  );
}
