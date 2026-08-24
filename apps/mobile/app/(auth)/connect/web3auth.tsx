import { useRouter } from 'expo-router';
import { ProviderConnectCard } from '../../../src/auth/components/ProviderConnectCard';

export default function Web3AuthConnectPage() {
  const router = useRouter();
  return <ProviderConnectCard providerId="web3auth" providerName="Web3Auth" onBack={() => router.replace('/(auth)/home')} />;
}
