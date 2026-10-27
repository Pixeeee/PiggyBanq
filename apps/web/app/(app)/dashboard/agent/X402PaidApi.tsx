'use client';

import { useEffect, useRef, useState } from 'react';
import { Buffer } from 'buffer';
import { assertX402Requirements } from '@piggybanq/stellar-core/x402';
import { formatStellarAmount } from '@piggybanq/stellar-core/amounts';
import { signX402Payment, x402Request, type X402Intent } from '../../../lib/x402-payment';
import { UiAlert, UiBadge, UiButton, UiCard } from '../../../components/ui/DashboardPrimitives';

export function X402PaidApi({ username, publicKey, isDemo }: { username: string; publicKey: string; isDemo: boolean }) {
  const alive = useRef(true);
  const working = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const active = () => alive.current && document.visibilityState === 'visible';
  const [intent, setIntent] = useState<X402Intent | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Purchase one test savings insight. You review and approve every payment.');
  const [insight, setInsight] = useState<{ title: string; suggestion: string } | null>(null);
  const storage = `piggybanq.x402.pending.${publicKey}`;

  useEffect(() => {
    const id = localStorage.getItem(storage);
    if (id && !isDemo) void perform(async () => {
      const { data } = await x402Request(`/intents/${encodeURIComponent(id)}`);
      setIntent(data.intent);
    });
  }, [storage, isDemo]);

  async function perform(action: () => Promise<void>) {
    if (working.current || !alive.current) return;
    working.current = true;
    setBusy(true);
    try { await action(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Payment could not be completed.'); }
    finally { working.current = false; if (alive.current) setBusy(false); }
  }

  async function quote() {
    await perform(async () => {
      setInsight(null);
      const { data } = await x402Request('/intents', { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID() } });
      assertX402Requirements(data.intent.requirements);
      if (data.intent.payer !== publicKey) throw new Error('Payment wallet mismatch.');
      const challenge = await x402Request(`/test/insight/${encodeURIComponent(data.intent.id)}`);
      if (challenge.response.status !== 402 || !challenge.response.headers.has('payment-required')) throw new Error('The test API did not issue an x402 challenge.');
      setIntent(data.intent);
      localStorage.setItem(storage, data.intent.id);
      setMessage('Review the exact recipient, amount and limits before approving.');
    });
  }

  async function approve() {
    if (!intent) return;
    await perform(async () => {
      const { data } = await x402Request(`/intents/${intent.id}/approve`, { method: 'POST' });
      setIntent(data.intent);
      setMessage('Approved. Enter your local wallet password to sign this payment on this device.');
    });
  }

  async function pay() {
    if (!intent) return;
    await perform(async () => {
      let payload: Awaited<ReturnType<typeof signX402Payment>>;
      try { payload = await signX402Payment({ username, password, intent, isActive: active }); }
      finally { setPassword(''); }
      if (!active()) throw new Error('Payment view closed or hidden. Refresh status before retrying.');
      const { data, response } = await x402Request(`/test/insight/${intent.id}`, {
        headers: { 'PAYMENT-SIGNATURE': Buffer.from(JSON.stringify(payload)).toString('base64') }
      });
      setIntent(data.intent);
      if (response.status === 200 && data.intent.receipt?.verified === true) {
        setInsight(data.insight);
        setMessage('Payment verified on Stellar Testnet. The paid API returned its result.');
      } else setMessage('Settlement is not confirmed yet. Refresh status; do not create another payment.');
    });
  }

  async function refresh() {
    if (!intent) return;
    await perform(async () => {
      const { data } = await x402Request(`/intents/${intent.id}`);
      setIntent(data.intent);
      if (data.intent.status === 'SUCCEEDED') {
        const paid = await x402Request(`/test/insight/${intent.id}`);
        setInsight(paid.data.insight);
        setMessage('Verified receipt recovered. This result does not require another payment.');
      } else setMessage(`Payment status: ${data.intent.status}. No successful receipt has been issued.`);
    });
  }

  async function cancel() {
    if (!intent) return;
    await perform(async () => {
      const { data } = await x402Request(`/intents/${intent.id}/cancel`, { method: 'POST' });
      setIntent(data.intent);
      setPassword('');
      setMessage(data.intent.status === 'CANCELLED' ? 'Payment cancelled before submission.' : 'This payment can no longer be cancelled; refresh its status.');
    });
  }

  return <section className="agentic-command-center" aria-labelledby="x402-title">
    <UiCard><UiBadge>Live Stellar Testnet · x402</UiBadge><h1 id="x402-title">Pay for a test API</h1>
      <p>The agent prepares one paid savings insight. You approve and sign locally. Testnet XLM has no monetary value.</p>
      {isDemo ? <UiAlert title="Wallet required">Sign in with your own wallet to use live Testnet payments.</UiAlert> : null}
      <UiButton type="button" onClick={quote} disabled={busy || isDemo || Boolean(intent && ['APPROVED', 'SUBMITTING', 'UNKNOWN'].includes(intent.status))}>Preview test API payment</UiButton>
      <UiAlert title="Payment status">{message}</UiAlert>
    </UiCard>
    {intent ? <UiCard><h2>Review payment</h2><dl className="agentic-review-grid">
      <div><dt>Service</dt><dd>PiggyBanq test savings insight</dd></div>
      <div><dt>Amount</dt><dd>{formatStellarAmount(BigInt(intent.requirements.amount))} XLM · Testnet</dd></div>
      <div><dt>Recipient</dt><dd style={{ overflowWrap: 'anywhere' }}>{intent.requirements.payTo}</dd></div>
      <div><dt>Fee</dt><dd>Sponsored · 0 XLM charged to your wallet</dd></div>
      <div><dt>Limits</dt><dd>0.001 XLM per payment · 0.01 XLM per rolling 24 hours</dd></div>
      <div><dt>Status</dt><dd role="status">{intent.status}</dd></div>
    </dl>
      <div className="agentic-review-actions">
        <UiButton type="button" onClick={approve} disabled={busy || intent.status !== 'AWAITING_APPROVAL'}>Approve payment</UiButton>
        {intent.status === 'APPROVED' ? <label>Local wallet password<input aria-label="Local wallet password" type="password" autoComplete="off" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label> : null}
        <UiButton type="button" onClick={pay} disabled={busy || intent.status !== 'APPROVED' || !password}>Sign locally and pay</UiButton>
        <UiButton type="button" variant="outline" onClick={refresh} disabled={busy}>Refresh payment status</UiButton>
        <UiButton type="button" variant="outline" onClick={cancel} disabled={busy || !['AWAITING_APPROVAL', 'APPROVED'].includes(intent.status)}>Cancel unsubmitted payment</UiButton>
      </div>
      {intent.receipt?.verified ? <UiAlert title="Verified ledger receipt" tone="success"><a href={`https://stellar.expert/explorer/testnet/tx/${intent.receipt.transaction}`} target="_blank" rel="noreferrer" style={{ overflowWrap: 'anywhere' }}>{intent.receipt.transaction}</a><p>Ledger {intent.receipt.ledger} · {intent.receipt.network}</p></UiAlert> : null}
    </UiCard> : null}
    {insight ? <UiCard><h2>{insight.title}</h2><p>{insight.suggestion}</p><small>Paid test API response · Educational example</small></UiCard> : null}
  </section>;
}
