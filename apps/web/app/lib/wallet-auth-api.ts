'use client';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4000'
).replace(/\/+$/, '');

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

export async function createLocalDemoSession() {
  return sameOriginRequest<{ ok: true }>('/api/demo-session', 'POST');
}

export async function clearLocalDemoSession() {
  return sameOriginRequest<{ ok: true }>('/api/demo-session', 'DELETE');
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

export async function updateBudgetAllocation(
  id: string,
  input: Partial<{ category: string; amount: string; currency: 'PHP' | 'USD' | 'XLM' | 'USDC' }>
) {
  return apiRequest<{ plan: BudgetPlan }>(`/budget/allocations/${id}`, { method: 'PATCH', body: input });
}

export async function deleteBudgetAllocation(id: string) {
  return apiRequest<{ plan: BudgetPlan }>(`/budget/allocations/${id}`, { method: 'DELETE' });
}

export async function reorderBudgetAllocations(planId: string, orderedCategoryIds: string[]) {
  return apiRequest<{ plan: BudgetPlan }>(`/budget/plans/${planId}/categories/order`, {
    method: 'PATCH',
    body: { orderedCategoryIds }
  });
}

export async function getSavingsPockets() {
  return apiRequest<{ pockets: SavingsPocket[] }>('/savings/pockets', { method: 'GET' });
}

export async function createSavingsPocket(input: {
  label: string;
  assetCode: 'XLM' | 'USDT';
  targetAmount?: string;
  pocketType?: 'FLEXIBLE' | 'LOCKED_EARN';
  amount?: string;
  lockDays?: 7 | 30 | 90;
  apyBps?: number;
}) {
  return apiRequest<{ pocket: SavingsPocket }>('/savings/pockets', { method: 'POST', body: input });
}

export async function createSavingsPocketEvent(
  id: string,
  input: { type: 'POCKET_CREDIT' | 'POCKET_DEBIT' | 'DEPOSIT_CONFIRMED' | 'WITHDRAWAL_PLANNED'; amount: string; note?: string }
) {
  return apiRequest<{ pocket: SavingsPocket }>(`/savings/pockets/${id}/events`, { method: 'POST', body: input });
}

export async function previewLockedEarning(input: { amount: string; lockDays: 7 | 30 | 90; apyBps: number }) {
  return apiRequest<{
    preview: {
      principalMinor: string;
      estimatedInterestMinor: string;
      totalAtMaturityMinor: string;
      maturesAt: string;
    };
  }>('/savings/pockets/earning-preview', { method: 'POST', body: input });
}

export async function markSavingsPocketMatured(id: string) {
  return apiRequest<{ pocket: SavingsPocket }>(`/savings/pockets/${id}/mark-matured`, { method: 'POST' });
}

export async function withdrawSavingsPocket(id: string) {
  return apiRequest<{ pocket: SavingsPocket }>(`/savings/pockets/${id}/withdraw`, { method: 'POST' });
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
  categories: Array<{ id: string; name: string; amountMinor: string; currency: string; sortOrder: number }>;
};

export type SavingsPocket = {
  id: string;
  label: string;
  assetCode: 'XLM' | 'USDT';
  targetMinor: string | null;
  pocketType: 'FLEXIBLE' | 'LOCKED_EARN';
  status: 'active' | 'locked' | 'matured' | 'withdrawn';
  principalMinor: string | null;
  apyBps: number | null;
  lockDays: number | null;
  lockedAt: string | null;
  maturesAt: string | null;
  withdrawnAt: string | null;
  estimatedInterestMinor: string | null;
  totalAtMaturityMinor: string | null;
  balanceMinor: string;
  createdAt: string;
  events: Array<{
    id: string;
    type:
      | 'POCKET_CREATED'
      | 'POCKET_CREDIT'
      | 'POCKET_DEBIT'
      | 'DEPOSIT_PLANNED'
      | 'DEPOSIT_CONFIRMED'
      | 'LOCK_STARTED'
      | 'YIELD_ACCRUED'
      | 'WITHDRAWAL_PLANNED'
      | 'WITHDRAWAL_CONFIRMED';
    assetCode: string;
    amountMinor: string;
    metadata: unknown;
    createdAt: string;
  }>;
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

async function sameOriginRequest<T>(path: string, method: 'POST' | 'DELETE'): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'include'
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? 'Request failed.');
  }
  return payload as T;
}
