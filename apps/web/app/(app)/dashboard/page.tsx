import { DashboardShell, getDashboardSnapshot } from './_components/DashboardShell';
import { requireWalletSession } from './_lib/session';
import { PortfolioDashboard } from './PortfolioDashboard';

export default async function DashboardPage() {
  const authUser = await requireWalletSession();
  const snapshot = await getDashboardSnapshot(authUser);

  return (
    <DashboardShell active="overview" snapshot={snapshot}>
      <PortfolioDashboard
        accountLabel={snapshot.accountLabel}
        displayName={authUser.displayName}
        username={authUser.username ?? ''}
        publicKey={authUser.stellarPublicKey ?? ''}
        isDemo={authUser.id === 'local-demo-user'}
      />
    </DashboardShell>
  );
}
