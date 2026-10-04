import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { AuthButton } from '../../src/auth/components/AuthButton';
import { AuthCard, CheckboxRow, bodyStyle, linkButtonStyle, linkButtonTextStyle, secretPhraseMetaStyle, secretPhraseStyle, secretPhraseTextStyle } from '../../src/auth/components/AuthCard';
import { AuthShell } from '../../src/auth/components/AuthShell';
import { useMobileSession } from '../../src/auth/session';

export default function RecoveryPage() {
  const router = useRouter();
  const [savedKey, setSavedKey] = useState(false);
  const { authError, authStatus, confirmBackup, isCreating, revealSecretForBackup, secretVisible, wallet, hasStoredWallet, lockWallet } = useMobileSession();

  async function handleConfirmBackup() {
    if (savedKey && await confirmBackup()) {
      router.replace('/(tabs)/dashboard');
    }
  }

  if (!wallet) return <Redirect href={hasStoredWallet ? "/(auth)/unlock-wallet" : "/(auth)/home"} />;

  return (
    <AuthShell authError={authError} authStatus={authStatus}>
      <AuthCard title="Save your Stellar secret key" onBack={() => { lockWallet(); router.replace('/(auth)/unlock-wallet'); }}>
        <Text style={bodyStyle}>
          This secret key restores this Stellar wallet if your device is lost. Save it privately and never share it. Android can also import your original 12-word PiggyBanq web recovery phrase.
        </Text>
        <Pressable accessibilityRole="button" onPress={revealSecretForBackup} style={secretPhraseStyle}>
          <Text selectable={secretVisible} style={secretPhraseTextStyle}>
            {secretVisible && wallet ? wallet.secretKey : 'Tap to reveal your Stellar secret key'}
          </Text>
          {!secretVisible ? (
            <Text style={secretPhraseMetaStyle}>Make sure no one is watching your screen.</Text>
          ) : null}
        </Pressable>
        <CheckboxRow checked={savedKey && secretVisible} label="I saved my Stellar secret key in a safe place." onPress={() => { if (secretVisible) setSavedKey(!savedKey); }} />
        <AuthButton disabled={!secretVisible || !savedKey || isCreating} label="Continue" onPress={handleConfirmBackup} variant="primary" />
        <Pressable accessibilityRole="button" onPress={() => { lockWallet(); router.replace('/(auth)/unlock-wallet'); }} style={linkButtonStyle}>
          <Text style={linkButtonTextStyle}>Lock wallet</Text>
        </Pressable>
      </AuthCard>
    </AuthShell>
  );
}
