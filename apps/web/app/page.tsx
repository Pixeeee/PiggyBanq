import Link from 'next/link';

const featurePills = ['No-KYC Signup', 'Self-custodial', 'Savings Pockets', 'Relief Pledges', 'Stellar Testnet'];

const steps = [
  ['01', 'Create your wallet', 'Generate a Stellar wallet on-device and back up the recovery phrase before opening the workspace.'],
  ['02', 'Split money into pockets', 'Plan emergency funds, tuition, bills, and crypto balances without giving PiggyBanq custody.'],
  ['03', 'Prepare for anchor rails', 'Future deposit and withdrawal handoffs stay gated behind trustline checks and licensed partners.']
] as const;

const safetyItems = [
  'Backend stores public keys only',
  'Perks stay cosmetic and utility-only',
  'Relief pledges never auto-send funds',
  'Mainnet requires audit and legal review'
];

const previewTransactions = [
  ['Tuition pocket', '+ PHP 850.00', 'Planned save'],
  ['Relief pledge', 'PHP 0.00', 'Not auto-sent'],
  ['Stellar rail', 'TESTNET', 'Ready']
] as const;

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
        <div className="landing-hero-media" aria-hidden="true" />
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">No-KYC micro savings, built on Stellar.</p>
          <h1 id="landing-title">A modern wallet for small goals and real-life resilience.</h1>
          <p>
            PiggyBanq combines a local-first Stellar wallet, savings pockets, and community relief tools in one
            e-wallet workspace. Your keys stay on your device while the product remains testnet-only.
          </p>
          <div className="landing-actions">
            <Link className="landing-primary" href="/dashboard">Start Saving</Link>
            <a className="landing-secondary" href="#how">See how it works</a>
          </div>
          <div className="landing-availability" aria-label="PiggyBanq status">
            <span>Local wallet</span>
            <span>PHP-ready UX</span>
            <span>Testnet rails</span>
          </div>
        </div>

        <div className="landing-visual" aria-label="PiggyBanq wallet preview" data-background="/piggy.png">
          <div className="landing-wallet-card">
            <div className="landing-card-top">
              <span>PiggyBanq Wallet</span>
              <strong>PHP 50,000.00</strong>
              <small>Placeholder monthly limit</small>
            </div>
            <div className="landing-quick-actions" aria-label="Wallet preview actions">
              <span>Add</span>
              <span>Save</span>
              <span>Pledge</span>
            </div>
            <div className="landing-pocket">
              <span>Emergency pocket</span>
              <strong>42%</strong>
              <i aria-hidden="true" />
            </div>
            <ul className="landing-preview-list">
              {previewTransactions.map(([label, value, meta]) => (
                <li key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{meta}</small>
                </li>
              ))}
            </ul>
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
