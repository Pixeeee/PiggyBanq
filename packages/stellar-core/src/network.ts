export const STELLAR_TESTNET_CONFIG = {
  network: 'TESTNET',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  friendbotUrl: 'https://friendbot.stellar.org'
} as const;

export const STELLAR_PUBLIC_CONFIG = {
  network: 'PUBLIC',
  horizonUrl: 'https://horizon.stellar.org',
  rpcUrl: 'https://mainnet.sorobanrpc.com'
} as const;

