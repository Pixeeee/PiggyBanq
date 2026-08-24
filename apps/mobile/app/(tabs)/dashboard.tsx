import { Redirect } from 'expo-router';
import { DashboardHome } from '../../src/dashboard/DashboardHome';
import { useMobileSession } from '../../src/auth/session';

export default function DashboardPage() {
  const { isLoadingWallet, wallet } = useMobileSession();

  if (isLoadingWallet) {
    return null;
  }

  if (!wallet) {
    return <Redirect href="/(auth)/home" />;
  }

  return <DashboardHome />;
}
