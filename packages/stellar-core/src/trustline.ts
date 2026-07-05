export interface TrustlineRequirementInput {
  assetCode: string;
  issuer?: string;
}

export function requiresTrustline(input: TrustlineRequirementInput): boolean {
  const assetCode = input.assetCode.trim().toUpperCase();
  if (assetCode === 'XLM' || assetCode === 'NATIVE') {
    return false;
  }

  return true;
}

