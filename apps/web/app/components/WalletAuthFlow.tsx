'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  generateRecoveryPhrase,
  persistSecureWalletAccount,
  prepareSecureWalletAccount,
  signWalletAuthMessage,
  unlockWalletAccount,
  validatePasswordStrength
} from '../(app)/dashboard/secure-wallet';
import {
  completeWalletLogin,
  completeWalletSignup,
  createWalletChallenge,
  getWalletStatus
} from '../lib/wallet-auth-api';

type AuthScreen = 'choice' | 'create-password' | 'recovery' | 'login';

export function WalletAuthFlow({ mode }: { mode: 'signup' | 'login' }) {
  const router = useRouter();
  const [screen, setScreen] = useState<AuthScreen>('choice');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [phraseRevealed, setPhraseRevealed] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedPasswordLoss, setAcceptedPasswordLoss] = useState(false);
  const [savedPhrase, setSavedPhrase] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setBusy] = useState(false);
  const passwordCheck = useMemo(() => validatePasswordStrength(password), [password]);
  const passwordReady = passwordCheck.ok && password === confirmPassword && acceptedPasswordLoss && username.trim().length >= 3;
  const recoveryReady = phraseRevealed && savedPhrase && normalizePhrase(confirmPhrase) === normalizePhrase(recoveryPhrase);

  useEffect(() => {
    setScreen('choice');
    setRecoveryPhrase(generateRecoveryPhrase());
  }, [mode]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  async function signUp(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setBusy(true);
    setError('');

    try {
      if (!recoveryPhrase) throw new Error('Recovery phrase is still generating.');
      if (!passwordReady) throw new Error('Complete the password requirements first.');
      if (!recoveryReady) throw new Error('Reveal, save, and confirm the recovery phrase before continuing.');

      const usernameStatus = await getWalletStatus({ username });
      if (usernameStatus.usernameAvailable === false) throw new Error('Username is already taken.');

      setStatus('Preparing encrypted Stellar wallet on this device...');
      const account = await prepareSecureWalletAccount({ username, password, recoveryPhrase });

      setStatus('Signing one-time Stellar account challenge...');
      const challenge = await createWalletChallenge(account.publicKey, 'SIGN_UP');
      const signature = signWalletAuthMessage(account.vault.secretKey, challenge.message);

      await completeWalletSignup({
        challengeId: challenge.challengeId,
        publicKey: account.publicKey,
        signature,
        username: account.username,
        displayName: account.username
      });

      persistSecureWalletAccount(account);
      setStatus('Authenticated. Opening dashboard...');
      router.push('/dashboard');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Wallet authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      if (!username.trim()) throw new Error('Enter your username.');
      if (!password) throw new Error('Enter your password.');

      setStatus('Unlocking encrypted Stellar wallet...');
      const { account, vault } = await unlockWalletAccount(username, password);

      setStatus('Signing one-time Stellar login challenge...');
      const statusResult = await getWalletStatus({ publicKey: account.publicKey });
      if (!statusResult.registered) throw new Error('This Stellar wallet is not registered yet. Create an account first.');

      const challenge = await createWalletChallenge(account.publicKey, 'LOGIN');
      const signature = signWalletAuthMessage(vault.secretKey, challenge.message);

      await completeWalletLogin({
        challengeId: challenge.challengeId,
        publicKey: account.publicKey,
        signature
      });

      setStatus('Authenticated. Opening dashboard...');
      router.push('/dashboard');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Wallet authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  function startCreateWallet() {
    setError('');
    setStatus('');
    setPassword('');
    setConfirmPassword('');
    setConfirmPhrase('');
    setPhraseRevealed(false);
    setSavedPhrase(false);
    setRecoveryPhrase(generateRecoveryPhrase());
    setScreen('create-password');
  }

  function startLogin() {
    setError('');
    setStatus('');
    setPassword('');
    setConfirmPassword('');
    setScreen('login');
  }

  function backToChoice() {
    setError('');
    setStatus('');
    setScreen('choice');
  }

  return (
    <main className="stellar-auth-page">
      {screen === 'choice' ? (
        <section className="stellar-auth-choice" aria-labelledby="stellar-auth-choice-title">
          <div>
            <h1 className="stellar-auth-wordmark" id="stellar-auth-choice-title">PiggyBanq</h1>
            <p className="stellar-auth-subtitle">Stellar self-custodial wallet</p>
          </div>
          <div className="stellar-auth-choice-actions">
            <button className="stellar-auth-primary" type="button" onClick={startCreateWallet}>
              Create a new wallet
            </button>
            <button className="stellar-auth-secondary" type="button" onClick={startLogin}>
              I have an existing wallet
            </button>
          </div>
        </section>
      ) : null}

      {screen === 'create-password' ? (
        <section className="stellar-auth-card" aria-labelledby="stellar-password-title">
          <button className="stellar-auth-back" type="button" aria-label="Back" onClick={backToChoice}>
            <ChevronLeftIcon />
          </button>
          <h1 id="stellar-password-title">PiggyBanq password</h1>
          <p>Unlocks PiggyBanq on this device only.</p>

          <label>
            Username
            <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ana_santos" />
          </label>
          <label>
            Create new password
            <span className="stellar-auth-input-wrap">
              <input
                autoComplete="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                <EyeIcon />
              </button>
            </span>
          </label>
          <small>Must be at least 12 characters with uppercase, lowercase, number, and special character.</small>
          <label>
            Confirm password
            <span className="stellar-auth-input-wrap">
              <input
                autoComplete="new-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                <EyeIcon />
              </button>
            </span>
          </label>
          <label className="stellar-auth-checkbox">
            <input type="checkbox" checked={acceptedPasswordLoss} onChange={(event) => setAcceptedPasswordLoss(event.target.checked)} />
            <span>If I lose this password, PiggyBanq cannot reset it.</span>
          </label>

          <button className="stellar-auth-card-button" disabled={!passwordReady} type="button" onClick={() => setScreen('recovery')}>
            Create password
          </button>
        </section>
      ) : null}

      {screen === 'recovery' ? (
        <form className="stellar-auth-card stellar-auth-recovery-card" aria-labelledby="stellar-recovery-title" onSubmit={signUp}>
          <button className="stellar-auth-back" type="button" aria-label="Back" onClick={() => setScreen('create-password')}>
            <ChevronLeftIcon />
          </button>
          <h1 id="stellar-recovery-title">Save your Secret Recovery Phrase</h1>
          <p>
            This is your <a>Secret Recovery Phrase</a>. Write it down in the correct order and keep it safe. If someone has your Secret Recovery Phrase, they can access your wallet. Do not share it with anyone.
          </p>

          <button className={phraseRevealed ? 'stellar-phrase is-revealed' : 'stellar-phrase'} type="button" onClick={() => setPhraseRevealed(true)}>
            <ol>
              {recoveryPhrase.split(' ').map((word, index) => <li key={`${word}-${index}`}>{word}</li>)}
            </ol>
            {!phraseRevealed ? (
              <span className="stellar-phrase-overlay">
                <EyeOffIcon />
                <strong>Tap to reveal</strong>
                <small>Make sure no one is watching your screen.</small>
              </span>
            ) : null}
          </button>

          <label className="stellar-auth-checkbox">
            <input type="checkbox" checked={savedPhrase} onChange={(event) => setSavedPhrase(event.target.checked)} />
            <span>I saved my recovery phrase in the correct order.</span>
          </label>
          <label>
            Confirm recovery phrase
            <textarea
              value={confirmPhrase}
              onChange={(event) => setConfirmPhrase(event.target.value)}
              placeholder="Paste the 12 words here after saving them"
            />
          </label>

          <button className="stellar-auth-card-button" disabled={!recoveryReady || isBusy} type="submit">
            {isBusy ? 'Signing...' : 'Continue'}
          </button>
          <button className="stellar-auth-link-button" type="button" onClick={backToChoice}>
            Remind me later
          </button>
        </form>
      ) : null}

      {screen === 'login' ? (
        <form className="stellar-auth-card" aria-labelledby="stellar-login-title" onSubmit={login}>
          <button className="stellar-auth-back" type="button" aria-label="Back" onClick={backToChoice}>
            <ChevronLeftIcon />
          </button>
          <h1 id="stellar-login-title">Unlock PiggyBanq</h1>
          <p>Use your Stellar wallet username and password on this device.</p>
          <label>
            Username
            <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ana_santos" />
          </label>
          <label>
            Password
            <span className="stellar-auth-input-wrap">
              <input
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                <EyeIcon />
              </button>
            </span>
          </label>
          <button className="stellar-auth-card-button" disabled={isBusy || !username || !password} type="submit">
            {isBusy ? 'Signing...' : 'Unlock and log in'}
          </button>
          <button className="stellar-auth-link-button" type="button" onClick={startCreateWallet}>
            Create a new Stellar wallet
          </button>
        </form>
      ) : null}

      {(status || error) && screen !== 'choice' ? (
        <p className={error ? 'stellar-auth-toast is-error' : 'stellar-auth-toast'} role={error ? 'alert' : 'status'}>
          {error || status}
        </p>
      ) : null}

      {screen !== 'recovery' ? <img className="stellar-auth-pig" src="/piggy.gif" alt="" aria-hidden="true" /> : null}
    </main>
  );
}

function normalizePhrase(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function ChevronLeftIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m3 3 18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8M7.5 7.8C4.4 9.4 2.5 12 2.5 12s3.5 6 9.5 6c1.5 0 2.8-.35 4-.9M12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.1 2.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
