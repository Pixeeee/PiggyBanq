'use client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4000';

export type AuthPurpose = 'SIGN_UP' | 'LOGIN';
export type StellarAuthNetwork = 'TESTNET' | 'PUBLIC';

export async function getWalletStatus(input: { publicKey?: string; username?: string }) {
  return apiRequest<{
    publicKey: string | null;
    username: string | null;
    registered: boolean;
    usernameAvailable: boolean | null;
  }>('/api/auth/stellar/status', {
    method: 'POST',
    body: input
  });
}

export async function createWalletChallenge(publicKey: string, purpose: AuthPurpose, network: StellarAuthNetwork = 'TESTNET') {
  return apiRequest<{ challengeId: string; publicKey: string; message: string; expiresAt: string }>('/api/auth/stellar/challenge', {
    method: 'POST',
    body: { publicKey, network, purpose }
  });
}

export async function completeWalletSignup(input: {
  challengeId: string;
  publicKey: string;
  signature: string;
  username: string;
  displayName: string;
  email?: string;
}) {
  return apiRequest<{ user: AuthUser }>('/api/auth/stellar/signup', { method: 'POST', body: input });
}

export async function completeWalletLogin(input: {
  challengeId: string;
  publicKey: string;
  signature: string;
}) {
  return apiRequest<{ user: AuthUser }>('/api/auth/stellar/login', { method: 'POST', body: input });
}

export async function getCurrentUser() {
  return apiRequest<{ user: AuthUser }>('/api/auth/me', { method: 'GET' });
}

export async function logout() {
  return apiRequest<{ ok: true }>('/api/auth/logout', { method: 'POST' });
}

export async function getProfile() {
  return apiRequest<{ profile: UserProfile }>('/profile/me', { method: 'GET' });
}

export async function updateProfile(input: {
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  currency: 'PHP' | 'USD' | 'XLM' | 'USDC';
  visibility: 'PUBLIC' | 'WALLET_ADDRESS_ONLY' | 'PRIVATE';
}) {
  return apiRequest<{ profile: UserProfile }>('/profile/me', { method: 'PATCH', body: input });
}

export async function getBudgetPlans() {
  return apiRequest<{ plans: BudgetPlan[] }>('/budget/plans', { method: 'GET' });
}

export async function createBudgetAllocation(input: { category: string; amount: string; currency: 'PHP' | 'USD' | 'XLM' | 'USDC' }) {
  return apiRequest<{ plan: BudgetPlan }>('/budget/allocations', { method: 'POST', body: input });
}

export async function getCommunity() {
  return apiRequest<CommunitySnapshot>('/social/community', { method: 'GET' });
}

export async function createReliefPost(input: {
  description: string;
  locationTag?: string;
  targetAmount?: string;
  assetCode: 'PHP' | 'USD' | 'XLM' | 'USDC';
  photoUrl?: string;
}) {
  return apiRequest<{ reliefPost: ReliefPost }>('/social/relief-posts', { method: 'POST', body: input });
}

export async function createReliefPledge(id: string, input: { amount: string; assetCode: 'PHP' | 'USD' | 'XLM' | 'USDC' }) {
  return apiRequest<{ reliefPost: ReliefPost }>(`/social/relief-posts/${id}/pledges`, { method: 'POST', body: input });
}

export async function createDiscussionPost(input: { groupId: string; body: string }) {
  return apiRequest<{ discussionPost: DiscussionPost }>('/social/posts', { method: 'POST', body: input });
}

export async function createChatMessage(input: { channel: 'GLOBAL' | 'PRIVATE'; body: string }) {
  return apiRequest<{ message: ChatMessage }>('/social/messages', { method: 'POST', body: input });
}

export type AuthUser = {
  id: string;
  username: string | null;
  stellarPublicKey: string | null;
  displayName: string;
  email: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
};

export type UserProfile = AuthUser & {
  bio: string;
  avatarUrl: string;
  coverPhotoUrl: string;
  currency: string;
  visibility: string;
};

export type BudgetPlan = {
  id: string;
  month: string;
  displayCurrency: string;
  totalMinor: string;
  createdAt: string;
  categories: Array<{ id: string; name: string; amountMinor: string; currency: string }>;
};

export type CommunityUser = {
  id: string;
  username: string | null;
  displayName: string;
  wallet: string;
  avatarUrl: string;
};

export type CommunityGroup = {
  id: string;
  name: string;
  description: string;
};

export type ReliefPost = {
  id: string;
  description: string;
  photoUrl: string;
  locationTag: string;
  targetAmountMinor: string;
  assetCode: string;
  createdAt: string;
  author: CommunityUser;
  pledgeTotalMinor: string;
  pledgeCount: number;
};

export type DiscussionPost = {
  id: string;
  body: string;
  createdAt: string;
  author: CommunityUser;
  group: { id: string; name: string } | null;
  commentCount: number;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  channel: string;
  sender: CommunityUser;
};

export type CommunitySnapshot = {
  viewer: CommunityUser;
  groups: CommunityGroup[];
  reliefPosts: ReliefPost[];
  discussionPosts: DiscussionPost[];
  messages: {
    global: ChatMessage[];
    private: ChatMessage[];
  };
};

async function apiRequest<T>(path: string, options: { method: string; body?: unknown }): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method,
    credentials: 'include',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? 'Request failed.');
  }
  return payload as T;
}
