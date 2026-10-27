import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { shouldLockWalletForAppState, validateMobilePassword } from '../wallet/wallet-vault';
export { validateMobilePassword } from '../wallet/wallet-vault';
import * as LocalAuthentication from 'expo-local-authentication';
import { createAndStoreLocalWallet, importAndStoreLocalWallet, inspectStoredLocalWallet, unlockStoredLocalWallet, protectLegacyLocalWallet, confirmStoredWalletBackup, type MobileStoredWallet } from '../wallet/create-local-wallet';
import { canActivateWallet, createMobilePaymentReview, getWalletActivationStatus, type WalletActivationStatus } from '../wallet/local-wallet';
import type { WalletSetupMode } from './types';

const sampleDestination = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

type PasswordCheck = {
  errors: string[];
  ok: boolean;
};

type MobileSessionContextValue = {
  acceptedPasswordLoss: boolean;
  activationStatus: WalletActivationStatus;
  authError: string;
  authStatus: string;
  backupConfirmed: boolean;
  confirmBackup: () => Promise<boolean>;
  hasStoredWallet: boolean;
  legacyWalletNeedsPassword: boolean;
  unlockWallet: (password: string) => Promise<boolean>;
  lockWallet: () => void;
  confirmPassword: string;
  createLocalWallet: () => Promise<MobileStoredWallet | null>;
  importSecretKey: string;
  importWallet: () => Promise<MobileStoredWallet | null>;
  isCreating: boolean;
  isLoadingWallet: boolean;
  password: string;
  passwordCheck: PasswordCheck;
  passwordReady: boolean;
  paymentReview: ReturnType<typeof createMobilePaymentReview>;
  revealSecretForBackup: () => Promise<boolean>;
  secretVisible: boolean;
  setAcceptedPasswordLoss: (value: boolean) => void;
  setAuthError: (value: string) => void;
  setAuthStatus: (value: string) => void;
  setBackupConfirmed: (value: boolean) => void;
  setConfirmPassword: (value: string) => void;
  setImportSecretKey: (value: string) => void;
  setPassword: (value: string) => void;
  setSecretVisible: (value: boolean) => void;
  setShowPassword: (value: boolean) => void;
  setStatus: (value: string) => void;
  setUsername: (value: string) => void;
  setWalletSetupMode: (value: WalletSetupMode) => void;
  showPassword: boolean;
  status: string;
  username: string;
  wallet: MobileStoredWallet | null;
  walletReady: boolean;
  walletSetupMode: WalletSetupMode;
};

const MobileSessionContext = createContext<MobileSessionContextValue | null>(null);

