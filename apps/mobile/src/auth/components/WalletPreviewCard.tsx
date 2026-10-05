import { View } from 'react-native';
import { PiggyCompanion } from '../../dashboard/PiggyCompanion';

// Reusable entry illustration. Ledger balances belong only in the authenticated dashboard.
export function WalletPreviewCard({ marginTop }: { marginTop: number; minHeight: number; pigSize: { height: number; width: number } }) {
  return <View style={{ marginTop, width: '100%' }}><PiggyCompanion /></View>;
}
