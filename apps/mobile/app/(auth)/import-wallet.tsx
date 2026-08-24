import { useRouter } from 'expo-router';
import { Text, Pressable } from 'react-native';
import { AuthButton } from '../../src/auth/components/AuthButton';
import { AuthCard, AuthInput, bodyStyle, linkButtonStyle, linkButtonTextStyle } from '../../src/auth/components/AuthCard';
import { AuthShell } from '../../src/auth/components/AuthShell';
import { useMobileSession } from '../../src/auth/session';

export default function ImportWalletPage() {
  const router = useRouter();
  const { authError, authStatus, importSecretKey, importWallet, isCreating, setImportSecretKey } = useMobileSession();

  async function handleImport() {
    const wallet = await importWallet();
    if (wallet) {
      router.replace('/(tabs)/dashboard');
    }
  }

  return (
    <AuthShell authError={authError} authStatus={authStatus}>
      <AuthCard title="Unlock PiggyBanq" onBack={() => router.back()}>
        <Text style={bodyStyle}>Use an existing Stellar secret key to import this wallet into Android SecureStore.</Text>
        <AuthInput
          autoCapitalize="characters"
          label="Stellar secret key"
          onChangeText={setImportSecretKey}
          placeholder="S... Stellar secret key"
          secureTextEntry
          value={importSecretKey}
        />
        <AuthButton disabled={isCreating || !importSecretKey.trim()} label={isCreating ? 'Securing...' : 'Unlock and log in'} onPress={handleImport} variant="primary" />
        <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/create-local-wallet')} style={linkButtonStyle}>
          <Text style={linkButtonTextStyle}>Create a local wallet</Text>
        </Pressable>
      </AuthCard>
    </AuthShell>
  );
}
