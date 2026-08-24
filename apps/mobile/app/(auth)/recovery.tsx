import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { AuthButton } from '../../src/auth/components/AuthButton';
import { AuthCard, CheckboxRow, bodyStyle, linkButtonStyle, linkButtonTextStyle, secretPhraseMetaStyle, secretPhraseStyle, secretPhraseTextStyle } from '../../src/auth/components/AuthCard';
import { AuthShell } from '../../src/auth/components/AuthShell';
import { useMobileSession } from '../../src/auth/session';

export default function RecoveryPage() {
  const router = useRouter();
  const { authError, authStatus, confirmBackup, isCreating, revealSecretForBackup, secretVisible, wallet } = useMobileSession();

  function handleConfirmBackup() {
    if (confirmBackup()) {
      router.replace('/(tabs)/dashboard');
    }
  }

  return (
    <AuthShell authError={authError} authStatus={authStatus}>
      <AuthCard title="Save your Stellar secret key" onBack={() => router.replace('/(auth)/home')}>
        <Text style={bodyStyle}>
          This replaces the web recovery phrase on Android. Write it down in order and never share it.
        </Text>
        <Pressable accessibilityRole="button" onPress={revealSecretForBackup} style={secretPhraseStyle}>
          <Text selectable={secretVisible} style={secretPhraseTextStyle}>
            {secretVisible && wallet ? wallet.secretKey : 'Tap to reveal your Stellar secret key'}
          </Text>
          {!secretVisible ? (
            <Text style={secretPhraseMetaStyle}>Make sure no one is watching your screen.</Text>
          ) : null}
        </Pressable>
        <CheckboxRow checked={secretVisible} label="Secret key revealed on this device." onPress={revealSecretForBackup} />
        <AuthButton disabled={!secretVisible || isCreating} label="Continue" onPress={handleConfirmBackup} variant="primary" />
        <Pressable accessibilityRole="button" onPress={() => router.replace('/(auth)/home')} style={linkButtonStyle}>
          <Text style={linkButtonTextStyle}>Remind me later</Text>
        </Pressable>
      </AuthCard>
    </AuthShell>
  );
}
