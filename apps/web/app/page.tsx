import Link from 'next/link';

const featurePills = ['No-KYC Signup', 'Self-custodial', 'Savings Pockets', 'Relief Pledges', 'Stellar Testnet'];

const steps = [
  ['01', 'Create Your Wallet', 'Generate a Stellar wallet on-device and complete the recovery phrase backup before activation.'],
  ['02', 'Save In Pockets', 'Track emergency funds, tuition, and goals as app-layer savings pockets over one Stellar account.'],
  ['03', 'Use Anchors Later', 'SEP-24 deposit and withdrawal flows stay configurable for licensed anchors in the next phase.']
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
      <nav className="landing-nav" aria-label="Marketing navigation">
        <Link className="landing-brand" href="/">
          <span aria-hidden="true">P</span>
          PiggyBanq
        </Link>
        <div>
          <a href="#how">How it works</a>
          <a href="#security">Security</a>
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </nav>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">No-KYC micro savings, built on Stellar.</p>
          <h1 id="landing-title">Start saving before paperwork gets in the way.</h1>
          <p>
            PiggyBanq is a self-custodial wallet concept for saving in pesos, dollars, or crypto on Stellar testnet.
            No bank account, no long forms, and no server-side custody of your keys.
          </p>
          <div className="landing-actions">
            <Link className="landing-primary" href="/dashboard">Start Saving</Link>
            <a className="landing-secondary" href="#how">See how it works</a>
          </div>
        </div>

        <div className="landing-visual" aria-label="PiggyBanq wallet preview" data-background="/piggy.png">
          <div className="landing-wallet-card">
            <div className="landing-card-top">
              <span>PiggyBanq Testnet</span>
              <strong>No wallet linked</strong>
            </div>
            <div className="landing-pocket">
              <span>Savings pockets</span>
              <strong>0 active</strong>
            </div>
            <div className="landing-pocket">
              <span>KYC-free placeholder limit</span>
              <strong>PHP 50,000.00</strong>
            </div>
            <p>Self-custodial. Testnet. Public-key-only backend.</p>
          </div>
        </div>
      </section>

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

      <section className="landing-cta">
        <p className="landing-section-label">03 - demo</p>
        <h2>Your savings workspace is ready to inspect.</h2>
        <Link className="landing-primary" href="/dashboard">Open Dashboard</Link>
      </section>
    </main>
  );
}
