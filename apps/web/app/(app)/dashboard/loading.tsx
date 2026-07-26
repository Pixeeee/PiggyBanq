export default function DashboardLoading() {
  return (
    <main className="route-loading-shell dashboard-loading-shell" aria-label="Dashboard loading">
      <div className="route-loading-media" aria-hidden="true" />
      <section className="route-loading-card dashboard-glass-strong" role="status" aria-live="polite">
        <div className="route-loading-brand">
          <span><img src="/piggy_icon.png" alt="" /></span>
          <strong>PiggyBanq</strong>
        </div>
        <p className="route-loading-label">Verifying secure wallet session</p>
        <h1>Preparing your savings dashboard.</h1>
        <p className="route-loading-copy">
          Keeping private keys local while PiggyBanq checks your signed session cookie.
        </p>
        <div className="route-loading-bar" aria-hidden="true"><span /></div>
        <div className="route-loading-grid" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
