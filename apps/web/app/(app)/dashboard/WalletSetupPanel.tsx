'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { createSecureWalletAccount, generateRecoveryPhrase, validatePasswordStrength, type WalletAccountRecord } from './secure-wallet';

export function WalletSetupPanel({ onWalletReady }: { onWalletReady?: (account: WalletAccountRecord) => void }) {
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [status, setStatus] = useState('Generate and save your 12-word recovery phrase before creating the wallet.');
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

    if (confirmPhrase.trim().toLowerCase() !== recoveryPhrase.toLowerCase()) {
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
      setStatus('Wallet account created. Log in with your username and password to open the dashboard.');
      onWalletReady?.(account);
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
    setStatus('New 12-word recovery phrase generated. Save it before continuing.');
  }

  return (
    <section className="dashboard-card wallet-setup-panel" aria-labelledby="wallet-setup-title">
      <div className="dashboard-card-heading">
        <h2 id="wallet-setup-title">Create secure wallet</h2>
        <span className="wallet-state">ENCRYPTED</span>
      </div>

      <p>{status}</p>

      <div className="recovery-phrase-box" aria-label="12-word recovery phrase">
        <span>Recovery phrase</span>
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
          <input
            autoComplete="new-password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
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
