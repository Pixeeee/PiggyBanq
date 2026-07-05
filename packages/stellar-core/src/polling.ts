export type StellarTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'NOT_FOUND' | 'ERROR';
export type ClassifiedTransactionStatus = 'pending' | 'success' | 'failed' | 'unknown';

export function classifyTransactionStatus(
  status: StellarTransactionStatus | string
): ClassifiedTransactionStatus {
  if (status === 'PENDING') {
    return 'pending';
  }

  if (status === 'SUCCESS') {
    return 'success';
  }

  if (status === 'FAILED') {
    return 'failed';
  }

  return 'unknown';
}

export function shouldContinuePolling(input: {
  status: StellarTransactionStatus | string;
  attempts: number;
  maxAttempts?: number;
}): boolean {
  const maxAttempts = input.maxAttempts ?? 60;
  return classifyTransactionStatus(input.status) === 'pending' && input.attempts < maxAttempts;
}

