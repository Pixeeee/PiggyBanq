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
  { asset: 'USDC', inflow: '75.00 USDC', outflow: '25.00 USDC', net: '+50.00 USDC', category: 'Stellar savings rail' }
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
  { asset: 'USDC', allocated: '125.00 USDC', converted: 'PHP 7,190 est.', yieldType: 'Testnet stablecoin pocket', status: 'Trustline check' }
] as const;

export const earningAprMethods = [
  {
    title: 'Crypto Lending',
    summary: 'Deposit assets into a lending platform where borrowers pay interest back to suppliers.',
    status: 'Research mode',
    detail: 'PiggyBanq shows this as an APR education path only. Any real lending integration would need explicit platform review and user confirmation.'
  },
  {
    title: 'Liquidity Mining / Yield Farming',
    summary: 'Supply assets to a DEX liquidity pool so traders can swap tokens, earning a share of pool fees.',
    status: 'DEX pool review',
    detail: 'Pool exposure can include impermanent loss, smart contract risk, and token volatility. No allocation happens without a signed transaction review.'
  },
  {
    title: 'Staking',
    summary: 'Lock native proof-of-stake tokens to help validate transactions and receive network rewards.',
    status: 'Native-token only',
    detail: 'True staking usually applies to native network coins, not standard deposits. PiggyBanq keeps this separate from regular savings pockets.'
  }
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

export const portfolioActions = ['Sell', 'Swap', 'Stake'] as const;

export const portfolioTabs = ['Tokens', 'NFTs', 'DeFi', 'Transactions', 'Spending Caps'] as const;

export const portfolioTokens = [
  {
    symbol: 'XLM',
    name: 'Stellar Lumens',
    portfolioPercent: '41.8%',
    price: '$0.42',
    change24h: '+3.24%',
    balance: '4,320.82 XLM',
    fiatBalance: '$1,814.74',
    tone: 'sky',
    trend: 'positive'
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    portfolioPercent: '28.5%',
    price: '$1.00',
    change24h: '+0.01%',
    balance: '1,238.00 USDT',
    fiatBalance: '$1,238.00',
    tone: 'mint',
    trend: 'positive'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    portfolioPercent: '18.7%',
    price: '$0.99',
    change24h: '-0.06%',
    balance: '821.35 USDC',
    fiatBalance: '$817.24',
    tone: 'lilac',
    trend: 'negative'
  },
  {
    symbol: 'PHP',
    name: 'Peso Budget Rail',
    portfolioPercent: '11.0%',
    price: 'PHP 1.00',
    change24h: '+0.00%',
    balance: 'PHP 26,420.00',
    fiatBalance: '$471.12',
    tone: 'peach',
    trend: 'positive'
  }
] as const;

export const stellarRails = [
  STELLAR_TESTNET_CONFIG.horizonUrl,
  STELLAR_TESTNET_CONFIG.rpcUrl,
  'XLM and USDC savings first'
] as const;
