'use client';

export default function DashboardError({ reset }: { reset: () => void }) {
  return <main className="wallet-access-page"><section className="wallet-access-card" role="alert">
    <h1>Workspace temporarily unavailable</h1>
    <p>Your wallet and saved session remain on this device. Retry when the service is available.</p>
    <button type="button" onClick={reset}>Retry workspace</button>
    <a href="/login">Back to wallet access</a>
  </section></main>;
}
