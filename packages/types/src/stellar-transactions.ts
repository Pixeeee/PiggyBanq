export type StellarEnabledAsset = 'XLM' | 'USDC';
export type StellarOperationType = 'PAYMENT' | 'CHANGE_TRUST' | 'PATH_PAYMENT_STRICT_SEND';
export type StellarIntentStatus = 'QUOTED' | 'AWAITING_SIGNATURE' | 'EXECUTING' | 'SUBMITTED' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'UNKNOWN';

export type StellarBalanceView = {
  assetCode: StellarEnabledAsset;
  issuer: string | null;
  balanceUnits: string;
  buyingLiabilitiesUnits: string;
  sellingLiabilitiesUnits: string;
  availableUnits: string;
  trustline: boolean;
  authorized: boolean;
  limitUnits: string | null;
};

export type StellarAccountSummary =
  | { status: 'NOT_FOUND'; network: 'TESTNET'; publicKey: string; balances: null }
  | {
      status: 'LIVE';
      network: 'TESTNET';
      publicKey: string;
      sequence: string;
      subentryCount: number;
      balances: Record<StellarEnabledAsset, StellarBalanceView>;
      refreshedAt: string;
    };

export type StellarActivityView = {
  id: string;
  type: string;
  direction: 'IN' | 'OUT' | 'SELF';
  source: string | null;
  destination: string | null;
  assetCode: StellarEnabledAsset;
  assetIssuer: string | null;
  amountUnits: string;
  transactionHash: string;
  successful: boolean;
  createdAt: string;
};

export type StellarQuoteReview = {
  network: 'Stellar Testnet';
  operationType: StellarOperationType;
  source: string;
  destination: string | null;
  assetCode: StellarEnabledAsset;
  assetIssuer: string | null;
  amountUnits: string;
  destinationAssetCode: StellarEnabledAsset | null;
  destinationAssetIssuer: string | null;
  minimumDestinationUnits: string | null;
  quotedDestinationUnits: string | null;
  path: Array<{ code: StellarEnabledAsset; issuer: string | null }>;
  feeStroops: string;
  memo: string | null;
  expiresAt: string;
};

export type StellarIntentView = {
  id: string;
  status: StellarIntentStatus;
  network: 'STELLAR_TESTNET';
  unsignedXdr: string;
  transactionHash: string | null;
  error: { code: string; message: string } | null;
  review: StellarQuoteReview;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type StellarCapabilities = {
  network: 'TESTNET';
  mode: 'LIVE_TESTNET';
  enabledAssets: readonly StellarEnabledAsset[];
  operations: readonly StellarOperationType[];
  selfCustody: true;
  localSigning: true;
  yield: 'SIMULATION_ONLY';
  binance: 'DISABLED';
  cctp: 'DISABLED';
  mainnet: 'DISABLED';
  emergencyReadOnly: boolean;
};

export type StellarApiError = { error: { code: string; message: string; resultCodes?: readonly string[] } };

