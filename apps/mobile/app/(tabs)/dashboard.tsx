import { Redirect } from 'expo-router';
import { DashboardHome } from '../../src/dashboard/DashboardHome';
import { useMobileSession } from '../../src/auth/session';

export default function DashboardPage() {
  const { isLoadingWallet, wallet, hasStoredWallet, backupConfirmed } = useMobileSession();

  if (isLoadingWallet) {
    return null;
  }

  if (!wallet) {
    return <Redirect href={hasStoredWallet ? "/(auth)/unlock-wallet" : "/(auth)/home"} />;
  }

  if (!backupConfirmed) return <Redirect href="/(auth)/recovery" />;
  return <DashboardHome />;
}