export function MobileSessionProvider({ children }: { children: ReactNode }) {
  const generation = useRef(0);
  const deviceAuthenticationInProgress = useRef(false);
  const walletRef = useRef<MobileStoredWallet | null>(null);
  const [hasStoredWallet, setHasStoredWallet] = useState(false);
  const [legacyWalletNeedsPassword, setLegacyWalletNeedsPassword] = useState(false);
  const [wallet, setWallet] = useState<MobileStoredWallet | null>(null);
  const [status, setStatus] = useState('Wallet keys are generated on-device and stored in SecureStore.');
  const [authStatus, setAuthStatus] = useState('');
  const [authError, setAuthError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);
  const [walletSetupMode, setWalletSetupMode] = useState<WalletSetupMode>('create');
  const [importSecretKey, setImportSecretKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedPasswordLoss, setAcceptedPasswordLoss] = useState(false);
  const passwordCheck = useMemo(() => validateMobilePassword(password), [password]);
  const passwordReady = passwordCheck.ok && password === confirmPassword && acceptedPasswordLoss && /^[a-z0-9_]{3,24}$/i.test(username.trim());

  const activationState = {
    publicKey: wallet?.publicKey ?? '',
    mnemonicBackedUp: backupConfirmed && wallet?.backupConfirmed === true,
    storedInSecureStore: wallet?.storageKind !== 'web-preview-fallback' && Boolean(wallet)
  };
  const activationStatus = getWalletActivationStatus(activationState);
  const walletReady = canActivateWallet(activationState);
  const paymentReview = useMemo(() => createMobilePaymentReview({
    amount: '25.00',
    assetCode: 'USDC',
    destination: sampleDestination,
    estimatedFeeStroops: '100'
  }), []);

  useEffect(() => {
    let mounted = true;
    inspectStoredLocalWallet().then((stored) => {
      if (!mounted) return;
      setHasStoredWallet(stored.hasStoredWallet);
      setLegacyWalletNeedsPassword(stored.legacyWalletNeedsPassword);
      if (stored.hasStoredWallet) setStatus('Unlock your stored wallet to continue.');
    }).catch((error) => {
      if (!mounted) return;
      setHasStoredWallet(true);
      setAuthError(error instanceof Error ? error.message : 'Wallet storage is unavailable. Your wallet record is preserved.');
    }).finally(() => { if (mounted) setIsLoadingWallet(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') setSecretVisible(false);
      if (shouldLockWalletForAppState(state, deviceAuthenticationInProgress.current)) lockWallet();
    });
    return () => subscription.remove();
  }, []);

  function clearSensitiveInputs() {
    setPassword(''); setConfirmPassword(''); setImportSecretKey('');
    setShowPassword(false); setSecretVisible(false);
  }
  async function authenticateDevice(promptMessage: string) {
    if (deviceAuthenticationInProgress.current) return false;
    deviceAuthenticationInProgress.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancel', disableDeviceFallback: false });
      return result.success;
    } finally {
      deviceAuthenticationInProgress.current = false;
    }
  }
  function lockWallet() {
    generation.current += 1;
    walletRef.current = null;
    setWallet(null); setBackupConfirmed(false); clearSensitiveInputs();
    setAuthStatus(''); setStatus('Wallet locked. Unlock with your password to continue.');
  }
  function acceptWallet(nextWallet: MobileStoredWallet, started: number) {
    setHasStoredWallet(true); setLegacyWalletNeedsPassword(false); clearSensitiveInputs();
    if (generation.current !== started || AppState.currentState === 'background' || AppState.currentState === 'inactive') return false;
    walletRef.current = nextWallet;
    setWallet(nextWallet); setBackupConfirmed(nextWallet.backupConfirmed === true);
    setUsername(nextWallet.username ?? 'local_saver');
    return true;
  }
  async function unlockWallet(candidatePassword: string) {
    const started = generation.current;
    setIsCreating(true); setAuthError(''); setAuthStatus('Unlocking wallet on this device...');
    try {
      let nextWallet;
      if (legacyWalletNeedsPassword) {
        if (!passwordReady) throw new Error('Choose and confirm a strong new password for your existing wallet.');
        if (await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync()) {
          if (!await authenticateDevice('Protect existing PiggyBanq wallet')) throw new Error('Device authentication cancelled. Existing wallet preserved.');
        }
        if (generation.current !== started) throw new Error('Wallet locked while authenticating. Try again.');
        nextWallet = await protectLegacyLocalWallet(candidatePassword, username);
      } else {
        nextWallet = await unlockStoredLocalWallet(candidatePassword);
      }
      if (!acceptWallet(nextWallet, started)) return false;
      setAuthStatus(''); setStatus('Wallet unlocked on this device.');
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Wallet unlock failed.');
      return false;
    } finally { setIsCreating(false); }
  }

  async function createLocalWallet() {
    if (!passwordReady) {
      setAuthError('Complete the password requirements first.');
      return null;
    }

    setIsCreating(true);
    setSecretVisible(false);
    setBackupConfirmed(false);
    setAuthError('');
    setAuthStatus('Preparing SecureStore Stellar wallet on this device...');

    try {
      const started = generation.current;
      const nextWallet = await createAndStoreLocalWallet(password, username);
      if (!acceptWallet(nextWallet, started)) return null;
      setStatus('Wallet created. Save your wallet backup before activating transfers.');
      setAuthStatus('Wallet created. Save the recovery phrase before opening the workspace.');
      return nextWallet;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Wallet creation failed on this device.');
      return null;
    } finally {
      setIsCreating(false);
    }
  }

  async function importWallet() {
    if (!passwordReady) { setAuthError('Choose and confirm a strong password for the imported wallet.'); return null; }
    if (!importSecretKey.trim()) {
      setStatus('Paste a Stellar secret key before importing.');
      setAuthError('Paste a Stellar secret key before importing.');
      return null;
    }

    setIsCreating(true);
    setSecretVisible(false);
    setBackupConfirmed(false);
    setAuthError('');

    try {
      const started = generation.current;
      const nextWallet = await importAndStoreLocalWallet(importSecretKey, password, username);
      if (!acceptWallet(nextWallet, started)) return null;
      setImportSecretKey('');
      setBackupConfirmed(false);
      setAuthStatus('');
      setAuthError('');
      setStatus('Wallet imported. Back up secret key before activating transfers.');
      return nextWallet;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wallet import failed on this device.';
      setStatus(message);
      setAuthError(message);
      return null;
    } finally {
      setIsCreating(false);
    }
  }

  async function revealSecretForBackup() {
    const started = generation.current;
    if (!walletRef.current) {
      setStatus('Create a testnet wallet before backup.');
      return false;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        if (!await authenticateDevice('Back up PiggyBanq wallet')) {
          setStatus('Device authentication cancelled. Secret key remains hidden.');
          return false;
        }
      }
    } catch {
      setStatus('Device authentication is unavailable. Secret key remains hidden.');
      return false;
    }

    if (generation.current !== started || !walletRef.current) return false;
    setSecretVisible(true);
    setStatus('Wallet backup revealed locally. PiggyBanq cannot recover it for you.');
    return true;
  }

  async function confirmBackup() {
    const currentWallet = walletRef.current;
    if (!secretVisible || !currentWallet) {
      setStatus('Reveal and save the secret key before confirming backup.');
      return false;
    }
    const started = generation.current;
    setIsCreating(true);
    try {
      const confirmed = await confirmStoredWalletBackup(currentWallet.publicKey);
      if (!acceptWallet(confirmed, started)) return false;
      setAuthStatus('Backup saved. Opening your savings dashboard...');
      setStatus('Backup confirmed. Wallet is active for testnet transactions.');
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Backup confirmation could not be saved.');
      return false;
    } finally { setIsCreating(false); }
  }

  const value = {
    hasStoredWallet, legacyWalletNeedsPassword, unlockWallet, lockWallet,
    acceptedPasswordLoss,
    activationStatus,
    authError,
    authStatus,
    backupConfirmed,
    confirmBackup,
    confirmPassword,
    createLocalWallet,
    importSecretKey,
    importWallet,
    isCreating,
    isLoadingWallet,
    password,
    passwordCheck,
    passwordReady,
    paymentReview,
    revealSecretForBackup,
    secretVisible,
    setAcceptedPasswordLoss,
    setAuthError,
    setAuthStatus,
    setBackupConfirmed,
    setConfirmPassword,
    setImportSecretKey,
    setPassword,
    setSecretVisible,
    setShowPassword,
    setStatus,
    setUsername,
    setWalletSetupMode,
    showPassword,
    status,
    username,
    wallet,
    walletReady,
    walletSetupMode
  };

  return <MobileSessionContext.Provider value={value}>{children}</MobileSessionContext.Provider>;
}

export function useMobileSession() {
  const context = useContext(MobileSessionContext);
  if (!context) {
    throw new Error('useMobileSession must be used inside MobileSessionProvider');
  }

  return context;
}
