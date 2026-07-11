import { KYC_FREE_LIMIT_PHP } from '@piggybanq/types/kyc';
import { STELLAR_TESTNET_CONFIG } from '@piggybanq/stellar-core/network';
import { DashboardLogoutButton } from '../../components/DashboardLogoutButton';
import { ThemeToggle } from '../../components/ThemeToggle';
import { type AuthUser, requireWalletSession } from './_lib/session';
import { DashboardFeaturePanels } from './DashboardFeaturePanels';
import { DashboardWalletSummary } from './DashboardWalletSummary';

const navItems = [
  ['dashboard', 'grid', '#dashboard'],
  ['wallet', 'wallet', '#wallet'],
  ['pockets', 'pocket', '#pockets'],
  ['profile', 'profile', '/dashboard/community'],
  ['budget', 'plus', '/dashboard/community'],
  ['community', 'help', '/dashboard/community'],
  ['transactions', 'swap', '#transactions'],
  ['settings', 'gear', '#settings'],
  ['security', 'shield', '#security']
] as const;

const checklist = [
  ['You control your keys', 'Your private key is stored locally on this device.', true],
  ['Transactions are signed locally', 'All transactions are signed on your device before broadcast.', true],
  ['Funds secured by Stellar network', 'Stellar network consensus secures your funds.', true],
  ['Beware of phishing', 'Never share your secret key or sign unknown transactions.', true],
  ['Enable additional backup', 'Back up your local key to avoid permanent loss.', false]
] as const;

type DashboardSnapshot = {
  network: string;
  accountLabel: string;
  walletLinked: boolean;
  balanceLabel: string;
  balanceMeta: string;
  pocketCount: number;
  pocketMeta: string;
  totalSavedLabel: string;
  totalGoalsLabel: string;
  ledgerEvents: readonly DashboardLedgerEvent[];
};

type DashboardLedgerEvent = {
  kind: string;
  detail: string;
  amount: string;
  time: string;
  icon: IconName;
};

async function getDashboardSnapshot(user: AuthUser): Promise<DashboardSnapshot> {
  const stellarPublicKey = user.stellarPublicKey ?? '';
  const accountLabel = stellarPublicKey ? `${stellarPublicKey.slice(0, 6)}...${stellarPublicKey.slice(-6)}` : 'No account linked';

  return {
    network: 'TESTNET',
    accountLabel,
    walletLinked: Boolean(stellarPublicKey),
    balanceLabel: 'No wallet linked',
    balanceMeta: stellarPublicKey
      ? 'Stellar wallet ownership verified. Fund the account to load live Horizon balances.'
      : 'Connect a self-custodial Stellar wallet to load live Horizon balances.',
    pocketCount: 0,
    pocketMeta: 'No pockets created yet',
    totalSavedLabel: 'PHP 0.00',
    totalGoalsLabel: 'PHP 0.00',
    ledgerEvents: []
  };
}

