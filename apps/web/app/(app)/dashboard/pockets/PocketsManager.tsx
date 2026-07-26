'use client';

import { useEffect, useState } from 'react';

import {
  createSavingsPocket,
  createSavingsPocketEvent,
  getSavingsPockets,
  markSavingsPocketMatured,
  previewLockedEarning,
  withdrawSavingsPocket,
  type SavingsPocket
} from '../../../lib/wallet-auth-api';
import { minorToDecimal, minorToNumber } from '../_components/MoneyFormat';

const PHP_RATES = { XLM: 7.7, USDT: 57.5 } as const;

export function PocketsManager() {
  const [pockets, setPockets] = useState<SavingsPocket[]>([]);
  const [label, setLabel] = useState('XLM yield pocket');
  const [assetCode, setAssetCode] = useState<'XLM' | 'USDT'>('XLM');
  const [pocketType, setPocketType] = useState<'FLEXIBLE' | 'LOCKED_EARN'>('FLEXIBLE');
  const [targetAmount, setTargetAmount] = useState('');
  const [lockAmount, setLockAmount] = useState('100.00');
  const [lockDays, setLockDays] = useState<7 | 30 | 90>(30);
  const [apyBps, setApyBps] = useState(500);
  const [confirmed, setConfirmed] = useState(false);
  const [preview, setPreview] = useState<{
    principalMinor: string;
    estimatedInterestMinor: string;
    totalAtMaturityMinor: string;
    maturesAt: string;
  } | null>(null);
  const [selectedPocketId, setSelectedPocketId] = useState('');
  const [eventAmount, setEventAmount] = useState('');
  const [eventType, setEventType] = useState<'POCKET_CREDIT' | 'POCKET_DEBIT'>('POCKET_CREDIT');
  const [status, setStatus] = useState('Loading pockets...');

  useEffect(() => {
    void refreshPockets();
  }, []);

  async function refreshPockets() {
    try {
      const result = await getSavingsPockets();
      setPockets(result.pockets);
      setSelectedPocketId((current) => current || result.pockets[0]?.id || '');
      setStatus(result.pockets.length ? 'Pockets synced.' : 'No earning pockets yet.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to load pockets.');
    }
  }

  async function addPocket() {
    setStatus('Creating pocket...');
    try {
      if (pocketType === 'LOCKED_EARN' && !confirmed) {
        setStatus('Confirm the testnet earning pocket preview before creating it.');
        return;
      }
      const result = await createSavingsPocket({
        label,
        assetCode,
        targetAmount: targetAmount || undefined,
        pocketType,
        amount: pocketType === 'LOCKED_EARN' ? lockAmount : undefined,
        lockDays: pocketType === 'LOCKED_EARN' ? lockDays : undefined,
        apyBps: pocketType === 'LOCKED_EARN' ? apyBps : undefined
      });
      setPockets((current) => [result.pocket, ...current]);
      setSelectedPocketId(result.pocket.id);
      setTargetAmount('');
      setConfirmed(false);
      setPreview(null);
      setStatus('Pocket created.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to create pocket.');
    }
  }

  async function updatePreview() {
    setStatus('Calculating testnet earning preview...');
    try {
      const result = await previewLockedEarning({ amount: lockAmount, lockDays, apyBps });
      setPreview(result.preview);
      setStatus('Preview ready.');
    } catch (error) {
      setPreview(null);
      setStatus(error instanceof Error ? error.message : 'Failed to preview earning pocket.');
    }
  }

  async function addPocketEvent() {
    if (!selectedPocketId) {
      setStatus('Choose a pocket first.');
      return;
    }
    setStatus('Updating pocket balance...');
    try {
      const result = await createSavingsPocketEvent(selectedPocketId, { type: eventType, amount: eventAmount });
      setPockets((current) => current.map((pocket) => (pocket.id === result.pocket.id ? result.pocket : pocket)));
      setEventAmount('');
      setStatus('Pocket balance updated.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to update pocket.');
    }
  }

  async function markMatured(id: string) {
    setStatus('Checking maturity...');
    try {
      const result = await markSavingsPocketMatured(id);
      setPockets((current) => current.map((pocket) => (pocket.id === result.pocket.id ? result.pocket : pocket)));
      setStatus(result.pocket.status === 'matured' ? 'Pocket is matured.' : 'Pocket is still locked.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to check maturity.');
    }
  }

  async function withdrawPocket(id: string) {
    setStatus('Withdrawing matured pocket...');
    try {
      const result = await withdrawSavingsPocket(id);
      setPockets((current) => current.map((pocket) => (pocket.id === result.pocket.id ? result.pocket : pocket)));
      setStatus('Matured pocket withdrawn.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Withdrawal is blocked until maturity.');
    }
  }

  return (
    <article className="live-manager-card">
      <div className="live-manager-heading">
        <div>
          <span>Live pocket controls</span>
          <strong>Create XLM or USDT earning allocation</strong>
        </div>
        <em>{status}</em>
      </div>

      <p className="manager-disclaimer">
        PiggyBanq Earning Pockets currently run on Stellar Testnet. Testnet assets have no real monetary value and
        displayed yield is for demo purposes.
      </p>

      <form className="manager-form">
        <label>Pocket name<input value={label} onChange={(event) => setLabel(event.target.value)} /></label>
        <label>
          Token
          <select value={assetCode} onChange={(event) => setAssetCode(event.target.value as 'XLM' | 'USDT')}>
            <option value="XLM">XLM</option>
            <option value="USDT">USDT</option>
          </select>
        </label>
        <label>
          Pocket type
          <select value={pocketType} onChange={(event) => setPocketType(event.target.value as typeof pocketType)}>
            <option value="FLEXIBLE">Flexible savings</option>
            <option value="LOCKED_EARN">Locked earn</option>
          </select>
        </label>
        {pocketType === 'FLEXIBLE' ? (
          <label>Target<input value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder="500.00" /></label>
        ) : (
          <>
            <label>Lock amount<input value={lockAmount} onChange={(event) => setLockAmount(event.target.value)} placeholder="100.00" /></label>
            <label>
              Duration
              <select value={lockDays} onChange={(event) => setLockDays(Number(event.target.value) as 7 | 30 | 90)}>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
            <label>APY bps<input value={apyBps} onChange={(event) => setApyBps(Number(event.target.value))} /></label>
          </>
        )}
        {pocketType === 'LOCKED_EARN' ? <button type="button" onClick={updatePreview}>Preview yield</button> : null}
        <button type="button" onClick={addPocket}>Create pocket</button>
      </form>

      {pocketType === 'LOCKED_EARN' && preview ? (
        <div className="overview-live-grid earning-preview-panel">
          <section>
            <span>Estimated yield</span>
            <strong>{minorToDecimal(preview.estimatedInterestMinor)} {assetCode}</strong>
            <small>PHP {(minorToNumber(preview.estimatedInterestMinor) * PHP_RATES[assetCode]).toLocaleString(undefined, { maximumFractionDigits: 2 })} est.</small>
          </section>
          <section>
            <span>Maturity</span>
            <strong>{new Date(preview.maturesAt).toLocaleDateString()}</strong>
            <small>{minorToDecimal(preview.totalAtMaturityMinor)} {assetCode} at maturity</small>
          </section>
          <label className="manager-checkbox">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            I understand this is a Stellar testnet demo estimate.
          </label>
        </div>
      ) : null}

      <form className="manager-form compact-manager-form">
        <label>
          Pocket
          <select value={selectedPocketId} onChange={(event) => setSelectedPocketId(event.target.value)}>
            <option value="">Choose pocket</option>
            {pockets.map((pocket) => <option key={pocket.id} value={pocket.id}>{pocket.label}</option>)}
          </select>
        </label>
        <label>
          Action
          <select value={eventType} onChange={(event) => setEventType(event.target.value as typeof eventType)}>
            <option value="POCKET_CREDIT">Add money</option>
            <option value="POCKET_DEBIT">Withdraw plan</option>
          </select>
        </label>
        <label>Amount<input value={eventAmount} onChange={(event) => setEventAmount(event.target.value)} placeholder="25.00" /></label>
        <button type="button" onClick={addPocketEvent}>Update balance</button>
      </form>

      <div className="manager-table" aria-label="Saved earning pockets">
        {pockets.map((pocket) => (
          <div key={pocket.id}>
            <span>{pocket.label} · {pocket.status}</span>
            <strong>{minorToDecimal(pocket.balanceMinor)} {pocket.assetCode}</strong>
            <small>
              PHP {(minorToNumber(pocket.balanceMinor) * PHP_RATES[pocket.assetCode]).toLocaleString(undefined, { maximumFractionDigits: 2 })} est.
              {pocket.pocketType === 'LOCKED_EARN' && pocket.estimatedInterestMinor
                ? ` · yield ${minorToDecimal(pocket.estimatedInterestMinor)} ${pocket.assetCode}`
                : ''}
              {pocket.maturesAt ? ` · matures ${new Date(pocket.maturesAt).toLocaleDateString()}` : ''}
            </small>
            {pocket.pocketType === 'LOCKED_EARN' ? (
              <div className="manager-row-actions">
                <button type="button" onClick={() => markMatured(pocket.id)}>Check maturity</button>
                <button type="button" onClick={() => withdrawPocket(pocket.id)} disabled={pocket.status !== 'matured'}>Withdraw matured</button>
              </div>
            ) : null}
            <small>{pocket.events.slice(0, 3).map((event) => event.type).join(' · ') || 'No ledger events yet'}</small>
          </div>
        ))}
      </div>
    </article>
  );
}
