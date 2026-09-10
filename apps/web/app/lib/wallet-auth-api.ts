'use client';

import type { AgenticIntentDraft, AgenticIntentPreview, AgenticProviderReceipt } from '@piggybanq/types/agentic';
import type { StellarAccountSummary, StellarActivityView, StellarCapabilities, StellarIntentView, StellarOperationType } from '@piggybanq/types/stellar-transactions';

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
  try {
    return await apiRequest<{ plans: BudgetPlan[] }>('/budget/plans', { method: 'GET' });
  } catch (error) {
    return developmentFallback(error, () => ({ plans: readDemoBudgetPlans() }));
  }
}

export async function createBudgetAllocation(input: { category: string; amount: string; currency: 'PHP' | 'USD' | 'XLM' | 'USDC' }) {
  try {
    return await apiRequest<{ plan: BudgetPlan }>('/budget/allocations', { method: 'POST', body: input });
  } catch (error) {
    return developmentFallback(error, () => ({ plan: createDemoBudgetAllocation(input) }));
  }
}

export async function updateBudgetAllocation(
  id: string,
  input: Partial<{ category: string; amount: string; currency: 'PHP' | 'USD' | 'XLM' | 'USDC' }>
) {
  try {
    return await apiRequest<{ plan: BudgetPlan }>(`/budget/allocations/${id}`, { method: 'PATCH', body: input });
  } catch (error) {
    return developmentFallback(error, () => ({ plan: updateDemoBudgetAllocation(id, input) }));
  }
}

export async function deleteBudgetAllocation(id: string) {
  try {
    return await apiRequest<{ plan: BudgetPlan }>(`/budget/allocations/${id}`, { method: 'DELETE' });
  } catch (error) {
    return developmentFallback(error, () => ({ plan: deleteDemoBudgetAllocation(id) }));
  }
}

export async function reorderBudgetAllocations(planId: string, orderedCategoryIds: string[]) {
  try {
    return await apiRequest<{ plan: BudgetPlan }>(`/budget/plans/${planId}/categories/order`, {
      method: 'PATCH', body: { orderedCategoryIds }
    });
  } catch (error) {
    return developmentFallback(error, () => ({ plan: reorderDemoBudgetAllocations(planId, orderedCategoryIds) }));
  }
}

export async function getSavingsPockets() {
  try {
    return await apiRequest<{ pockets: SavingsPocket[] }>('/savings/pockets', { method: 'GET' });
  } catch (error) {
    return developmentFallback(error, () => ({ pockets: readDemoSavingsPockets() }));
  }
}

export async function createSavingsPocket(input: {
  label: string;
  assetCode: 'XLM' | 'USDC' | 'USDT';
  targetAmount?: string;
  pocketType?: 'FLEXIBLE' | 'LOCKED_EARN';
  amount?: string;
  lockDays?: 7 | 30 | 90;
  apyBps?: number;
}) {
  try {
    return await apiRequest<{ pocket: SavingsPocket }>('/savings/pockets', { method: 'POST', body: input });
  } catch (error) {
    return developmentFallback(error, () => ({ pocket: createDemoSavingsPocket(input) }));
  }
}

export async function createSavingsPocketEvent(
  id: string,
  input: { type: 'POCKET_CREDIT' | 'POCKET_DEBIT' | 'DEPOSIT_CONFIRMED' | 'WITHDRAWAL_PLANNED'; amount: string; note?: string }
) {
  try {
    return await apiRequest<{ pocket: SavingsPocket }>(`/savings/pockets/${id}/events`, { method: 'POST', body: input });
  } catch (error) {
    return developmentFallback(error, () => ({ pocket: createDemoSavingsEvent(id, input) }));
  }
}

export async function previewLockedEarning(input: { amount: string; lockDays: 7 | 30 | 90; apyBps: number }) {
  try {
    return await apiRequest<{ preview: EarningPreview }>('/savings/pockets/earning-preview', { method: 'POST', body: input });
  } catch (error) {
    return developmentFallback(error, () => ({ preview: createDemoEarningPreview(input) }));
  }
}

export async function markSavingsPocketMatured(id: string) {
  try {
    return await apiRequest<{ pocket: SavingsPocket }>(`/savings/pockets/${id}/mark-matured`, { method: 'POST' });
  } catch (error) {
    return developmentFallback(error, () => ({ pocket: updateDemoPocketStatus(id, 'matured') }));
  }
}

