export type ProviderId = 'privy' | 'web3auth';

export type SocialIdentityProvider = {
  id: 'privy' | 'web3auth';
  label: string;
  methods: string;
};

export type WalletSetupMode = 'create' | 'import';
