'use client';

import { useEffect, useMemo, useState } from 'react';

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

const PHP_RATES = { XLM: 7.7, USDC: 57.5, USDT: 57.5 } as const;
const APR_FORECAST_PERIODS = [
  { label: 'Daily', caption: '1 day', days: 1 },
  { label: 'Weekly', caption: '7 days', days: 7 },
  { label: 'Monthly', caption: '30 days', days: 30 },
  { label: 'Yearly', caption: '365 days', days: 365 }
] as const;

export function PocketsManager() {
  const [pockets, setPockets] = useState<SavingsPocket[]>([]);
  const [label, setLabel] = useState('XLM APR position');
  const [assetCode, setAssetCode] = useState<'XLM' | 'USDC' | 'USDT'>('XLM');
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
  const aprForecast = useMemo(() => {
    return preview ? calculateAprForecast(preview.principalMinor, apyBps) : [];
  }, [apyBps, preview]);

  useEffect(() => {
    void refreshPockets();
  }, []);

  async function refreshPockets() {
    try {
      const result = await getSavingsPockets();
      setPockets(result.pockets);
      setSelectedPocketId((current) => current || result.pockets[0]?.id || '');
      setStatus(result.pockets.length ? 'Stake positions synced.' : 'No stake positions yet.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to load pockets.');
    }
  }

  async function addPocket() {
    setStatus('Creating stake position...');
    try {
      if (pocketType === 'LOCKED_EARN' && !confirmed) {
        setStatus('Confirm the testnet APR preview before creating it.');
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
      setStatus('Stake position created.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to create stake position.');
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
      setStatus(error instanceof Error ? error.message : 'Failed to preview APR position.');
    }
  }

  async function addPocketEvent() {
    if (!selectedPocketId) {
      setStatus('Choose a stake position first.');
      return;
    }
    setStatus('Updating stake position...');
    try {
      const result = await createSavingsPocketEvent(selectedPocketId, { type: eventType, amount: eventAmount });
      setPockets((current) => current.map((pocket) => (pocket.id === result.pocket.id ? result.pocket : pocket)));
      setEventAmount('');
      setStatus('Stake position updated.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to update stake position.');
    }
  }

  async function markMatured(id: string) {
    setStatus('Checking maturity...');
    try {
      const result = await markSavingsPocketMatured(id);
      setPockets((current) => current.map((pocket) => (pocket.id === result.pocket.id ? result.pocket : pocket)));
      setStatus(result.pocket.status === 'matured' ? 'Stake position is matured.' : 'Stake position is still locked.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to check maturity.');
    }
  }

  async function withdrawPocket(id: string) {
    setStatus('Withdrawing matured stake position...');
    try {
      const result = await withdrawSavingsPocket(id);
      setPockets((current) => current.map((pocket) => (pocket.id === result.pocket.id ? result.pocket : pocket)));
      setStatus('Matured stake position withdrawn.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Stake withdrawal is blocked until maturity.');
    }
  }

  return (
    <article className="live-manager-card stake-manager-card">
      <div className="live-manager-heading">
        <div>
          <span>Stake controls</span>
          <strong>Create an XLM or USDC testnet position</strong>
        </div>
        <em>{status}</em>
      </div>

      <p className="manager-disclaimer">
        Strategy source: stellar-testnet-simulation. Testnet assets have no real monetary value and displayed APR is an estimate, not a guaranteed return.
      </p>

      <section className="stake-form-section" aria-label="Create stake position">
        <div className="stake-form-heading">
          <span>1</span>
          <div>
            <strong>Create stake position</strong>
            <small>Preview APR before creating a locked earn position.</small>
          </div>
        </div>

        <form className="manager-form stake-create-form">
          <label>Position name<input value={label} onChange={(event) => setLabel(event.target.value)} /></label>
          <label>
            Token
            <select value={assetCode} onChange={(event) => setAssetCode(event.target.value as 'XLM' | 'USDC' | 'USDT')}>
              <option value="XLM">XLM</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
            </select>
          </label>
          <label>
            Stake type
            <select value={pocketType} onChange={(event) => setPocketType(event.target.value as typeof pocketType)}>
              <option value="FLEXIBLE">Flexible savings</option>
              <option value="LOCKED_EARN">Locked APR</option>
            </select>
          </label>
          {pocketType === 'FLEXIBLE' ? (
            <label>Target<input value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder="500.00" /></label>
          ) : (
            <>
              <label>Stake amount<input value={lockAmount} onChange={(event) => setLockAmount(event.target.value)} placeholder="100.00" /></label>
              <label>
                Duration
                <select value={lockDays} onChange={(event) => setLockDays(Number(event.target.value) as 7 | 30 | 90)}>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </label>
              <label>APR bps<input value={apyBps} onChange={(event) => setApyBps(Number(event.target.value))} /></label>
            </>
          )}
          <div className="stake-form-actions">
            {pocketType === 'LOCKED_EARN' ? <button type="button" onClick={updatePreview}>Preview APR</button> : null}
            <button type="button" onClick={addPocket}>Create stake</button>
          </div>
        </form>
      </section>

      {pocketType === 'LOCKED_EARN' && preview ? (
        <>
          <div className="overview-live-grid earning-preview-panel stake-preview-panel">
            <section>
              <span>Estimated APR yield</span>
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
              I understand this is a Stellar testnet APR demo estimate.
            </label>
          </div>

          <section className="apr-forecast-panel" aria-label="APR forecast earnings">
            <div className="stake-form-heading">
              <span>ƒ</span>
              <div>
                <strong>Forecast earnings</strong>
                <small>Estimated APR return by day, week, month, and year.</small>
              </div>
            </div>
            <div className="apr-forecast-grid">
              {aprForecast.map((item) => (
                <article key={item.label} className="apr-forecast-card">
                  <span>{item.label}</span>
                  <strong>{minorToDecimal(item.estimatedInterestMinor)} {assetCode}</strong>
                  <small>{item.caption} · PHP {(minorToNumber(item.estimatedInterestMinor) * PHP_RATES[assetCode]).toLocaleString(undefined, { maximumFractionDigits: 2 })} est.</small>
                </article>
              ))}
            </div>
            <p>Forecasts use simple APR math on the current stake amount. Actual yield is not guaranteed.</p>
          </section>
        </>
      ) : null}

      <section className="stake-form-section" aria-label="Update stake position balance">
        <div className="stake-form-heading">
          <span>2</span>
          <div>
            <strong>Update position balance</strong>
            <small>Add testnet funds or record a planned withdrawal.</small>
          </div>
        </div>

        <form className="manager-form compact-manager-form stake-balance-form">
          <label>
            Position
            <select value={selectedPocketId} onChange={(event) => setSelectedPocketId(event.target.value)}>
              <option value="">Choose position</option>
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
      </section>

      <div className="stake-form-heading">
        <span>3</span>
        <div>
          <strong>Saved stake positions</strong>
          <small>Review status, maturity, estimated value, and recent ledger events.</small>
        </div>
      </div>

      <div className="manager-table stake-position-list" aria-label="Saved stake positions">
        {pockets.map((pocket) => (
          <div className="stake-position-row" key={pocket.id}>
            <div>
              <span>{pocket.label}</span>
              <small>{pocket.status} · {pocket.pocketType === 'LOCKED_EARN' ? 'Locked APR' : 'Flexible'}</small>
            </div>
            <strong>{minorToDecimal(pocket.balanceMinor)} {pocket.assetCode}</strong>
            <small className="stake-position-meta">
              PHP {(minorToNumber(pocket.balanceMinor) * PHP_RATES[pocket.assetCode]).toLocaleString(undefined, { maximumFractionDigits: 2 })} est.
            </small>
            {pocket.pocketType === 'LOCKED_EARN' && pocket.estimatedInterestMinor ? (
              <small className="stake-position-meta">APR yield {minorToDecimal(pocket.estimatedInterestMinor)} {pocket.assetCode}</small>
            ) : null}
            {pocket.maturesAt ? <small className="stake-position-meta">Matures {new Date(pocket.maturesAt).toLocaleDateString()}</small> : null}
            {pocket.pocketType === 'LOCKED_EARN' ? (
              <div className="manager-row-actions">
                <button type="button" onClick={() => markMatured(pocket.id)}>Check maturity</button>
                <button type="button" onClick={() => withdrawPocket(pocket.id)} disabled={pocket.status !== 'matured'}>Withdraw matured</button>
              </div>
            ) : null}
            <small className="stake-position-events">{pocket.events.slice(0, 3).map((event) => event.type).join(' · ') || 'No ledger events yet'}</small>
          </div>
        ))}
      </div>
    </article>
  );
}

function calculateAprForecast(principalMinor: string, apyBps: number) {
  let principal = BigInt(0);

  try {
    principal = BigInt(principalMinor);
  } catch {
    principal = BigInt(0);
  }

  const safeApyBps = Number.isFinite(apyBps) && apyBps > 0 ? Math.floor(apyBps) : 0;

  return APR_FORECAST_PERIODS.map((period) => {
    const estimatedInterestMinor =
      (principal * BigInt(safeApyBps) * BigInt(period.days)) / (BigInt(10000) * BigInt(365));

    return {
      ...period,
      estimatedInterestMinor: estimatedInterestMinor.toString()
    };
  });
}