export async function withdrawSavingsPocket(id: string) {
  try {
    return await apiRequest<{ pocket: SavingsPocket }>(`/savings/pockets/${id}/withdraw`, { method: 'POST' });
  } catch (error) {
    return developmentFallback(error, () => ({ pocket: updateDemoPocketStatus(id, 'withdrawn') }));
  }
}

export async function getAgenticCapabilities() {
  return apiRequest<{ mode: 'SANDBOX'; capabilities: Array<Record<string, string>>; unavailableRoutes: string[] }>('/agentic/capabilities', { method: 'GET' });
}

export async function previewAgenticIntentApi(input: AgenticIntentDraft) {
  return apiRequest<{ intent: AgenticIntentPreview }>('/agentic/intents/preview', { method: 'POST', body: input });
}

export async function approveAgenticIntentApi(id: string) {
  return apiRequest<{ intent: AgenticIntentPreview }>(`/agentic/intents/${id}/approve`, { method: 'POST' });
}

export async function executeAgenticIntentApi(id: string) {
  return apiRequest<{ intent: AgenticIntentPreview; receipt: AgenticProviderReceipt }>(`/agentic/intents/${id}/execute`, { method: 'POST' });
}

export async function listAgenticIntentsApi() {
  return apiRequest<{ intents: AgenticIntentPreview[]; receipts: AgenticProviderReceipt[] }>('/agentic/intents', { method: 'GET' });
}

export async function getStellarCapabilities() {
  return apiRequest<StellarCapabilities>('/api/stellar/capabilities', { method: 'GET', timeoutMs: 12_000 });
}

export async function getStellarSummary() {
  return apiRequest<StellarAccountSummary>('/api/stellar/me/summary', { method: 'GET', timeoutMs: 15_000 });
}

export async function getStellarActivity(limit = 20) {
  return apiRequest<{ network: 'TESTNET'; records: StellarActivityView[]; refreshedAt: string }>(`/api/stellar/me/activity?limit=${Math.max(1, Math.min(50, Math.trunc(limit)))}`, { method: 'GET', timeoutMs: 15_000 });
}

export type StellarQuoteInput =
  | { operationType: Extract<StellarOperationType, 'PAYMENT'>; destination: string; assetCode: 'XLM' | 'USDC'; amount: string; memo?: string }
  | { operationType: Extract<StellarOperationType, 'CHANGE_TRUST'>; assetCode: 'USDC'; limit: string; memo?: string }
  | { operationType: Extract<StellarOperationType, 'PATH_PAYMENT_STRICT_SEND'>; sendAssetCode: 'XLM' | 'USDC'; sendAmount: string; destinationAssetCode: 'XLM' | 'USDC'; slippageBps: number; memo?: string };

export async function quoteStellarTransaction(input: StellarQuoteInput, idempotencyKey: string) {
  return apiRequest<StellarIntentView>('/api/stellar/intents/quote', {
    method: 'POST', body: input, headers: { 'Idempotency-Key': idempotencyKey }, timeoutMs: 20_000
  });
}

export async function submitStellarTransaction(intentId: string, signedXdr: string) {
  return apiRequest<StellarIntentView>(`/api/stellar/intents/${encodeURIComponent(intentId)}/submit`, {
    method: 'POST', body: { signedXdr }, timeoutMs: 75_000
  });
}

