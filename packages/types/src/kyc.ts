export const KYC_FREE_LIMIT_PHP = 50_000;

export function isWithinKycFreeLimitPhp(cumulativeAmountPhp: number): boolean {
  if (!Number.isFinite(cumulativeAmountPhp) || cumulativeAmountPhp < 0) {
    return false;
  }

  return cumulativeAmountPhp <= KYC_FREE_LIMIT_PHP;
}

