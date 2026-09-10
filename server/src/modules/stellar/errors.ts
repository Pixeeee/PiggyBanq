export type StellarErrorCode =
  | 'ACCOUNT_NOT_FOUND'
  | 'HORIZON_UNAVAILABLE'
  | 'INVALID_TRANSACTION'
  | 'NO_SWAP_PATH'
  | 'TRANSACTION_REJECTED'
  | 'TRANSACTION_UNKNOWN';

export class StellarServiceError extends Error {
  readonly code: StellarErrorCode;
  readonly statusCode: number;
  readonly resultCodes: readonly string[];

  constructor(
    code: StellarErrorCode,
    message: string,
    statusCode = 502,
    resultCodes: readonly string[] = []
  ) {
    super(message);
    this.name = 'StellarServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.resultCodes = resultCodes;
  }
}

function errorRecord(error: unknown): Record<string, unknown> {
  return typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
}

export function horizonStatus(error: unknown) {
  const response = errorRecord(errorRecord(error).response);
  return typeof response.status === 'number' ? response.status : null;
}

export function stellarResultCodes(error: unknown): string[] {
  const response = errorRecord(errorRecord(error).response);
  const data = errorRecord(response.data);
  const extras = errorRecord(data.extras);
  const resultCodes = errorRecord(extras.result_codes);
  const transaction = typeof resultCodes.transaction === 'string' ? [resultCodes.transaction] : [];
  const operations = Array.isArray(resultCodes.operations)
    ? resultCodes.operations.filter((value): value is string => typeof value === 'string')
    : [];
  return [...transaction, ...operations].filter((code) => /^tx_|^op_|^[a-z][a-z0-9_]+$/.test(code)).slice(0, 12);
}

export function toStellarServiceError(error: unknown) {
  if (error instanceof StellarServiceError) return error;
  const status = horizonStatus(error);
  const codes = stellarResultCodes(error);
  if (status === 404) return new StellarServiceError('ACCOUNT_NOT_FOUND', 'The Stellar Testnet account was not found.', 404);
  if (status === 400 && codes.length > 0) return new StellarServiceError('TRANSACTION_REJECTED', 'Stellar Testnet rejected the transaction.', 422, codes);
  return new StellarServiceError('HORIZON_UNAVAILABLE', 'Stellar Testnet is temporarily unavailable. No success was assumed.', 503);
}
