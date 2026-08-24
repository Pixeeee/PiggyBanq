import { useRouter } from 'expo-router';
import { HomeLogin } from '../../src/auth/components/HomeLogin';
import { useMobileSession } from '../../src/auth/session';
import type { ProviderId } from '../../src/auth/types';

export default function AuthHomePage() {
  const router = useRouter();
  const { authError, authStatus, isCreating, setAuthError, setAuthStatus } = useMobileSession();

  function openProvider(provider: ProviderId) {
    setAuthError('');
    setAuthStatus('');
    router.push(`/(auth)/connect/${provider}`);
  }

  return (
    <HomeLogin
      authError={authError}
      authStatus={authStatus}
      isCreating={isCreating}
      onCreateLocalWallet={() => router.push('/(auth)/create-local-wallet')}
      onImportWallet={() => router.push('/(auth)/import-wallet')}
      onProviderConnect={openProvider}
    />
  );
}
