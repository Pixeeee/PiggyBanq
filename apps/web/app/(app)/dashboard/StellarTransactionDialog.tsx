'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { StellarIntentView, StellarOperationType } from '@piggybanq/types/stellar-transactions';

import { getStellarIntent, quoteStellarTransaction, submitStellarTransaction, type StellarQuoteInput } from '../../lib/wallet-auth-api';
import { signStellarTransaction } from '../../lib/stellar-transactions';

type Props = {
  operation: StellarOperationType;
  username: string;
  publicKey: string;
  onClose: () => void;
  onSettled: () => void;
};

function formatUnits(units: string | null) {
  if (units === null) return '—';
  const value = BigInt(units);
  const whole = value / 10_000_000n;
  const fraction = (value % 10_000_000n).toString().padStart(7, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function shortKey(value: string | null) {
  return value ? `${value.slice(0, 8)}…${value.slice(-8)}` : '—';
}

export function StellarTransactionDialog({ operation, username, publicKey, onClose, onSettled }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [amount, setAmount] = useState(operation === 'CHANGE_TRUST' ? '10000' : '1');
  const [assetCode, setAssetCode] = useState<'XLM' | 'USDC'>('XLM');
  const [destination, setDestination] = useState('');
  const [memo, setMemo] = useState('');
  const [slippageBps, setSlippageBps] = useState(100);
  const [quote, setQuote] = useState<StellarIntentView | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = dialogRef.current?.querySelector<HTMLElement>('button, input, select');
    first?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, []);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !busy) onClose();
    if (event.key !== 'Tab') return;
    const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]') ?? [])];
    if (controls.length === 0) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function requestBody(): StellarQuoteInput {
    if (operation === 'PAYMENT') return { operationType: operation, destination, assetCode, amount, ...(memo ? { memo } : {}) };
    if (operation === 'CHANGE_TRUST') return { operationType: operation, assetCode: 'USDC', limit: amount, ...(memo ? { memo } : {}) };
    return { operationType: operation, sendAssetCode: assetCode, sendAmount: amount, destinationAssetCode: assetCode === 'XLM' ? 'USDC' : 'XLM', slippageBps, ...(memo ? { memo } : {}) };
  }

  async function prepareReview() {
    setBusy(true);
    setError('');
    try {
      setQuote(await quoteStellarTransaction(requestBody(), crypto.randomUUID().replaceAll('-', '')));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The Testnet quote could not be prepared.');
    } finally {
      setBusy(false);
    }
  }

  async function signAndSubmit() {
    if (!quote) return;
    setBusy(true);
    setError('');
    try {
      const signed = await signStellarTransaction({ username, password, quote });
      setPassword('');
      const result = await submitStellarTransaction(quote.id, signed.signedXdr);
      setQuote(result);
      if (result.status === 'SUCCEEDED') onSettled();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The transaction did not complete.');
    } finally {
      setBusy(false);
    }
  }

  async function refreshStatus() {
    if (!quote) return;
    setBusy(true);
    setError('');
    try {
      const result = await getStellarIntent(quote.id);
      setQuote(result);
      if (result.status === 'SUCCEEDED') onSettled();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The transaction status could not be refreshed.');
    } finally {
      setBusy(false);
    }
  }

  const title = operation === 'PAYMENT' ? 'Send on Stellar' : operation === 'CHANGE_TRUST' ? 'Enable Testnet USDC' : 'Swap on Stellar';
  const terminal = quote && ['SUCCEEDED', 'FAILED', 'EXPIRED'].includes(quote.status);

  return (
    <div className="stellar-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="stellar-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="stellar-dialog-title" onKeyDown={trapFocus}>
        <header className="stellar-dialog-header">
          <div><span>Stellar Testnet · local signing</span><h2 id="stellar-dialog-title">{title}</h2></div>
          <button type="button" aria-label="Close transaction dialog" onClick={onClose} disabled={busy}>×</button>
        </header>

        {!quote ? (
          <div className="stellar-dialog-form">
            <p>Your encrypted PiggyBanq wallet stays on this device. A password is requested only after you review the exact transaction.</p>
            {operation === 'PAYMENT' ? <label><span>Destination public key</span><input value={destination} onChange={(event) => setDestination(event.target.value.trim())} placeholder="G…" autoComplete="off" spellCheck={false} /></label> : null}
            {operation !== 'CHANGE_TRUST' ? <label><span>{operation === 'PAYMENT' ? 'Asset' : 'You send'}</span><select value={assetCode} onChange={(event) => setAssetCode(event.target.value as 'XLM' | 'USDC')}><option value="XLM">XLM · Stellar Lumens</option><option value="USDC">USDC · official Testnet issuer</option></select></label> : null}
            <label><span>{operation === 'CHANGE_TRUST' ? 'Trustline limit' : 'Amount'}</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
            {operation === 'PATH_PAYMENT_STRICT_SEND' ? <label><span>Maximum slippage</span><select value={slippageBps} onChange={(event) => setSlippageBps(Number(event.target.value))}><option value={50}>0.5%</option><option value={100}>1.0%</option><option value={200}>2.0%</option></select></label> : null}
            <label><span>Memo (optional, 28 bytes max)</span><input value={memo} onChange={(event) => setMemo(event.target.value)} maxLength={28} /></label>
            {error ? <div className="stellar-inline-alert is-error" role="alert"><strong>Quote not created</strong><span>{error}</span></div> : null}
            <button className="stellar-primary-action" type="button" onClick={prepareReview} disabled={busy}>{busy ? 'Checking Testnet…' : 'Review transaction'}</button>
          </div>
        ) : (
          <div className="stellar-review">
            <div className={`stellar-intent-state is-${quote.status.toLowerCase()}`} role="status"><i /> <span><strong>{quote.status.replaceAll('_', ' ')}</strong><small>{quote.status === 'AWAITING_SIGNATURE' ? 'Review every detail before unlocking your wallet.' : quote.status === 'SUCCEEDED' ? 'Confirmed by Stellar Testnet.' : quote.status === 'UNKNOWN' || quote.status === 'SUBMITTED' ? 'Submission is unresolved. This is not shown as success.' : 'No further signing is available for this intent.'}</small></span></div>
            <dl className="stellar-review-grid">
              <div><dt>Network</dt><dd>{quote.review.network}</dd></div>
              <div><dt>Operation</dt><dd>{quote.review.operationType.replaceAll('_', ' ')}</dd></div>
              <div><dt>Source</dt><dd title={quote.review.source}>{shortKey(quote.review.source)}</dd></div>
              <div><dt>Destination</dt><dd title={quote.review.destination ?? ''}>{shortKey(quote.review.destination)}</dd></div>
              <div><dt>You send / limit</dt><dd>{formatUnits(quote.review.amountUnits)} {quote.review.assetCode}</dd></div>
              <div><dt>Asset issuer</dt><dd title={quote.review.assetIssuer ?? 'Native XLM'}>{quote.review.assetIssuer ? shortKey(quote.review.assetIssuer) : 'Native XLM'}</dd></div>
              {quote.review.quotedDestinationUnits ? <div><dt>Quoted output</dt><dd>{formatUnits(quote.review.quotedDestinationUnits)} {quote.review.destinationAssetCode}</dd></div> : null}
              {quote.review.minimumDestinationUnits ? <div><dt>Minimum received</dt><dd>{formatUnits(quote.review.minimumDestinationUnits)} {quote.review.destinationAssetCode}</dd></div> : null}
              <div><dt>Network fee cap</dt><dd>{formatUnits(quote.review.feeStroops)} XLM</dd></div>
              <div><dt>Memo</dt><dd>{quote.review.memo || 'None'}</dd></div>
              <div><dt>Expires</dt><dd>{new Date(quote.expiresAt).toLocaleTimeString()}</dd></div>
              <div><dt>Path</dt><dd>{quote.review.path.length ? quote.review.path.map((asset) => asset.code).join(' → ') : 'Direct'}</dd></div>
            </dl>
            {quote.status === 'AWAITING_SIGNATURE' ? <label className="stellar-password-field"><span>PiggyBanq wallet password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Unlock only for this signature" /></label> : null}
            {error ? <div className="stellar-inline-alert is-error" role="alert"><strong>Action needed</strong><span>{error}</span></div> : null}
            {quote.transactionHash && /^[a-f0-9]{64}$/.test(quote.transactionHash) ? <a className="stellar-explorer-link" href={`https://stellar.expert/explorer/testnet/tx/${quote.transactionHash}`} target="_blank" rel="noreferrer">View Testnet transaction ↗</a> : null}
            <div className="stellar-dialog-actions">
              {quote.status === 'AWAITING_SIGNATURE' ? <button type="button" className="stellar-primary-action" onClick={signAndSubmit} disabled={busy || !password}>{busy ? 'Signing locally…' : 'Sign locally & submit'}</button> : null}
              {quote.status === 'UNKNOWN' || quote.status === 'SUBMITTED' ? <button type="button" className="stellar-primary-action" onClick={refreshStatus} disabled={busy}>{busy ? 'Checking ledger…' : 'Refresh ledger status'}</button> : null}
              {!terminal && quote.status === 'AWAITING_SIGNATURE' ? <button type="button" className="stellar-secondary-action" onClick={() => { setQuote(null); setPassword(''); setError(''); }} disabled={busy}>Edit details</button> : null}
              {terminal ? <button type="button" className="stellar-secondary-action" onClick={onClose}>Close</button> : null}
            </div>
            <p className="stellar-signing-note">Signing authorizes only the reviewed XDR above. PiggyBanq never sends your password, recovery phrase, or secret key to the server.</p>
          </div>
        )}
      </div>
    </div>
  );
}
