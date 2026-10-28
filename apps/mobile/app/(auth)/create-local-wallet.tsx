import { Text } from '../../src/ui/Typography';
import { Redirect, useRouter } from 'expo-router';
import {  } from 'react-native';
import { AuthButton } from '../../src/auth/components/AuthButton';
import { AuthCard, AuthInput, CheckboxRow, PasswordInput, bodyStyle, helperTextStyle, warningTextStyle } from '../../src/auth/components/AuthCard';
import { AuthShell } from '../../src/auth/components/AuthShell';
import { useMobileSession } from '../../src/auth/session';

export default function CreateLocalWalletPage() {
  const router = useRouter();
  const {
    acceptedPasswordLoss,
    authError,
    authStatus,
    confirmPassword,
    createLocalWallet,
    isCreating,
    password,
    passwordCheck,
    passwordReady,
    setAcceptedPasswordLoss,
    setConfirmPassword,
    setPassword,
    setShowPassword,
    setUsername,
    showPassword,
    username,
    hasStoredWallet
  } = useMobileSession();

  async function handleCreate() {
    const wallet = await createLocalWallet();
    if (wallet) {
      router.replace('/(auth)/recovery');
    }
  }

  if (hasStoredWallet) return <Redirect href="/(auth)/unlock-wallet" />;

  return (
    <AuthShell authError={authError} authStatus={authStatus}>
      <AuthCard title="PiggyBanq password" onBack={() => router.back()}>
        <Text style={bodyStyle}>This password unlocks your wallet on this Android device. SecureStore encrypts your wallet record.</Text>
        <AuthInput autoCapitalize="none" label="Username" onChangeText={setUsername} placeholder="ana_santos" value={username} />
        <PasswordInput
          label="Create new password"
          onChangeText={setPassword}
          onToggleVisibility={() => setShowPassword(!showPassword)}
          showPassword={showPassword}
          value={password}
        />
        <Text style={helperTextStyle}>Must be at least 12 characters with uppercase, lowercase, number, and special character.</Text>
        <PasswordInput
          label="Confirm password"
          onChangeText={setConfirmPassword}
          onToggleVisibility={() => setShowPassword(!showPassword)}
          showPassword={showPassword}
          value={confirmPassword}
        />
        <CheckboxRow checked={acceptedPasswordLoss} label="If I lose this password, PiggyBanq cannot reset it." onPress={() => setAcceptedPasswordLoss(!acceptedPasswordLoss)} />
        {!passwordCheck.ok && password.length > 0 ? <Text style={warningTextStyle}>{passwordCheck.errors[0]}</Text> : null}
        <AuthButton disabled={!passwordReady || isCreating} label={isCreating ? 'Creating...' : 'Create password'} onPress={handleCreate} variant="primary" />
      </AuthCard>
    </AuthShell>
  );
}
