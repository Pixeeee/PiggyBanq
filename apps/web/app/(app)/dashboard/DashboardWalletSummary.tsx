export function DashboardWalletSummary({
  kycFreeLimitPhp,
  stellarPublicKey
}: {
  kycFreeLimitPhp: number;
  stellarPublicKey: string | null;
}) {
  const walletLinked = Boolean(stellarPublicKey);

  return (
    <section id="wallet" className="dashboard-metrics" aria-label="Wallet overview">
      <article className="dashboard-card metric-card metric-card-primary">
        <div className="metric-heading">
          <p>TESTNET BALANCE</p>
          <span className="metric-action" aria-hidden="true">
            <span className="metric-action-dot" aria-hidden="true" />
          </span>
        </div>
        <strong>{walletLinked ? 'Wallet verified' : 'No wallet linked'}</strong>
        <span>
          {walletLinked
            ? 'Stellar ownership verified. Balance appears after the account is funded and Horizon syncs.'
            : 'Log in with your Stellar wallet to unlock the wallet workspace.'}
        </span>
        <dl>
          <div>
            <dt>Network</dt>
            <dd>TESTNET</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>{stellarPublicKey ? maskWallet(stellarPublicKey) : 'No account linked'}</dd>
          </div>
        </dl>
      </article>

      <article className="dashboard-card metric-card">
        <div className="metric-heading">
          <p>KYC-FREE LIMIT</p>
          <span className="metric-action" aria-hidden="true">
            <span className="metric-action-diamond" aria-hidden="true" />
          </span>
        </div>
        <strong>PHP {kycFreeLimitPhp.toLocaleString()}.00</strong>
        <span>KYC-free monthly transaction limit</span>
        <dl>
          <div>
            <dt>Status</dt>
            <dd><span className="mini-badge">KYC-FREE</span></dd>
          </div>
          <div>
            <dt>Reset</dt>
            <dd>Monthly</dd>
          </div>
        </dl>
      </article>

      <article id="pockets" className="dashboard-card metric-card">
        <div className="metric-heading">
          <p>SAVINGS POCKETS</p>
          <span className="metric-action" aria-hidden="true">
            <span className="metric-action-plus" aria-hidden="true" />
          </span>
        </div>
        <strong>0</strong>
        <span>Create pockets for goals, bills, and emergency savings.</span>
        <dl>
          <div>
            <dt>Total Saved</dt>
            <dd>PHP 0.00</dd>
          </div>
          <div>
            <dt>Total Goals</dt>
            <dd>PHP 0.00</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}

function maskWallet(value: string) {
  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}
