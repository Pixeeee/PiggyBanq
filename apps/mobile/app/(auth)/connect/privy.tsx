import { useRouter } from 'expo-router';
import { ProviderConnectCard } from '../../../src/auth/components/ProviderConnectCard';

export default function PrivyConnectPage() {
  const router = useRouter();
  return <ProviderConnectCard providerId="privy" providerName="Privy" onBack={() => router.replace('/(auth)/home')} />;
}
