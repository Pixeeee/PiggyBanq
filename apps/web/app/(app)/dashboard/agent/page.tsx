import { DashboardShell, getDashboardSnapshot } from '../_components/DashboardShell';
import { requireWalletSession } from '../_lib/session';
import { X402PaidApi } from './X402PaidApi';

export default async function AgentPage() {
  const user = await requireWalletSession();
  return <DashboardShell active="agent" snapshot={await getDashboardSnapshot(user)}>
    <X402PaidApi username={user.username ?? ''} publicKey={user.stellarPublicKey ?? ''} isDemo={user.id === 'local-demo-user'} />
  </DashboardShell>;
}
