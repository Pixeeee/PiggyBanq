import '../src/polyfills/stellar-sdk-react-native';

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MobileSessionProvider } from '../src/auth/session';
import { MobileThemeProvider } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MobileThemeProvider>
        <MobileSessionProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </MobileSessionProvider>
      </MobileThemeProvider>
    </SafeAreaProvider>
  );
}
