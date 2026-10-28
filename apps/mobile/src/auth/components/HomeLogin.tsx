import { Text } from '../../ui/Typography';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createLoginFitLayout } from '../layout';
import type { ProviderId } from '../types';
import { useMobileTheme } from '../../theme';
import { Body, Button, Icon } from '../../ui/banking';
import { PiggyCompanion } from '../../dashboard/PiggyCompanion';

export function HomeLogin({ authError, authStatus, isCreating, onCreateLocalWallet, onImportWallet }: {
  authError: string; authStatus: string; isCreating: boolean; onCreateLocalWallet: () => void; onImportWallet: () => void; onProviderConnect: (provider: ProviderId) => void;
}) {
  const insets = useSafeAreaInsets(); const { height, width } = useWindowDimensions();
  const fit = createLoginFitLayout({ height, insets, width }); const { palette } = useMobileTheme();
  return <ScrollView style={{ flex: 1, backgroundColor: palette.background }} contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: insets.top + 26, paddingBottom: insets.bottom + 28 }}>
    <View style={{ width: '100%', maxWidth: fit.maxWidth, flex: 1, gap: 28 }}>
      <View style={{ gap: 14, paddingTop: height < 720 ? 8 : 36 }}><Text accessibilityRole="header" style={{ color: palette.textDark, fontSize: 38, fontWeight: '700', letterSpacing: -1.5, lineHeight: 45 }}>A little today.{ '\n' }<Text style={{ color: palette.rose }}>A lot tomorrow.</Text></Text><Body>A calmer place for your wallet, your savings goals, and everything you’re working toward.</Body></View>
      <PiggyCompanion />
      <View style={{ gap: 12, marginTop: 'auto', paddingTop: 10 }}><Button label="Create wallet" icon="arrow-forward" onPress={onCreateLocalWallet} disabled={isCreating} /><Button label="I have a wallet" secondary onPress={onImportWallet} disabled={isCreating} /></View>
      {authError || authStatus ? <Text accessibilityLiveRegion="polite" style={{ color: authError ? palette.rose : palette.textMid, fontSize: 13, lineHeight: 20 }}>{authError || authStatus}</Text> : null}
      <View style={{ alignItems: 'center', gap: 6 }}><View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Icon name="shield-checkmark-outline" size={14} color={palette.green} /><Text style={{ color: palette.textMid, fontSize: 12 }}>Your keys. Your control.</Text></View><Text style={{ color: palette.textSoft, fontSize: 11 }}>Stellar Testnet · No real-money deposits</Text></View>
    </View>
  </ScrollView>;
}
