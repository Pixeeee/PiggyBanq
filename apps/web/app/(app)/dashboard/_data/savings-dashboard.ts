import { STELLAR_TESTNET_CONFIG } from '@piggybanq/stellar-core/network';

export const allocationCategories = [
  { label: 'Food', amount: 'PHP 4,500', percent: 32, tone: 'mint' },
  { label: 'Bills', amount: 'PHP 6,200', percent: 44, tone: 'lilac' },
  { label: 'Emergency', amount: 'PHP 2,000', percent: 14, tone: 'peach' },
  { label: 'XLM Savings', amount: 'PHP 1,300', percent: 10, tone: 'sky' }
] as const;

export const dailyAssetFlows = [
  { asset: 'PHP', inflow: 'PHP 3,200', outflow: 'PHP 1,480', net: '+PHP 1,720', category: 'Bills reserve' },
  { asset: 'XLM', inflow: '42.50 XLM', outflow: '8.00 XLM', net: '+34.50 XLM', category: 'Savings pocket' },
  { asset: 'USDT', inflow: '75.00 USDT', outflow: '25.00 USDT', net: '+50.00 USDT', category: 'Anchor conversion' }
] as const;

export const dailyFlowBars = [
  { day: 'Mon', inHeight: 42, outHeight: 24 },
  { day: 'Tue', inHeight: 64, outHeight: 31 },
  { day: 'Wed', inHeight: 51, outHeight: 45 },
  { day: 'Thu', inHeight: 78, outHeight: 36 },
  { day: 'Fri', inHeight: 70, outHeight: 28 }
] as const;

export const earningPockets = [
  { asset: 'XLM', allocated: '180.25 XLM', converted: 'PHP 13,870 est.', yieldType: 'Testnet savings yield', status: 'Ready to allocate' },
  { asset: 'USDT', allocated: '125.00 USDT', converted: 'PHP 7,190 est.', yieldType: 'Anchor-converted pocket', status: 'Trustline check' }
] as const;

export const userGoals = [
  { title: 'Groceries buffer', saved: 'PHP 2,800', target: 'PHP 5,000', percent: 56 },
  { title: 'Electric bill', saved: 'PHP 1,900', target: 'PHP 2,500', percent: 76 },
  { title: 'New phone fund', saved: 'PHP 4,200', target: 'PHP 18,000', percent: 23 }
] as const;

export const weeklySavings = [
  { label: 'W1', height: 42, amount: 'PHP 900' },
  { label: 'W2', height: 64, amount: 'PHP 1,450' },
  { label: 'W3', height: 58, amount: 'PHP 1,280' },
  { label: 'W4', height: 78, amount: 'PHP 1,900' }
] as const;

export const stellarRails = [
  STELLAR_TESTNET_CONFIG.horizonUrl,
  STELLAR_TESTNET_CONFIG.rpcUrl,
  'XLM and USDT savings first'
] as const;
