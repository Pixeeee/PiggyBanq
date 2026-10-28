import { Text } from '../ui/Typography';
import { View } from 'react-native';
import { summarizeDashboardActivity, type DashboardActivity } from '@piggybanq/stellar-core/dashboard-activity';
import { formatStellarAmount } from '@piggybanq/stellar-core/amounts';
import { useMobileTheme } from '../theme';
import { Body, Card, Icon } from '../ui/banking';
import { formatLedgerBalance } from './presentation';

export function NativeActivityOverview({ activity, asset, ready, hidden }: { activity: DashboardActivity[]; asset: 'XLM' | 'USDC'; ready: boolean; hidden: boolean }) {
  const { palette } = useMobileTheme();
  const summary = summarizeDashboardActivity(activity, asset);
  return <Card>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View style={{ gap: 5 }}><Text style={{ fontSize: 9, letterSpacing: 1.4, color: palette.textSoft }}>THE BIGGER PICTURE</Text><Text accessibilityRole="header" style={{ fontSize: 19, fontWeight: '600', color: palette.textDark }}>Money flow</Text></View><View style={{ backgroundColor: palette.cardAlt, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 }}><Text style={{ color: palette.textMid, fontSize: 11 }}>{asset}</Text></View></View>
    <View style={{ flexDirection: 'row', gap: 16 }}>{(['received', 'sent'] as const).map(key => <View key={key} style={{ flex: 1, gap: 7 }}><Text style={{ color: palette.textMid, fontSize: 12 }}>{key === 'received' ? '● Received' : '● Sent'}</Text><Text adjustsFontSizeToFit numberOfLines={1} style={{ color: palette.textDark, fontSize: 22, fontWeight: '600' }}>{hidden ? '••••' : ready ? formatLedgerBalance(formatStellarAmount(BigInt(summary[key]))) : '—'}</Text></View>)}</View>
    {ready && summary.count && !hidden ? <View accessible accessibilityLabel={`Cumulative received and sent ${asset} across loaded payments, oldest to newest`} style={{ height: 110, flexDirection: 'row', alignItems: 'flex-end', gap: 5, borderBottomWidth: 1, borderColor: palette.borderSoft }}>
      {summary.points.slice(1).map((point, index) => <View key={index} style={{ flex: 1, flexDirection: 'row', gap: 2, alignItems: 'flex-end', height: '100%' }}><View style={{ flex: 1, height: `${point.received}%`, backgroundColor: palette.rose, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} /><View style={{ flex: 1, height: `${point.sent}%`, backgroundColor: palette.peach, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} /></View>)}
    </View> : <View style={{ backgroundColor: palette.cardAlt, borderRadius: 14, padding: 18, alignItems: 'center', gap: 8 }}><Icon name="analytics-outline" color={palette.rose} /><Body>{hidden ? 'Activity hidden' : 'Confirmed payments bring this chart to life.'}</Body></View>}
    <Text style={{ color: palette.textSoft, fontSize: 10 }}>{ready ? `${summary.count} confirmed ${asset} payments` : 'Ledger data pending'} · Loaded activity only</Text>
  </Card>;
}
