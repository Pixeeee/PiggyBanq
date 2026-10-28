import { Text } from '../../src/ui/Typography';
import { Redirect, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { AuthButton } from '../../src/auth/components/AuthButton';
import { AuthCard, AuthInput, PasswordInput, CheckboxRow, bodyStyle, linkButtonStyle, linkButtonTextStyle } from '../../src/auth/components/AuthCard';
import { AuthShell } from '../../src/auth/components/AuthShell';
import { useMobileSession } from '../../src/auth/session';

export default function ImportWalletPage() {
  const router = useRouter();
  const { authError, authStatus, importSecretKey, importWallet, isCreating, setImportSecretKey, username, setUsername, password, setPassword, confirmPassword, setConfirmPassword, passwordReady, showPassword, setShowPassword, acceptedPasswordLoss, setAcceptedPasswordLoss, hasStoredWallet } = useMobileSession();

  async function handleImport() {
    const wallet = await importWallet();
    if (wallet) {
      router.replace('/(auth)/recovery');
    }
  }

  if (hasStoredWallet) return <Redirect href="/(auth)/unlock-wallet" />;

  return (
    <AuthShell authError={authError} authStatus={authStatus}>
      <AuthCard title="Import Stellar wallet" onBack={() => router.back()}>
        <Text style={bodyStyle}>Import your Stellar secret key or 12-word PiggyBanq web recovery phrase into Android SecureStore.</Text>
        <AuthInput
          autoCapitalize="none"
          label="Stellar secret key or recovery phrase"
          onChangeText={setImportSecretKey}
          placeholder="S... key or 12 words in order"
          secureTextEntry
          value={importSecretKey}
        />
        <AuthInput autoCapitalize="none" label="Local username" onChangeText={setUsername} placeholder="ana_santos" value={username} />
        <PasswordInput label="New password" onChangeText={setPassword} onToggleVisibility={() => setShowPassword(!showPassword)} showPassword={showPassword} value={password} />
        <PasswordInput label="Confirm password" onChangeText={setConfirmPassword} onToggleVisibility={() => setShowPassword(!showPassword)} showPassword={showPassword} value={confirmPassword} />
        <Text style={bodyStyle}>Use at least 12 characters with uppercase, lowercase, number, and special character.</Text>
        <CheckboxRow checked={acceptedPasswordLoss} label="Keep your secret key safe. PiggyBanq cannot reset your local password." onPress={() => setAcceptedPasswordLoss(!acceptedPasswordLoss)} />
        <AuthButton disabled={isCreating || !importSecretKey.trim() || !passwordReady} label={isCreating ? 'Securing...' : 'Import wallet'} onPress={handleImport} variant="primary" />
        <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/create-local-wallet')} style={linkButtonStyle}>
          <Text style={linkButtonTextStyle}>Create a local wallet</Text>
        </Pressable>
      </AuthCard>
    </AuthShell>
  );
}
