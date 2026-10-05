import { Redirect, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMobileTheme } from '../../src/theme';
import { Body, Button, Card, Field, Icon, IconButton } from '../../src/ui/banking';
import { PiggyCompanion } from '../../src/dashboard/PiggyCompanion';
import { AuthButton } from '../../src/auth/components/AuthButton';
import { AuthCard, AuthInput, CheckboxRow, PasswordInput, bodyStyle } from '../../src/auth/components/AuthCard';
import { AuthShell } from '../../src/auth/components/AuthShell';
import { useMobileSession } from '../../src/auth/session';

export default function UnlockWalletPage() {
  const router = useRouter();
  const { palette } = useMobileTheme();
  const { hasStoredWallet, wallet, backupConfirmed, legacyWalletNeedsPassword, authError, authStatus, isCreating, password, setPassword, showPassword, setShowPassword, unlockWallet, username, setUsername, confirmPassword, setConfirmPassword, passwordReady, acceptedPasswordLoss, setAcceptedPasswordLoss } = useMobileSession();
  async function handleUnlock() {
    if (await unlockWallet(password)) router.replace('/');
  }
  if (wallet) return <Redirect href={backupConfirmed ? '/(tabs)/dashboard' : '/(auth)/recovery'} />;
  if (!hasStoredWallet) return <Redirect href="/(auth)/home" />;
  if (!legacyWalletNeedsPassword) return <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 20, justifyContent: 'center', width: '100%', maxWidth: 480, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Icon name="wallet-outline" color={palette.rose} /><Text style={{ color: palette.textDark, fontSize: 20, fontWeight: '700' }}>PiggyBanq</Text></View>
      <View style={{ gap: 8 }}><Text accessibilityRole="header" style={{ color: palette.textDark, fontSize: 34, fontWeight: '700', letterSpacing: -1 }}>Welcome back.</Text><Body>Your goals are waiting. Let’s pick up where you left off.</Body></View>
      <PiggyCompanion compact />
      <Card><Text style={{ color: palette.textDark, fontSize: 20, fontWeight: '700' }}>Unlock PiggyBanq</Text><Field label="Password" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} autoCapitalize="none" autoCorrect={false} placeholder="Your wallet password" trailing={<IconButton label={showPassword ? 'Hide password' : 'Show password'} icon={showPassword ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowPassword(!showPassword)} />} /><Button label={isCreating ? 'Unlocking...' : 'Unlock wallet'} icon="lock-open-outline" disabled={isCreating || !password} onPress={() => { void handleUnlock(); }} />{authError || authStatus ? <Text accessibilityLiveRegion="polite" style={{ color: authError ? palette.rose : palette.textMid, fontSize: 13, lineHeight: 19 }}>{authError || authStatus}</Text> : null}</Card>
      <Body muted>Forgotten password? Restore your backed-up Stellar secret key or original web phrase on a separate device. Your existing wallet is kept safe here.</Body>
    </ScrollView>
  </SafeAreaView>;
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
