import '../src/polyfills/stellar-sdk-react-native';

import { usePreventScreenCapture } from 'expo-screen-capture';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MobileSessionProvider } from '../src/auth/session';
import { NativeSiteNavigation } from '../src/ui/NativeSiteNavigation';
import { MobileThemeProvider } from '../src/theme';

export default function RootLayout() {
  usePreventScreenCapture();
  const [fontsLoaded, fontError] = useFonts({
    'Geist-400': require('../assets/fonts/Geist-400.ttf'),
    'Geist-500': require('../assets/fonts/Geist-500.ttf'),
    'Geist-600': require('../assets/fonts/Geist-600.ttf'),
    'Geist-700': require('../assets/fonts/Geist-700.ttf'),
    'Geist-800': require('../assets/fonts/Geist-800.ttf'),
    'Geist-900': require('../assets/fonts/Geist-900.ttf'),
    'Grandstander-700': require('../assets/fonts/Grandstander-700.ttf'),
    'GeistMono-400': require('../assets/fonts/GeistMono-400.ttf')
  });
  if (!fontsLoaded && !fontError) return <ActivityIndicator accessibilityLabel="Loading PiggyBanq fonts" />;
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <MobileThemeProvider>
        <MobileSessionProvider>
          <NativeSiteNavigation><Stack screenOptions={{ headerShown: false }} /></NativeSiteNavigation>
        </MobileSessionProvider>
      </MobileThemeProvider>
    </SafeAreaProvider>
  );
}
