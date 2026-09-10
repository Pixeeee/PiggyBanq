import type {
  AgenticIntentDraft,
  AgenticIntentPreview,
  AgenticProviderReceipt
} from '@piggybanq/types/agentic';
import { formatStellarAmount, parseStellarAmount } from './amounts.ts';

const X402_SANDBOX_LIMIT_UNITS = 200_000_000n;
const QUOTE_LIFETIME_MS = 5 * 60 * 1000;

export class AgenticRailError extends Error {
  readonly code:
    | 'UNSUPPORTED_ACTION'
    | 'UNSUPPORTED_ROUTE'
    | 'POLICY_REJECTED'
    | 'QUOTE_EXPIRED'
    | 'APPROVAL_REQUIRED';

  constructor(
    code:
      | 'UNSUPPORTED_ACTION'
      | 'UNSUPPORTED_ROUTE'
      | 'POLICY_REJECTED'
      | 'QUOTE_EXPIRED'
      | 'APPROVAL_REQUIRED',
    message: string
  ) {
    super(message);
    this.code = code;
  }
}

export function parseAgentCommand(command: string): AgenticIntentDraft {
  const normalized = command.trim();
  const payment = normalized.match(/^pay\s+(\d+(?:\.\d{1,2})?)\s+usdc\s+to\s+(.+)$/i);
  if (payment) {
    return { actionType: 'X402_PAYMENT', amount: payment[1], assetCode: 'USDC', recipient: payment[2].trim() };
  }

  const swap = normalized.match(/^swap\s+(\d+(?:\.\d{1,7})?)\s+(xlm|usdc)\s+to\s+(xlm|usdc)$/i);
  if (swap && swap[2].toUpperCase() !== swap[3].toUpperCase()) {
    return {
      actionType: 'STELLAR_SWAP',
      amount: swap[1],
      assetCode: swap[2].toUpperCase() as 'XLM' | 'USDC',
      outputAssetCode: swap[3].toUpperCase() as 'XLM' | 'USDC'
    };
  }

  const bridge = normalized.match(/^bridge\s+(\d+(?:\.\d{1,7})?)\s+usdc\s+to\s+base$/i);
  if (bridge) {
    return { actionType: 'CCTP_BRIDGE', amount: bridge[1], assetCode: 'USDC', destinationNetwork: 'BASE_SEPOLIA' };
  }

  throw new AgenticRailError(
    'UNSUPPORTED_ACTION',
    'Command not supported. Try “Pay 5 USDC to weather-api”, “Swap 25 XLM to USDC”, or “Bridge 10 USDC to Base”.'
  );
}

