import { Text } from '../src/ui/Typography';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { palette } from '../src/auth/layout';
import { useMobileSession } from '../src/auth/session';

export default function Index() {
  const { isLoadingWallet, wallet, hasStoredWallet, backupConfirmed } = useMobileSession();

  if (isLoadingWallet) {
    return <SplashScreen />;
  }

  return <Redirect href={wallet ? (backupConfirmed ? '/(tabs)/dashboard' : '/(auth)/recovery') : (hasStoredWallet ? '/(auth)/unlock-wallet' : '/(auth)/home')} />;
}

function SplashScreen() {
  return (
    <View style={splashStyle}>
      <Text style={splashTitleStyle}>PiggyBanq</Text>
      <Text style={splashTextStyle}>Keys never leave your device. Ever.</Text>
    </View>
  );
}

const splashStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.background,
  flex: 1,
  justifyContent: 'center' as const,
  padding: 24
};

const splashTitleStyle = {
  color: palette.rose,
  fontSize: 38,
  fontWeight: '900' as const,
  lineHeight: 44
};

const splashTextStyle = {
  color: palette.textMid,
  fontSize: 12,
  fontWeight: '800' as const,
  lineHeight: 16,
  marginTop: 8,
  textAlign: 'center' as const
};
