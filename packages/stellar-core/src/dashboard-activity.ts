export type DashboardActivity = { successful: boolean; assetCode?: string; amountUnits?: string; direction?: 'IN' | 'OUT' | 'SELF' };

// Describe the loaded payment sample, never a complete balance or monthly spending total.
export function summarizeDashboardActivity(activity: DashboardActivity[], asset: 'XLM' | 'USDC') {
  const entries = activity.filter(entry => entry.successful && entry.assetCode === asset
    && (entry.direction === 'IN' || entry.direction === 'OUT') && /^\d{1,30}$/.test(entry.amountUnits ?? ''));
  let received = 0n, sent = 0n;
  const values = entries.slice().reverse().map(entry => {
    if (entry.direction === 'IN') received += BigInt(entry.amountUnits!);
    else sent += BigInt(entry.amountUnits!);
    return { received, sent };
  });
  const max = received > sent ? received : sent;
  return { received: received.toString(), sent: sent.toString(), count: entries.length,
    incomingCount: entries.filter(entry => entry.direction === 'IN').length,
    outgoingCount: entries.filter(entry => entry.direction === 'OUT').length,
    points: [{ received: 0, sent: 0 }, ...values.map(value => ({
      received: max ? Number(value.received * 10000n / max) / 100 : 0,
      sent: max ? Number(value.sent * 10000n / max) / 100 : 0
    }))] };
}
