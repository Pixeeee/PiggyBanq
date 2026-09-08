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
  createLocalDemoSession,
  createWalletChallenge,
  getWalletStatus
} from '../lib/wallet-auth-api';

type SocialIdentityProvider = {
  id: 'privy' | 'web3auth';
  label: string;
  methods: SocialIdentityMethod[];
};

type SocialIdentityMethod = 'Google' | 'X' | 'Email' | 'Phone';

const SOCIAL_IDENTITY_PROVIDERS: SocialIdentityProvider[] = [
  { id: 'privy', label: 'Privy identity login', methods: ['Google', 'X', 'Email', 'Phone'] },
  { id: 'web3auth', label: 'Web3Auth identity login', methods: ['Google', 'X', 'Email', 'Phone'] }
];
const DEMO_ACCOUNT = {
  username: 'demo_saver',
  displayName: 'Demo Saver',
  password: 'DemoPiggyBanq!2026',
  recoveryPhrase: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
};

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
  const [isNavigating, setNavigating] = useState(false);
  const [activeProvider, setActiveProvider] = useState<SocialIdentityProvider | null>(null);
  const [providerModalStatus, setProviderModalStatus] = useState('');
  const passwordCheck = useMemo(() => validatePasswordStrength(password), [password]);
  const passwordReady = passwordCheck.ok && password === confirmPassword && acceptedPasswordLoss && username.trim().length >= 3;
  const recoveryReady = phraseRevealed && savedPhrase && normalizePhrase(confirmPhrase) === normalizePhrase(recoveryPhrase);
  const isWorking = isBusy || isNavigating;
  const screenMeta = {
    choice: { step: '01', label: 'Choose access', title: 'Start securely' },
    'create-password': { step: '02', label: 'Local encryption', title: 'Protect your wallet' },
    recovery: { step: '03', label: 'Recovery phrase', title: 'Secure your backup' },
    login: { step: '01', label: 'Welcome back', title: 'Unlock your wallet' }
  } satisfies Record<AuthScreen, { step: string; label: string; title: string }>;
  const activeScreenMeta = screenMeta[screen];

  useEffect(() => {
    setScreen('choice');
    setRecoveryPhrase(generateRecoveryPhrase());
    setActiveProvider(null);
    setProviderModalStatus('');
  }, [mode]);

  useEffect(() => {
    router.prefetch('/dashboard');
  }, [router]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  function chooseSocialIdentity(provider: SocialIdentityProvider) {
    setError('');
    setStatus('');
    setProviderModalStatus('');
    setActiveProvider(provider);
  }

  function chooseSocialIdentityMethod(method: SocialIdentityMethod) {
    if (!activeProvider) return;
    setProviderModalStatus(`${activeProvider.label} ${method} sign-in is ready for SDK wiring. This demo keeps wallet access local.`);
  }

  function closeSocialIdentityModal() {
    setActiveProvider(null);
    setProviderModalStatus('');
  }

  async function openDemoAccount() {
    setBusy(true);
    setNavigating(false);
    setError('');

    try {
      setStatus('Preparing demo wallet on this device...');
      let account;
      let vault;
      let shouldPersist = false;

      try {
        const unlocked = await unlockWalletAccount(DEMO_ACCOUNT.username, DEMO_ACCOUNT.password);
        account = unlocked.account;
        vault = unlocked.vault;
      } catch {
        account = await prepareSecureWalletAccount({
          username: DEMO_ACCOUNT.username,
          password: DEMO_ACCOUNT.password,
          recoveryPhrase: DEMO_ACCOUNT.recoveryPhrase
        });
        vault = account.vault;
        shouldPersist = true;
      }

      const walletStatus = await getWalletStatus({ publicKey: account.publicKey, username: DEMO_ACCOUNT.username });
      const purpose = walletStatus.registered ? 'LOGIN' : 'SIGN_UP';
      const challenge = await createWalletChallenge(account.publicKey, purpose);
      const signature = signWalletAuthMessage(vault.secretKey, challenge.message);

      if (walletStatus.registered) {
        await completeWalletLogin({
          challengeId: challenge.challengeId,
          publicKey: account.publicKey,
          signature
        });
      } else {
        await completeWalletSignup({
          challengeId: challenge.challengeId,
          publicKey: account.publicKey,
          signature,
          username: DEMO_ACCOUNT.username,
          displayName: DEMO_ACCOUNT.displayName
        });
      }

      if (shouldPersist) {
        persistSecureWalletAccount(account);
      }

      openDashboard('Demo account ready. Opening your savings dashboard...');
    } catch (caught) {
      if (isDemoBackendUnavailable(caught)) {
        try {
          setStatus('Opening local demo workspace...');
          await createLocalDemoSession();
          openDashboard('Local demo ready. Opening your savings dashboard...');
        } catch (fallbackError) {
          setNavigating(false);
          setError(fallbackError instanceof Error ? fallbackError.message : 'Demo account setup failed.');
        }
      } else {
        setNavigating(false);
        setError(caught instanceof Error ? caught.message : 'Demo account setup failed.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function signUp(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setBusy(true);
    setNavigating(false);
    setError('');

    try {
      if (!recoveryPhrase) throw new Error('Recovery phrase is still generating.');
      if (!passwordReady) throw new Error('Complete the password requirements first.');
      if (!recoveryReady) throw new Error('Reveal, save, and confirm the recovery phrase before continuing.');

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
      openDashboard();
    } catch (caught) {
      setNavigating(false);
      setError(caught instanceof Error ? caught.message : 'Wallet authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNavigating(false);
    setError('');

    try {
      if (!username.trim()) throw new Error('Enter your username.');
      if (!password) throw new Error('Enter your password.');

      setStatus('Unlocking encrypted Stellar wallet...');
      const { account, vault } = await unlockWalletAccount(username, password);

      setStatus('Signing one-time Stellar login challenge...');
      const challenge = await createWalletChallenge(account.publicKey, 'LOGIN');
      const signature = signWalletAuthMessage(vault.secretKey, challenge.message);

      await completeWalletLogin({
        challengeId: challenge.challengeId,
        publicKey: account.publicKey,
        signature
      });

      openDashboard();
    } catch (caught) {
      setNavigating(false);
      setError(caught instanceof Error ? caught.message : 'Wallet authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  function openDashboard(message = 'Authenticated. Verifying secure session...') {
    setNavigating(true);
    setStatus(message);
    router.replace('/dashboard');
    router.refresh();
  }

  function startCreateWallet() {
    setError('');
    setStatus('');
    closeSocialIdentityModal();
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
    closeSocialIdentityModal();
    setPassword('');
    setConfirmPassword('');
    setScreen('login');
  }

  function backToChoice() {
    setError('');
    setStatus('');
    closeSocialIdentityModal();
    setScreen('choice');
  }

  return (
    <main className="stellar-auth-page">
      <aside className="stellar-auth-brand-panel" aria-label="PiggyBanq wallet introduction">
        <video className="stellar-auth-brand-video" aria-hidden="true" autoPlay loop muted playsInline poster="/piggy.png">
          <source src="/piggy_bg.mp4" type="video/mp4" />
        </video>
        <div className="stellar-auth-brand-shade" aria-hidden="true" />
        <a className="stellar-auth-brand" href="/" aria-label="PiggyBanq home">
          <img src="/piggy_icon.png" alt="" aria-hidden="true" />
          <span>PiggyBanq</span>
        </a>
        <div className="stellar-auth-brand-copy">
          <p className="stellar-auth-kicker">Self-custodial savings · Stellar testnet</p>
          <h1>Build your savings.<br /><em className="stellar-auth-display">Keep the keys.</em></h1>
          <p>Create focused savings pockets while your wallet stays encrypted on the device in your hands.</p>
        </div>
        <ul className="stellar-auth-trust-list" aria-label="Wallet security principles">
          <li><span>01</span> Private keys stay encrypted on this device</li>
          <li><span>02</span> Only you hold the recovery phrase</li>
          <li><span>03</span> Built for Stellar testnet</li>
        </ul>
      </aside>

      <section className="stellar-auth-workspace" aria-label="Wallet access">
        <header className="stellar-auth-progress">
          <div>
            <span>{activeScreenMeta.step}</span>
            <p>{activeScreenMeta.label}</p>
          </div>
          <strong>{activeScreenMeta.title}</strong>
        </header>

        <div className="stellar-auth-stage" key={screen}>
          {screen === 'choice' ? (
            <section className="stellar-auth-choice" aria-labelledby="stellar-auth-choice-title">
              <PigRail />
              <div className="stellar-auth-choice-heading">
                <p className="stellar-auth-card-eyebrow">Wallet access</p>
                <h2 className="stellar-auth-wordmark" id="stellar-auth-choice-title">How would you like to continue?</h2>
                <p className="stellar-auth-choice-intro">Create an encrypted wallet on this device or unlock one you already use.</p>
              </div>
              <div className="stellar-auth-choice-actions">
                <button className={mode === 'login' ? 'stellar-auth-primary' : 'stellar-auth-secondary'} type="button" onClick={startLogin}>
                  I have an existing wallet
                </button>
                <button className={mode === 'signup' ? 'stellar-auth-primary' : 'stellar-auth-secondary'} type="button" onClick={startCreateWallet}>
                  Create a local wallet
                </button>
                {process.env.NODE_ENV !== 'production' ? (
                  <button className="stellar-auth-demo-button" disabled={isWorking} type="button" onClick={openDemoAccount}>
                    {isWorking ? 'Opening demo...' : 'Open demo account'}
                  </button>
                ) : null}
                <div className="stellar-auth-social-options" aria-label="Social identity login options">
                  <p>Optional identity login</p>
                  <div className="stellar-auth-social-row">
                    {SOCIAL_IDENTITY_PROVIDERS.map((provider) => (
                      <button
                        aria-label={`${provider.label}: choose Google, X, Email, or Phone`}
                        className="stellar-auth-social-button"
                        key={provider.id}
                        type="button"
                        onClick={() => chooseSocialIdentity(provider)}
                      >
                        <ProviderIcon provider={provider.id} />
                        <span>{provider.label}</span>
                        <em>Choose sign-in method</em>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {screen === 'create-password' ? (
            <section className="stellar-auth-card" aria-labelledby="stellar-password-title">
              <button className="stellar-auth-back" type="button" aria-label="Back" onClick={backToChoice}>
                <ChevronLeftIcon />
              </button>
          <h2 id="stellar-password-title">PiggyBanq password</h2>
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
          <h2 id="stellar-recovery-title">Save your Secret Recovery Phrase</h2>
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

          <button className="stellar-auth-card-button" disabled={!recoveryReady || isWorking} type="submit">
            {isWorking ? 'Securing...' : 'Continue'}
          </button>
          <button className="stellar-auth-link-button" type="button" onClick={backToChoice}>
            Remind me later
          </button>
            </form>
          ) : null}

          {screen === 'login' ? (
            <form className="stellar-auth-card stellar-auth-login-card" aria-labelledby="stellar-login-title" onSubmit={login}>
          <PigRail />
          <button className="stellar-auth-back" type="button" aria-label="Back" onClick={backToChoice}>
            <ChevronLeftIcon />
          </button>
          <h2 id="stellar-login-title">Unlock PiggyBanq</h2>
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
          <button className="stellar-auth-card-button" disabled={isWorking || !username || !password} type="submit">
            {isWorking ? 'Securing...' : 'Unlock and log in'}
          </button>
          <button className="stellar-auth-link-button" type="button" onClick={startCreateWallet}>
            Create a local wallet
          </button>
            </form>
          ) : null}
        </div>

        {status || error ? (
          <p className={error ? 'stellar-auth-toast is-error' : 'stellar-auth-toast'} role={error ? 'alert' : 'status'}>
            {error || status}
          </p>
        ) : <div className="stellar-auth-toast-space" aria-hidden="true" />}
        <p className="stellar-auth-legal">PiggyBanq is testnet-only and is not a bank. Never share your recovery phrase.</p>
      </section>

      {activeProvider ? (
        <div className="stellar-auth-provider-modal-backdrop" onClick={(event) => {
          if (event.target === event.currentTarget) closeSocialIdentityModal();
        }}>
          <section
            aria-labelledby="stellar-auth-provider-modal-title"
            aria-modal="true"
            className="stellar-auth-provider-modal"
            role="dialog"
          >
            <button className="stellar-auth-provider-modal-close" type="button" aria-label="Close identity login" onClick={closeSocialIdentityModal}>
              <CloseIcon />
            </button>
            <span className="stellar-auth-provider-modal-icon">
              <ProviderIcon provider={activeProvider.id} />
            </span>
            <h2 id="stellar-auth-provider-modal-title">{activeProvider.label}</h2>
            <p>Choose how you want to continue.</p>
            <div className="stellar-auth-provider-methods">
              {activeProvider.methods.map((method) => (
                <button className="stellar-auth-provider-method-button" key={method} type="button" onClick={() => chooseSocialIdentityMethod(method)}>
                  {method}
                </button>
              ))}
            </div>
            <small>Provider SDK connections are placeholders for this demo.</small>
            {providerModalStatus ? (
              <p className="stellar-auth-provider-modal-status" role="status">
                {providerModalStatus}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}

      {isNavigating ? (
        <div className="stellar-auth-transition" role="status" aria-live="polite" aria-label="Opening dashboard">
          <div className="stellar-auth-transition-card">
            <img src="/piggy_icon.png" alt="" aria-hidden="true" />
            <span>Secure session verified</span>
            <strong>Opening your savings dashboard</strong>
            <div className="route-loading-bar" aria-hidden="true"><span /></div>
            <small>Private keys stay encrypted on this device.</small>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function normalizePhrase(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isDemoBackendUnavailable(error: unknown) {
  if (process.env.NODE_ENV === 'production') return false;
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;

  return ['Failed to fetch', 'Request failed.', 'Authentication service failed.'].some((message) => error.message.includes(message));
}

function PigRail() {
  return (
    <span className="stellar-auth-pig-rail" aria-hidden="true">
      <img className="stellar-auth-pig" src="/piggy.gif" alt="" />
    </span>
  );
}

function ProviderIcon({ provider }: { provider: SocialIdentityProvider['id'] }) {
  if (provider === 'privy') {
    return (
      <span className="provider-icon provider-icon-privy" aria-hidden="true">
        <span />
        <i />
      </span>
    );
  }

  return (
    <span className="provider-icon provider-icon-web3auth" aria-hidden="true">
      W
    </span>
  );
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

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
