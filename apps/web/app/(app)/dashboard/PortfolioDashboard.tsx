import { StellarDashboard } from './StellarDashboard';

export function PortfolioDashboard({
  accountLabel,
  displayName,
  username,
  publicKey,
  isDemo
}: {
  accountLabel: string;
  displayName: string;
  username: string;
  publicKey: string;
  isDemo: boolean;
}) {
  void accountLabel;
  return <StellarDashboard displayName={displayName} username={username} publicKey={publicKey} isDemo={isDemo} />;
}