export function createSandboxIntentPreview(
  draft: AgenticIntentDraft,
  options: { now?: Date; id?: string } = {}
): AgenticIntentPreview {
  const now = options.now ?? new Date();
  const id = options.id ?? createId('intent');
  const amountUnits = parseStellarAmount(draft.amount);

  const base = {
    id,
    actionType: draft.actionType,
    status: 'AWAITING_APPROVAL' as const,
    mode: 'SANDBOX' as const,
    amount: formatSandboxAmount(amountUnits),
    assetCode: draft.assetCode,
    recipient: draft.recipient?.trim() || null,
    serviceUrl: draft.serviceUrl?.trim() || null,
    destinationAddress: draft.destinationAddress?.trim() || null,
    sourceDomain: null,
    destinationDomain: null,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + QUOTE_LIFETIME_MS).toISOString(),
    approvedAt: null,
    executedAt: null
  };

  if (draft.actionType === 'X402_PAYMENT') {
    if (!draft.recipient?.trim()) {
      throw new AgenticRailError('POLICY_REJECTED', 'A payment recipient is required.');
    }
    if (draft.assetCode !== 'USDC' || amountUnits > X402_SANDBOX_LIMIT_UNITS) {
      throw new AgenticRailError('POLICY_REJECTED', 'Sandbox x402 payments are limited to 20.00 USDC.');
    }
    return {
      ...base,
      provider: 'BINANCE_X402',
      outputAssetCode: 'USDC',
      estimatedOutput: formatSandboxAmount(amountUnits),
      minimumReceived: formatSandboxAmount(amountUnits),
      fee: '0.00',
      slippageBps: 0,
      sourceNetwork: 'BINANCE_X402_SANDBOX',
      destinationNetwork: 'BINANCE_X402_SANDBOX',
      stages: ['VERIFY_PAYMENT', 'SETTLE_PAYMENT', 'ISSUE_RECEIPT'],
      policyChecks: [
        { label: 'USDC is allowlisted', passed: true },
        { label: 'Amount is within the 20 USDC sandbox cap', passed: true },
        { label: 'Explicit approval is still required', passed: true }
      ]
    };
  }

  if (draft.actionType === 'CCTP_BRIDGE') {
    if (draft.assetCode !== 'USDC' || draft.destinationNetwork !== 'BASE_SEPOLIA') {
      throw new AgenticRailError(
        'UNSUPPORTED_ROUTE',
        'Only native USDC from Stellar Testnet to Base Sepolia is supported. Stellar-to-BSC USDC is unavailable through CCTP.'
      );
    }
    return {
      ...base,
      provider: 'CIRCLE_CCTP',
      outputAssetCode: 'USDC',
      estimatedOutput: formatSandboxAmount(amountUnits),
      minimumReceived: formatSandboxAmount(amountUnits),
      fee: '0.01',
      slippageBps: 0,
      sourceNetwork: 'STELLAR_TESTNET',
      destinationNetwork: 'BASE_SEPOLIA',
      sourceDomain: 27,
      destinationDomain: 6,
      stages: ['BURN_USDC', 'WAIT_FOR_ATTESTATION', 'MINT_USDC'],
      policyChecks: [
        { label: 'Native USDC only', passed: true },
        { label: 'CCTP domain 27 to domain 6', passed: true },
        { label: 'Base destination must be confirmed', passed: true }
      ]
    };
  }

  if (draft.actionType === 'STELLAR_SWAP') {
    const output = draft.outputAssetCode ?? (draft.assetCode === 'XLM' ? 'USDC' : 'XLM');
    const outputUnits = draft.assetCode === 'XLM'
      ? (amountUnits * 42n) / 100n
      : (amountUnits * 100n) / 42n;
    return {
      ...base,
      provider: 'STELLAR',
      outputAssetCode: output,
      estimatedOutput: formatSandboxAmount(outputUnits),
      minimumReceived: formatSandboxAmount((outputUnits * 995n) / 1000n),
      fee: '0.00001',
      slippageBps: 50,
      sourceNetwork: 'STELLAR_TESTNET',
      destinationNetwork: 'STELLAR_TESTNET',
      stages: ['FIND_PATH', 'USER_SIGN', 'POLL_TO_SUCCESS'],
      policyChecks: [
        { label: 'Stellar Testnet only', passed: true },
        { label: 'Trustline checked for non-native assets', passed: true },
        { label: 'User signature required', passed: true }
      ]
    };
  }

  if (draft.actionType === 'STELLAR_SELL') {
    return {
      ...base,
      provider: 'STELLAR_ANCHOR_SANDBOX',
      outputAssetCode: 'PHP',
      estimatedOutput: formatSandboxAmount((amountUnits * 770n) / 100n),
      minimumReceived: formatSandboxAmount((amountUnits * 762n) / 100n),
      fee: '0.25',
      slippageBps: 100,
      sourceNetwork: 'STELLAR_TESTNET',
      destinationNetwork: 'STELLAR_TESTNET',
      stages: ['ANCHOR_QUOTE', 'USER_CONFIRM', 'SANDBOX_PAYOUT'],
      policyChecks: [
        { label: 'Testnet asset only', passed: true },
        { label: 'Licensed anchor not yet connected', passed: true },
        { label: 'No real payout occurs', passed: true }
      ]
    };
  }

  throw new AgenticRailError('UNSUPPORTED_ACTION', 'This action is not supported by PiggyBanq sandbox.');
}

export function approveSandboxIntent(
  intent: AgenticIntentPreview,
  options: { now?: Date } = {}
): AgenticIntentPreview {
  const now = options.now ?? new Date();
  if (new Date(intent.expiresAt).getTime() <= now.getTime()) {
    throw new AgenticRailError('QUOTE_EXPIRED', 'This quote expired. Refresh it before approving.');
  }
  if (intent.status !== 'AWAITING_APPROVAL') {
    return intent;
  }
  return { ...intent, status: 'APPROVED', approvedAt: now.toISOString() };
}

export function executeSandboxIntent(
  intent: AgenticIntentPreview,
  options: { now?: Date } = {}
): { intent: AgenticIntentPreview; receipt: AgenticProviderReceipt } {
  const now = options.now ?? new Date();
  if (intent.status !== 'APPROVED') {
    throw new AgenticRailError('APPROVAL_REQUIRED', 'Review and approve this intent before execution.');
  }
  const completed = { ...intent, status: 'SUCCEEDED' as const, executedAt: now.toISOString() };
  return {
    intent: completed,
    receipt: {
      id: createId('receipt'),
      intentId: intent.id,
      provider: intent.provider,
      mode: 'SANDBOX',
      network: intent.destinationNetwork,
      externalReference: createId('sandbox'),
      status: 'SUCCEEDED',
      settledAt: now.toISOString(),
      stages: intent.stages.map((label) => ({ label, status: 'SUCCEEDED' as const }))
    }
  };
}

function formatSandboxAmount(units: bigint) {
  const [whole, fraction] = formatStellarAmount(units).split('.');
  const meaningful = fraction.replace(/0+$/, '');
  return `${whole}.${meaningful.padEnd(2, '0')}`;
}

function createId(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${random}`;
}
