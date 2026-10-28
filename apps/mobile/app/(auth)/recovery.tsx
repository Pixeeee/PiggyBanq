import { Text } from '../../src/ui/Typography';
import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
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
      <AuthCard title="Save your wallet backup" onBack={() => { lockWallet(); router.replace('/(auth)/unlock-wallet'); }}>
        <Text style={bodyStyle}>
          {wallet.recoveryPhrase ? 'These 12 words restore the same wallet on PiggyBanq web or another phone. Save them privately and never share them.' : 'This secret key restores your existing Stellar wallet on another phone. It cannot be converted into a web recovery phrase. Your existing keys are preserved.'}
        </Text>
        <Pressable accessibilityRole="button" onPress={revealSecretForBackup} style={secretPhraseStyle}>
          <Text selectable={secretVisible} style={[secretPhraseTextStyle,{fontFamily:'GeistMono-400'}]}>
            {secretVisible && wallet ? wallet.recoveryPhrase ?? wallet.secretKey : 'Tap to reveal your wallet backup'}
          </Text>
          {!secretVisible ? (
            <Text style={secretPhraseMetaStyle}>Make sure no one is watching your screen.</Text>
          ) : null}
        </Pressable>
        <CheckboxRow checked={savedKey && secretVisible} label="I saved my wallet backup in a safe place." onPress={() => { if (secretVisible) setSavedKey(!savedKey); }} />
        <AuthButton disabled={!secretVisible || !savedKey || isCreating} label="Continue" onPress={handleConfirmBackup} variant="primary" />
        <Pressable accessibilityRole="button" onPress={() => { lockWallet(); router.replace('/(auth)/unlock-wallet'); }} style={linkButtonStyle}>
          <Text style={linkButtonTextStyle}>Lock wallet</Text>
        </Pressable>
      </AuthCard>
    </AuthShell>
  );
}