export async function getStellarIntent(intentId: string) {
  return apiRequest<StellarIntentView>(`/api/stellar/intents/${encodeURIComponent(intentId)}`, { method: 'GET', timeoutMs: 15_000 });
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

type EarningPreview = {
  principalMinor: string;
  estimatedInterestMinor: string;
  totalAtMaturityMinor: string;
  maturesAt: string;
};

export type SavingsPocket = {
  id: string;
  label: string;
  assetCode: 'XLM' | 'USDC' | 'USDT';
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

export class ApiRequestError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number, public readonly resultCodes: readonly string[] = []) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function apiRequest<T>(path: string, options: { method: string; body?: unknown; headers?: Record<string, string>; timeoutMs?: number }): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method,
      credentials: 'include',
      signal: controller.signal,
      headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiRequestError(payload?.error?.code ?? 'REQUEST_FAILED', payload?.error?.message ?? 'Request failed.', response.status, payload?.error?.resultCodes ?? []);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new ApiRequestError('REQUEST_TIMEOUT', 'The request timed out. Its transaction state has not been assumed.', 408);
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
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

const DEMO_BUDGET_KEY = 'piggybanq-budget-sandbox-v1';
const DEMO_POCKETS_KEY = 'piggybanq-pockets-sandbox-v1';

function developmentFallback<T>(error: unknown, fallback: () => T): T {
  if (process.env.NODE_ENV === 'production' || !(error instanceof TypeError)) throw error;
  return fallback();
}

function readDemoBudgetPlans(): BudgetPlan[] {
  return readLocalArray<BudgetPlan>(DEMO_BUDGET_KEY);
}

function writeDemoBudgetPlans(plans: BudgetPlan[]) {
  writeLocalArray(DEMO_BUDGET_KEY, plans);
}

function createDemoBudgetAllocation(input: { category: string; amount: string; currency: 'PHP' | 'USD' | 'XLM' | 'USDC' }) {
  const plans = readDemoBudgetPlans();
  const month = new Date().toISOString().slice(0, 7);
  const existing = plans.find((plan) => plan.month === month);
  const category = { id: makeDemoId('allocation'), name: input.category.trim(), amountMinor: decimalToDemoMinor(input.amount), currency: input.currency, sortOrder: existing?.categories.length ?? 0 };
  const plan: BudgetPlan = existing
    ? recalculateDemoPlan({ ...existing, displayCurrency: input.currency, categories: [...existing.categories, category] })
    : { id: makeDemoId('plan'), month, displayCurrency: input.currency, totalMinor: category.amountMinor, createdAt: new Date().toISOString(), categories: [category] };
  writeDemoBudgetPlans([plan, ...plans.filter((item) => item.id !== plan.id)]);
  return plan;
}

function updateDemoBudgetAllocation(id: string, input: Partial<{ category: string; amount: string; currency: 'PHP' | 'USD' | 'XLM' | 'USDC' }>) {
  const plans = readDemoBudgetPlans();
  const owner = plans.find((plan) => plan.categories.some((category) => category.id === id));
  if (!owner) throw new Error('Local allocation not found. Create it again.');
  const plan = recalculateDemoPlan({
    ...owner,
    categories: owner.categories.map((category) => category.id === id ? {
      ...category,
      name: input.category?.trim() || category.name,
      amountMinor: input.amount ? decimalToDemoMinor(input.amount) : category.amountMinor,
      currency: input.currency ?? category.currency
    } : category)
  });
  writeDemoBudgetPlans(plans.map((item) => item.id === plan.id ? plan : item));
  return plan;
}

function deleteDemoBudgetAllocation(id: string) {
  const plans = readDemoBudgetPlans();
  const owner = plans.find((plan) => plan.categories.some((category) => category.id === id));
  if (!owner) throw new Error('Local allocation not found.');
  const plan = recalculateDemoPlan({ ...owner, categories: owner.categories.filter((category) => category.id !== id).map((category, sortOrder) => ({ ...category, sortOrder })) });
  writeDemoBudgetPlans(plans.map((item) => item.id === plan.id ? plan : item));
  return plan;
}

function reorderDemoBudgetAllocations(planId: string, orderedCategoryIds: string[]) {
  const plans = readDemoBudgetPlans();
  const owner = plans.find((plan) => plan.id === planId);
  if (!owner || owner.categories.length !== orderedCategoryIds.length) throw new Error('Local allocation order is incomplete.');
  const byId = new Map(owner.categories.map((category) => [category.id, category]));
  const categories = orderedCategoryIds.map((id, sortOrder) => {
    const category = byId.get(id);
    if (!category) throw new Error('Local allocation order contains an unknown item.');
    return { ...category, sortOrder };
  });
  const plan = recalculateDemoPlan({ ...owner, categories });
  writeDemoBudgetPlans(plans.map((item) => item.id === plan.id ? plan : item));
  return plan;
}

function recalculateDemoPlan(plan: BudgetPlan): BudgetPlan {
  return { ...plan, totalMinor: plan.categories.reduce((sum, category) => sum + Number(category.amountMinor), 0).toString() };
}

function readDemoSavingsPockets(): SavingsPocket[] {
  return readLocalArray<SavingsPocket>(DEMO_POCKETS_KEY);
}

function writeDemoSavingsPockets(pockets: SavingsPocket[]) {
  writeLocalArray(DEMO_POCKETS_KEY, pockets);
}

function createDemoSavingsPocket(input: {
  label: string;
  assetCode: 'XLM' | 'USDC' | 'USDT';
  targetAmount?: string;
  pocketType?: 'FLEXIBLE' | 'LOCKED_EARN';
  amount?: string;
  lockDays?: 7 | 30 | 90;
  apyBps?: number;
}) {
  const now = new Date();
  const locked = input.pocketType === 'LOCKED_EARN';
  const principalMinor = locked ? decimalToDemoMinor(input.amount ?? '0') : null;
  const preview = locked ? createDemoEarningPreview({ amount: input.amount ?? '0', lockDays: input.lockDays ?? 30, apyBps: input.apyBps ?? 0 }) : null;
  const pocket: SavingsPocket = {
    id: makeDemoId('pocket'), label: input.label.trim(), assetCode: input.assetCode,
    targetMinor: input.targetAmount ? decimalToDemoMinor(input.targetAmount) : null,
    pocketType: input.pocketType ?? 'FLEXIBLE', status: locked ? 'locked' : 'active',
    principalMinor, apyBps: input.apyBps ?? null, lockDays: input.lockDays ?? null,
    lockedAt: locked ? now.toISOString() : null, maturesAt: preview?.maturesAt ?? null, withdrawnAt: null,
    estimatedInterestMinor: preview?.estimatedInterestMinor ?? null, totalAtMaturityMinor: preview?.totalAtMaturityMinor ?? null,
    balanceMinor: principalMinor ?? '0', createdAt: now.toISOString(),
    events: [{ id: makeDemoId('event'), type: 'POCKET_CREATED', assetCode: input.assetCode, amountMinor: '0', metadata: { source: 'local-sandbox' }, createdAt: now.toISOString() }]
  };
  const pockets = [pocket, ...readDemoSavingsPockets()];
  writeDemoSavingsPockets(pockets);
  return pocket;
}

function createDemoSavingsEvent(id: string, input: { type: 'POCKET_CREDIT' | 'POCKET_DEBIT' | 'DEPOSIT_CONFIRMED' | 'WITHDRAWAL_PLANNED'; amount: string; note?: string }) {
  const pockets = readDemoSavingsPockets();
  const pocket = pockets.find((item) => item.id === id);
  if (!pocket) throw new Error('Local stake position not found.');
  const delta = Number(decimalToDemoMinor(input.amount));
  const debit = input.type === 'POCKET_DEBIT' || input.type === 'WITHDRAWAL_PLANNED';
  const nextBalance = Math.max(0, Number(pocket.balanceMinor) + (debit ? -delta : delta));
  const updated: SavingsPocket = { ...pocket, balanceMinor: nextBalance.toString(), events: [{ id: makeDemoId('event'), type: input.type, assetCode: pocket.assetCode, amountMinor: delta.toString(), metadata: { note: input.note ?? '', source: 'local-sandbox' }, createdAt: new Date().toISOString() }, ...pocket.events] };
  writeDemoSavingsPockets(pockets.map((item) => item.id === id ? updated : item));
  return updated;
}

function updateDemoPocketStatus(id: string, status: 'matured' | 'withdrawn') {
  const pockets = readDemoSavingsPockets();
  const pocket = pockets.find((item) => item.id === id);
  if (!pocket) throw new Error('Local stake position not found.');
  if (status === 'matured' && pocket.maturesAt && new Date(pocket.maturesAt) > new Date()) return pocket;
  if (status === 'withdrawn' && pocket.status !== 'matured') throw new Error('Stake withdrawal is blocked until maturity.');
  const updated = { ...pocket, status, withdrawnAt: status === 'withdrawn' ? new Date().toISOString() : pocket.withdrawnAt } as SavingsPocket;
  writeDemoSavingsPockets(pockets.map((item) => item.id === id ? updated : item));
  return updated;
}

function createDemoEarningPreview(input: { amount: string; lockDays: 7 | 30 | 90; apyBps: number }): EarningPreview {
  const principal = Number(decimalToDemoMinor(input.amount));
  if (principal <= 0) throw new Error('Stake amount must be greater than zero.');
  const interest = Math.floor((principal * input.apyBps * input.lockDays) / (10_000 * 365));
  const maturesAt = new Date();
  maturesAt.setUTCDate(maturesAt.getUTCDate() + input.lockDays);
  return { principalMinor: principal.toString(), estimatedInterestMinor: interest.toString(), totalAtMaturityMinor: (principal + interest).toString(), maturesAt: maturesAt.toISOString() };
}

function decimalToDemoMinor(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Enter a valid amount with up to two decimals.');
  const [whole, fraction = ''] = value.split('.');
  return (Number(whole) * 100 + Number(fraction.padEnd(2, '0'))).toString();
}

function readLocalArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalArray<T>(key: string, value: T[]) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value));
}

function makeDemoId(prefix: string) {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}
