import '../src/polyfills/stellar-sdk-react-native';

import { usePreventScreenCapture } from 'expo-screen-capture';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MobileSessionProvider } from '../src/auth/session';
import { MobileThemeProvider } from '../src/theme';

export default function RootLayout() {
  usePreventScreenCapture();
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <MobileThemeProvider>
        <MobileSessionProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </MobileSessionProvider>
      </MobileThemeProvider>
    </SafeAreaProvider>
  );
}
