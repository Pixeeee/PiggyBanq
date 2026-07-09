'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  createSecureWalletAccount,
  generateRecoveryPhrase,
  getActiveWalletSession,
  validatePasswordStrength,
  type ActiveWalletSession,
  type WalletAccountRecord
} from './secure-wallet';

export function WalletSetupPanel({ onWalletReady }: { onWalletReady?: (account: WalletAccountRecord, session: ActiveWalletSession | null) => void }) {
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [status, setStatus] = useState('Generate and save your 12-word recovery phrase before creating the wallet.');
  const [copyStatus, setCopyStatus] = useState('Copy');
  const [isCreating, setIsCreating] = useState(false);
  const passwordCheck = useMemo(() => validatePasswordStrength(password), [password]);

  useEffect(() => {
    setRecoveryPhrase(generateRecoveryPhrase());
  }, []);

  async function createWalletAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get('username') ?? '');

    if (!recoveryPhrase) {
      setStatus('Recovery phrase is still generating. Try again in a moment.');
      return;
    }

    if (normalizePhrase(confirmPhrase) !== normalizePhrase(recoveryPhrase)) {
      setStatus('Confirm recovery phrase must exactly match the generated phrase.');
      return;
    }

    if (!passwordCheck.ok) {
      setStatus(passwordCheck.errors.join(' '));
      return;
    }

    setIsCreating(true);

    try {
      const account = await createSecureWalletAccount({ username, password, recoveryPhrase });
      const session = getActiveWalletSession();
      setStatus('Wallet account created. Opening your dashboard.');
      onWalletReady?.(account, session);
      setPassword('');
      setConfirmPhrase('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Wallet account creation failed.');
    } finally {
      setIsCreating(false);
    }
  }

  function regeneratePhrase() {
    setRecoveryPhrase(generateRecoveryPhrase());
    setConfirmPhrase('');
    setCopyStatus('Copy');
    setStatus('New 12-word recovery phrase generated. Save it before continuing.');
  }

  async function copyRecoveryPhrase() {
    if (!recoveryPhrase) {
      return;
    }

    try {
      await writeClipboard(recoveryPhrase);
      setCopyStatus('Copied');
      setStatus('Recovery phrase copied. Store it somewhere private before creating the wallet.');
      window.setTimeout(() => setCopyStatus('Copy'), 1800);
    } catch {
      setCopyStatus('Copy failed');
      setStatus('Copy failed. Select and copy the recovery phrase manually before continuing.');
    }
  }

  return (
    <section className="dashboard-card wallet-setup-panel" aria-labelledby="wallet-setup-title">
      <div className="dashboard-card-heading">
        <h2 id="wallet-setup-title">Create secure wallet</h2>
        <span className="wallet-state">ENCRYPTED</span>
      </div>

      <p>{status}</p>

      <div className="recovery-phrase-box" aria-label="12-word recovery phrase">
        <div className="recovery-phrase-header">
          <span>Recovery phrase</span>
          <button className="inline-tool-button" disabled={!recoveryPhrase} type="button" onClick={copyRecoveryPhrase}>
            {copyStatus}
          </button>
        </div>
        <ol>
          {recoveryPhrase ? recoveryPhrase.split(' ').map((word, index) => <li key={`${word}-${index}`}>{word}</li>) : <li>Generating phrase</li>}
        </ol>
      </div>

      <form className="feature-form" onSubmit={createWalletAccount}>
        <label>
          Username
          <input autoComplete="username" name="username" placeholder="ana_santos" />
        </label>
        <label>
          Password
          <span className="password-input-row">
            <input
              autoComplete="new-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              value={password}
            />
            <button className="inline-tool-button" type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </span>
        </label>
        <ul className="password-rules">
          <li data-valid={password.length >= 12}>12+ characters</li>
          <li data-valid={/[A-Z]/.test(password)}>uppercase</li>
          <li data-valid={/[a-z]/.test(password)}>lowercase</li>
          <li data-valid={/[0-9]/.test(password)}>number</li>
          <li data-valid={/[^A-Za-z0-9]/.test(password)}>special character</li>
        </ul>
        <label>
          Confirm recovery phrase
          <textarea
            onChange={(event) => setConfirmPhrase(event.target.value)}
            placeholder="Paste the 12 words here after saving them"
            value={confirmPhrase}
          />
        </label>
        <div className="wallet-action-row">
          <button disabled={isCreating || !recoveryPhrase} type="submit">
            {isCreating ? 'Creating...' : 'Create secure wallet'}
          </button>
          <button className="secondary-action" type="button" onClick={regeneratePhrase}>
            Generate new phrase
          </button>
        </div>
      </form>
    </section>
  );
}

function normalizePhrase(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand('copy')) {
      throw new Error('copy command failed');
    }
  } finally {
    document.body.removeChild(textarea);
  }
}
