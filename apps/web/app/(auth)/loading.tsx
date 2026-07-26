export default function AuthLoading() {
  return (
    <main className="route-loading-shell auth-loading-shell" aria-label="Wallet access loading">
      <section className="route-loading-card dashboard-glass-strong" role="status" aria-live="polite">
        <div className="route-loading-brand">
          <span><img src="/piggy_icon.png" alt="" /></span>
          <strong>PiggyBanq</strong>
        </div>
        <p className="route-loading-label">Preparing secure wallet access</p>
        <h1>Opening your sign-in flow.</h1>
        <p className="route-loading-copy">
          Local wallet encryption stays in the browser. The backend only verifies signed challenges.
        </p>
        <div className="route-loading-bar" aria-hidden="true"><span /></div>
      </section>
    </main>
  );
}
