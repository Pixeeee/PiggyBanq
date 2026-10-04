import { Redirect, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { AuthButton } from '../../src/auth/components/AuthButton';
import { AuthCard, AuthInput, CheckboxRow, PasswordInput, bodyStyle } from '../../src/auth/components/AuthCard';
import { AuthShell } from '../../src/auth/components/AuthShell';
import { useMobileSession } from '../../src/auth/session';

export default function UnlockWalletPage() {
  const router = useRouter();
  const { hasStoredWallet, wallet, backupConfirmed, legacyWalletNeedsPassword, authError, authStatus, isCreating, password, setPassword, showPassword, setShowPassword, unlockWallet, username, setUsername, confirmPassword, setConfirmPassword, passwordReady, acceptedPasswordLoss, setAcceptedPasswordLoss } = useMobileSession();
  async function handleUnlock() {
    if (await unlockWallet(password)) router.replace('/');
  }
  if (wallet) return <Redirect href={backupConfirmed ? '/(tabs)/dashboard' : '/(auth)/recovery'} />;
  if (!hasStoredWallet) return <Redirect href="/(auth)/home" />;
  return (
    <AuthShell authError={authError} authStatus={authStatus}>
      <AuthCard title={legacyWalletNeedsPassword ? 'Protect existing wallet' : 'Unlock PiggyBanq'} onBack={() => router.replace('/')}>
        <Text style={bodyStyle}>{legacyWalletNeedsPassword
          ? 'Your existing wallet has been preserved. Set a strong local password before continuing. This upgrades protection without changing your Stellar keys.'
          : 'Your wallet is locked. Enter the password you set on this device. Creating or importing a replacement cannot overwrite this wallet.'}</Text>
        {legacyWalletNeedsPassword ? <AuthInput autoCapitalize="none" label="Local username" onChangeText={setUsername} placeholder="ana_santos" value={username} /> : null}
        <PasswordInput label={legacyWalletNeedsPassword ? 'New password' : 'Password'} onChangeText={setPassword} onToggleVisibility={() => setShowPassword(!showPassword)} showPassword={showPassword} value={password} />
        {legacyWalletNeedsPassword ? <>
          <PasswordInput label="Confirm password" onChangeText={setConfirmPassword} onToggleVisibility={() => setShowPassword(!showPassword)} showPassword={showPassword} value={confirmPassword} />
          <Text style={bodyStyle}>Use at least 12 characters with uppercase, lowercase, number, and special character.</Text>
          <CheckboxRow checked={acceptedPasswordLoss} label="I will keep my secret key safe; PiggyBanq cannot reset this local password." onPress={() => setAcceptedPasswordLoss(!acceptedPasswordLoss)} />
        </> : null}
        <AuthButton disabled={isCreating || (legacyWalletNeedsPassword ? !passwordReady : !password)} label={isCreating ? 'Unlocking...' : legacyWalletNeedsPassword ? 'Protect and unlock' : 'Unlock wallet'} onPress={handleUnlock} variant="primary" />
        <Text style={bodyStyle}>Forgotten password? Your Stellar secret key can restore the wallet on a separate device. This app keeps the existing wallet record safe.</Text>
      </AuthCard>
    </AuthShell>
  );
}
