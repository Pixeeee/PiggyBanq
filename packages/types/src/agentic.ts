export type AgenticActionType = 'X402_PAYMENT' | 'STELLAR_SWAP' | 'CCTP_BRIDGE' | 'STELLAR_SELL';
export type AgenticProvider = 'BINANCE_X402' | 'STELLAR' | 'CIRCLE_CCTP' | 'STELLAR_ANCHOR_SANDBOX';
export type AgenticIntentStatus = 'AWAITING_APPROVAL' | 'APPROVED' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export type AgenticNetwork = 'STELLAR_TESTNET' | 'BASE_SEPOLIA' | 'BSC_TESTNET' | 'BINANCE_X402_SANDBOX';

export type AgenticIntentDraft = {
  actionType: AgenticActionType;
  amount: string;
  assetCode: 'XLM' | 'USDC';
  outputAssetCode?: 'XLM' | 'USDC' | 'PHP';
  recipient?: string;
  serviceUrl?: string;
  destinationAddress?: string;
  destinationNetwork?: 'BASE_SEPOLIA' | 'BSC_TESTNET';
};

export type AgenticIntentPreview = {
  id: string;
  actionType: AgenticActionType;
  provider: AgenticProvider;
  status: AgenticIntentStatus;
  mode: 'SANDBOX';
  amount: string;
  assetCode: 'XLM' | 'USDC';
  outputAssetCode: 'XLM' | 'USDC' | 'PHP';
  estimatedOutput: string;
  minimumReceived: string;
  fee: string;
  slippageBps: number;
  recipient: string | null;
  serviceUrl: string | null;
  destinationAddress: string | null;
  sourceNetwork: AgenticNetwork;
  destinationNetwork: AgenticNetwork;
  sourceDomain: number | null;
  destinationDomain: number | null;
  stages: string[];
  policyChecks: Array<{ label: string; passed: boolean }>;
  createdAt: string;
  expiresAt: string;
  approvedAt: string | null;
  executedAt: string | null;
};

export type AgenticProviderReceipt = {
  id: string;
  intentId: string;
  provider: AgenticProvider;
  mode: 'SANDBOX';
  network: AgenticNetwork;
  externalReference: string;
  status: 'SUCCEEDED';
  settledAt: string;
  stages: Array<{ label: string; status: 'SUCCEEDED' }>;
};
