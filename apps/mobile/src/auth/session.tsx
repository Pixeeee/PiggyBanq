import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { createAndStoreLocalWallet, importAndStoreLocalWallet, loadStoredLocalWallet, type MobileStoredWallet } from '../wallet/create-local-wallet';
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
  confirmBackup: () => boolean;
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

export function validateMobilePassword(password: string): PasswordCheck {
  const errors = [
    password.length >= 12 ? '' : 'Use at least 12 characters.',
    /[A-Z]/.test(password) ? '' : 'Add an uppercase letter.',
    /[a-z]/.test(password) ? '' : 'Add a lowercase letter.',
    /\d/.test(password) ? '' : 'Add a number.',
    /[^A-Za-z0-9]/.test(password) ? '' : 'Add a special character.'
  ].filter(Boolean);

  return { errors, ok: errors.length === 0 };
}

export function MobileSessionProvider({ children }: { children: ReactNode }) {
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
  const passwordReady = passwordCheck.ok && password === confirmPassword && acceptedPasswordLoss && username.trim().length >= 3;

  const activationState = {
    publicKey: wallet?.publicKey ?? '',
    mnemonicBackedUp: backupConfirmed,
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

    loadStoredLocalWallet()
      .then((storedWallet) => {
        if (!mounted) {
          return;
        }

        if (storedWallet) {
          setWallet(storedWallet);
          setStatus('Wallet loaded from SecureStore. Confirm backup before activating transfers.');
        }
      })
      .catch(() => {
        if (mounted) {
          setStatus('SecureStore wallet check failed. Try creating a fresh testnet wallet.');
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingWallet(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

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
      const nextWallet = await createAndStoreLocalWallet();
      setWallet(nextWallet);
      setStatus('Wallet created. Back up secret key before activating transfers.');
      setAuthStatus('Wallet created. Save the Stellar secret key before opening the workspace.');
      return nextWallet;
    } catch {
      setAuthError('Wallet creation failed on this device.');
      return null;
    } finally {
      setIsCreating(false);
    }
  }

  async function importWallet() {
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
      const nextWallet = await importAndStoreLocalWallet(importSecretKey);
      setWallet(nextWallet);
      setImportSecretKey('');
      setBackupConfirmed(true);
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
    if (!wallet) {
      setStatus('Create a testnet wallet before backup.');
      return false;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Back up PiggyBanq wallet',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false
      });

      if (!result.success) {
        setStatus('Device authentication cancelled. Secret key remains hidden.');
        return false;
      }
    }

    setSecretVisible(true);
    setStatus('Secret key revealed locally. PiggyBanq cannot recover it for you.');
    return true;
  }

  function confirmBackup() {
    if (!secretVisible) {
      setStatus('Reveal and save the secret key before confirming backup.');
      return false;
    }

    setBackupConfirmed(true);
    setAuthStatus('Secure session verified. Opening your savings dashboard...');
    setStatus('Backup confirmed. Wallet is active for testnet review flows.');
    return true;
  }

  const value = {
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