export default async function DashboardPage() {
  const authUser = await requireWalletSession();
  const snapshot = await getDashboardSnapshot(authUser);

  return (
    <div className="dashboard-shell">
        <Sidebar snapshot={snapshot} />

        <main className="dashboard-main">
          <header id="settings" className="dashboard-topbar" aria-label="Workspace status">
            <div className="dashboard-status">
              <span>TESTNET</span>
              <span className="dashboard-status-dot" aria-hidden="true" />
            </div>
            <span className="topbar-rule" aria-hidden="true" />
            <ThemeToggle />
            <a className="glyph-button" href="#profile" aria-label="Open profile">
              <Icon name="profile" />
            </a>
            <DashboardLogoutButton />
          </header>

          <section id="dashboard" className="dashboard-hero" aria-labelledby="dashboard-title">
            <div className="halftone halftone-dashboard-top" aria-hidden="true" />
            <div>
              <p className="dashboard-section-label">01 - WALLET FOUNDATION</p>
              <h1 id="dashboard-title">PiggyBanq</h1>
              <p className="dashboard-hero-copy">
                Welcome, {authUser.displayName}. Your dashboard session is verified by wallet signature and a secure server cookie.
              </p>
            </div>
            <div className="dashboard-hero-actions" aria-label="Primary wallet actions">
              <a href="#wallet"><Icon name="wallet" /> Wallet</a>
              <a href="#budget"><Icon name="plus" /> Budget</a>
              <a href="/dashboard/community"><Icon name="help" /> Community</a>
            </div>
          </section>

          <DashboardWalletSummary kycFreeLimitPhp={KYC_FREE_LIMIT_PHP} stellarPublicKey={authUser.stellarPublicKey} />

          <DashboardFeaturePanels />

          <section className="dashboard-panels" aria-label="Phase 0-2 controls">
            <article id="security" className="dashboard-card safety-card">
              <div className="dashboard-card-heading">
                <span className="panel-title-icon" aria-hidden="true">
                  <Icon name="shield" />
                </span>
                <h2>STELLAR SAFETY CHECKLIST</h2>
              </div>
              <ul className="dashboard-checklist">
                {checklist.map(([title, detail, complete]) => (
                  <li key={title}>
                    <span className={complete ? 'round-check is-complete' : 'round-check'} aria-hidden="true">
                      {complete ? <Icon name="check" /> : null}
                    </span>
                    <span>
                      <strong>{title}</strong>
                      <small>{detail}</small>
                    </span>
                  </li>
                ))}
              </ul>
              <a className="dashboard-link" href="https://developers.stellar.org/docs">
                Learn more about Stellar Security <Icon name="external" />
              </a>
            </article>

            <article id="transactions" className="dashboard-card ledger-card">
              <div className="dashboard-card-heading">
                <h2>RECENT LEDGER EVENTS</h2>
                <Icon name="list" />
              </div>
              {snapshot.ledgerEvents.length > 0 ? (
                <ul className="dashboard-ledger">
                  {snapshot.ledgerEvents.map((event) => (
                    <li key={`${event.kind}-${event.time}`}>
                      <span className="ledger-icon" aria-hidden="true">
                        <Icon name={event.icon} />
                      </span>
                      <span className="ledger-copy">
                        <strong>{event.kind}</strong>
                        <small>{event.detail}</small>
                      </span>
                      <span className="ledger-amount">{event.amount}</span>
                      <time>{event.time}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="dashboard-empty-state">
                  <span className="ledger-icon" aria-hidden="true">
                    <Icon name="wallet" />
                  </span>
                  <strong>No ledger events yet</strong>
                  <small>Payments, deposits, withdrawals, and pocket movements appear here after wallet activity is recorded.</small>
                </div>
              )}
              <a className="dashboard-link" href="#transactions">
                View all transactions <Icon name="external" />
              </a>
            </article>
          </section>

          <section className="dashboard-custody" aria-labelledby="custody-title">
            <div className="halftone halftone-dashboard-bottom" aria-hidden="true" />
            <span className="custody-icon" aria-hidden="true">
              <Icon name="lock" />
            </span>
            <div>
              <p>LOCAL-KEY CUSTODY</p>
              <h2 id="custody-title">PiggyBanq is a non-custodial wallet. Your private key never leaves your device.</h2>
              <span>We cannot access or recover your funds.</span>
            </div>
            <span className="dashboard-pill">NON-CUSTODIAL</span>
          </section>

          <section className="dashboard-technical-strip" aria-label="Development endpoints">
            <span>{STELLAR_TESTNET_CONFIG.horizonUrl}</span>
            <span>{STELLAR_TESTNET_CONFIG.rpcUrl}</span>
            <span>POLL PENDING TX: 1S / 60 ATTEMPTS</span>
          </section>
        </main>
    </div>
  );
}

function Sidebar({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <aside className="dashboard-sidebar" aria-label="Primary navigation">
      <a className="dashboard-brand" href="/dashboard" aria-label="PiggyBanq dashboard">
        <span className="pig-mark" aria-hidden="true">
          <span />
        </span>
        <span>PiggyBanq</span>
      </a>

      <nav>
        {navItems.map(([item, icon, href], index) => (
          <a key={item} className={index === 0 ? 'is-active' : ''} href={href}>
            <Icon name={icon} />
            <span>{item.toUpperCase()}</span>
          </a>
        ))}
      </nav>

      <div className="dashboard-sidebar-card">
        <div>
          <p>NETWORK</p>
          <strong>{snapshot.network}</strong>
          <span aria-hidden="true" />
        </div>
        <div>
          <p>ACCOUNT</p>
          <strong>{snapshot.accountLabel}</strong>
          {snapshot.walletLinked ? <Icon name="copy" /> : null}
        </div>
      </div>

      <p className="dashboard-copyright">© 2025 PiggyBanq</p>
    </aside>
  );
}

type IconName =
  | 'grid'
  | 'wallet'
  | 'pocket'
  | 'swap'
  | 'id'
  | 'gear'
  | 'shield'
  | 'help'
  | 'sun'
  | 'profile'
  | 'scan'
  | 'plus'
  | 'check'
  | 'external'
  | 'list'
  | 'down'
  | 'up'
  | 'star'
  | 'lock'
  | 'copy';

function Icon({ name }: { name: IconName | string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' };
  const stroke = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'grid':
      return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1" {...stroke} /><rect x="14" y="4" width="6" height="6" rx="1" {...stroke} /><rect x="4" y="14" width="6" height="6" rx="1" {...stroke} /><rect x="14" y="14" width="6" height="6" rx="1" {...stroke} /></svg>;
    case 'wallet':
      return <svg {...common}><path d="M4 7h15a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1Z" {...stroke} /><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" {...stroke} /><path d="M6 7l9-3 1 3" {...stroke} /></svg>;
    case 'pocket':
      return <svg {...common}><path d="M5 6h14v12H5z" {...stroke} /><path d="M5 7l7 6 7-6" {...stroke} /></svg>;
    case 'swap':
      return <svg {...common}><path d="M7 7h13m0 0-4-4m4 4-4 4M17 17H4m0 0 4-4m-4 4 4 4" {...stroke} /></svg>;
    case 'id':
      return <svg {...common}><rect x="5" y="4" width="14" height="16" rx="2" {...stroke} /><circle cx="12" cy="10" r="2" {...stroke} /><path d="M8.5 16a4 4 0 0 1 7 0" {...stroke} /></svg>;
    case 'gear':
      return <svg {...common}><circle cx="12" cy="12" r="3" {...stroke} /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" {...stroke} /></svg>;
    case 'shield':
      return <svg {...common}><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z" {...stroke} /><path d="m9 12 2 2 4-5" {...stroke} /></svg>;
    case 'help':
      return <svg {...common}><circle cx="12" cy="12" r="9" {...stroke} /><path d="M9.5 9a2.7 2.7 0 1 1 4.4 2.1c-1.1.8-1.9 1.2-1.9 2.4" {...stroke} /><path d="M12 17h.01" {...stroke} /></svg>;
    case 'sun':
      return <svg {...common}><circle cx="12" cy="12" r="4" {...stroke} /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" {...stroke} /></svg>;
    case 'profile':
      return <svg {...common}><circle cx="12" cy="8" r="4" {...stroke} /><path d="M4 21a8 8 0 0 1 16 0" {...stroke} /></svg>;
    case 'scan':
      return <svg {...common}><path d="M8 4H5a1 1 0 0 0-1 1v3m12-4h3a1 1 0 0 1 1 1v3M8 20H5a1 1 0 0 1-1-1v-3m16 0v3a1 1 0 0 1-1 1h-3" {...stroke} /><path d="M9 12h6" {...stroke} /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" {...stroke} /></svg>;
    case 'check':
      return <svg {...common}><path d="m6 12 4 4 8-8" {...stroke} /></svg>;
    case 'external':
      return <svg {...common}><path d="M7 17 17 7M9 7h8v8" {...stroke} /></svg>;
    case 'list':
      return <svg {...common}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" {...stroke} /></svg>;
    case 'down':
      return <svg {...common}><circle cx="12" cy="12" r="10" {...stroke} /><path d="M12 6v10m0 0 4-4m-4 4-4-4" {...stroke} /></svg>;
    case 'up':
      return <svg {...common}><circle cx="12" cy="12" r="10" {...stroke} /><path d="M12 18V8m0 0 4 4m-4-4-4 4" {...stroke} /></svg>;
    case 'star':
      return <svg {...common}><circle cx="12" cy="12" r="10" {...stroke} /><path d="m12 7 1.5 3 3.3.5-2.4 2.3.6 3.2-3-1.6-3 1.6.6-3.2-2.4-2.3 3.3-.5L12 7Z" {...stroke} /></svg>;
    case 'lock':
      return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" {...stroke} /><path d="M8 10V7a4 4 0 0 1 8 0v3" {...stroke} /></svg>;
    case 'copy':
      return <svg {...common}><rect x="9" y="9" width="10" height="10" rx="2" {...stroke} /><rect x="5" y="5" width="10" height="10" rx="2" {...stroke} /></svg>;
    default:
      return null;
  }
}
