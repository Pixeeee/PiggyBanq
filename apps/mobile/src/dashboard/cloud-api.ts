import { Buffer } from 'buffer';
import { Networks } from '@stellar/stellar-sdk';
import { formatStellarAmount } from '@piggybanq/stellar-core/amounts';

export const MOBILE_API_URL = 'https://piggybanq-api.onrender.com';
export const WEB_APP_URL = 'https://piggy-banq-web.vercel.app';
export type Currency = 'PHP' | 'USD' | 'XLM' | 'USDC';
export type CloudProfile = { id: string; stellarPublicKey: string; username: string; displayName: string; bio: string; currency: Currency; visibility: 'PUBLIC' | 'WALLET_ADDRESS_ONLY' | 'PRIVATE' };
export type CloudPlan = { id: string; month: string; categories: Array<{ id: string; name: string; amountMinor: string; currency: Currency }> };
export type CloudPocket = { id: string; label: string; assetCode: 'XLM' | 'USDC' | 'USDT'; balanceMinor: string; pocketType: 'FLEXIBLE' | 'LOCKED_EARN'; status: string; maturesAt: string | null; events: Array<{ id: string; type: string; amountMinor: string }> };
export type CloudChallenge = { challengeId: string; publicKey: string; message: string; expiresAt: string; purpose: 'LOGIN' | 'SIGN_UP'; username: string };
export type AllocationDraft = { category: string; amount: string; currency: Currency };
export type PocketDraft = { label: string; assetCode: CloudPocket['assetCode']; pocketType: CloudPocket['pocketType']; targetAmount?: string; amount?: string; lockDays?: 7 | 30 | 90; apyBps?: number };
let pendingLogout: Promise<void> | undefined;

export class CloudApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export function cloudAmount(minor: string) {
  if (!/^-?\d{1,30}$/.test(minor)) throw new Error('The server returned an invalid amount.');
  const value = BigInt(minor);
  return `${value < 0n ? '-' : ''}${formatStellarAmount(value < 0n ? -value : value, 2)}`;
}

export function validateCloudChallenge(challenge: CloudChallenge, publicKey: string, now = Date.now()) {
  const lines = challenge.message.split('\n');
  const fields = (name: string) => lines.filter(line => line.startsWith(`${name}: `)).map(line => line.slice(name.length + 2));
  const expected = (name: string, value: string) => fields(name).length === 1 && fields(name)[0] === value;
  const expiry = Date.parse(challenge.expiresAt);
  if (challenge.publicKey !== publicKey || !challenge.challengeId || challenge.challengeId.length > 200 ||
      challenge.message.length > 3000 || lines[0] !== `${WEB_APP_URL.slice('https://'.length)} wants you to sign in with your Stellar account:` ||
      lines[1] !== publicKey || !expected('URI', WEB_APP_URL) || !expected('Version', '1') ||
      !expected('Stellar Network', 'TESTNET') || !expected('Network Passphrase', Networks.TESTNET) ||
      !expected('Application', 'PiggyBanq') || !expected('Purpose', challenge.purpose === 'LOGIN' ? 'Login authentication' : 'Sign-up authentication') ||
      !expected('Expiration Time', challenge.expiresAt) || fields('Nonce').length !== 1 || !/^[A-Za-z0-9_-]{32}$/.test(fields('Nonce')[0]) ||
      fields('Issued At').length !== 1 || !Number.isFinite(Date.parse(fields('Issued At')[0])) ||
      Date.parse(fields('Issued At')[0]) > now + 30000 || expiry <= now || expiry > now + 900000) {
    throw new Error('Authentication challenge did not match PiggyBanq Testnet. Nothing was signed.');
  }
}

// A new approved login is required whenever this client is closed (including wallet lock).
export function createMobileCloudClient(options: { fetch?: typeof globalThis.fetch; now?: () => number } = {}) {
  const fetch = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  let closed = false;
  let authenticatedKey = '';
  let requiresRefresh = false;
  const controllers = new Set<AbortController>();

  async function request<T>(path: string, method = 'GET', body?: unknown, publicRequest = false): Promise<T> {
    if (closed) throw new Error('Wallet locked. Unlock and connect again.');
    if (!publicRequest && !authenticatedKey) throw new CloudApiError('Connect your web account first.', 401);
    const changingData = !publicRequest && method !== 'GET';
    if (changingData && requiresRefresh) throw new Error('Refresh shared data before making another change. The previous change may already be saved.');
    if (changingData) requiresRefresh = true;
    const controller = new AbortController();
    controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 75000);
    try {
      const response = await fetch(`${MOBILE_API_URL}${path}`, {
        method, credentials: 'include', signal: controller.signal,
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      if (closed) throw new Error('Wallet locked. Request result discarded.');
      const data = await response.json();
      if (!response.ok) {
        if (changingData && response.status >= 400 && response.status < 500) requiresRefresh = false;
        if (response.status === 401 || response.status === 403) authenticatedKey = '';
        throw new CloudApiError(data?.error?.message ?? `Request failed (HTTP ${response.status}).`, response.status);
      }
      return data as T;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('Connection interrupted. Refresh before retrying a change; it may already have been saved.');
      if (error instanceof CloudApiError) throw error;
      throw new Error('The server response could not be verified. Refresh before retrying a change; it may already have been saved.');
    } finally { clearTimeout(timeout); controllers.delete(controller); }
  }

  return {
    async prepareLogin(publicKey: string, username: string): Promise<CloudChallenge> {
      // Native cookies are shared: finish an old logout before issuing a new session.
      await pendingLogout;
      const { StrKey } = await import('@stellar/stellar-sdk');
      if (!StrKey.isValidEd25519PublicKey(publicKey)) throw new Error('Invalid Stellar public key.');
      const status = await request<{ registered: boolean }>('/api/auth/stellar/status', 'POST', { publicKey }, true);
      const purpose: CloudChallenge['purpose'] = status.registered ? 'LOGIN' : 'SIGN_UP';
      if (purpose === 'SIGN_UP' && !/^[a-z0-9_]{3,24}$/.test(username)) throw new Error('Choose a username with 3–24 lowercase letters, numbers or underscores.');
      const response = await request<Omit<CloudChallenge, 'purpose' | 'username'>>('/api/auth/stellar/challenge', 'POST', { publicKey, purpose, network: 'TESTNET' }, true);
      const challenge = { ...response, purpose, username };
      validateCloudChallenge(challenge, publicKey, now());
      return challenge;
    },
    async approveLogin(challenge: CloudChallenge, wallet: { publicKey: string; secretKey: string }, isUnlocked: () => boolean) {
      if (!isUnlocked() || closed) throw new Error('Unlock your wallet before connecting.');
      validateCloudChallenge(challenge, wallet.publicKey, now());
      const { Keypair } = await import('@stellar/stellar-sdk');
      if (!isUnlocked() || closed) throw new Error('Wallet locked before signing.');
      const keypair = Keypair.fromSecret(wallet.secretKey);
      if (keypair.publicKey() !== wallet.publicKey) throw new Error('Wallet keys do not match.');
      const signature = Buffer.from(keypair.sign(Buffer.from(challenge.message, 'utf8'))).toString('base64');
      const result = await request<{ user: CloudProfile }>(`/api/auth/stellar/${challenge.purpose === 'LOGIN' ? 'login' : 'signup'}`, 'POST', {
        challengeId: challenge.challengeId, publicKey: wallet.publicKey, signature,
        ...(challenge.purpose === 'SIGN_UP' ? { username: challenge.username } : {})
      }, true);
      if (!isUnlocked() || closed || result.user.stellarPublicKey !== wallet.publicKey) throw new Error('Account changed while connecting. Unlock and try again.');
      authenticatedKey = wallet.publicKey;
      const { user } = await request<{ user: CloudProfile }>('/api/auth/me');
      if (user.stellarPublicKey !== wallet.publicKey) { authenticatedKey = ''; throw new Error('Server session belongs to a different wallet.'); }
      return user;
    },
    async snapshot() {
      const [profile, plans, pockets] = await Promise.all([
        request<{ profile: CloudProfile }>('/profile/me'), request<{ plans: CloudPlan[] }>('/budget/plans'), request<{ pockets: CloudPocket[] }>('/savings/pockets')
      ]);
      if (profile.profile.stellarPublicKey !== authenticatedKey) { authenticatedKey = ''; throw new CloudApiError('Account changed. Connect again.', 401); }
      requiresRefresh = false;
      return { profile: profile.profile, plans: plans.plans, pockets: pockets.pockets };
    },
    allocation: (draft: AllocationDraft, id?: string) => request(`/budget/allocations${id ? `/${encodeURIComponent(id)}` : ''}`, id ? 'PATCH' : 'POST', draft),
    deleteAllocation: (id: string) => request(`/budget/allocations/${encodeURIComponent(id)}`, 'DELETE'),
    reorder: (id: string, orderedCategoryIds: string[]) => request(`/budget/plans/${encodeURIComponent(id)}/categories/order`, 'PATCH', { orderedCategoryIds }),
    updateProfile: (draft: Pick<CloudProfile, 'displayName' | 'bio' | 'currency' | 'visibility'>) => request('/profile/me', 'PATCH', draft),
    createPocket: (draft: PocketDraft) => request('/savings/pockets', 'POST', draft),
    pocketEvent: (id: string, type: 'POCKET_CREDIT' | 'POCKET_DEBIT', amount: string) => request(`/savings/pockets/${encodeURIComponent(id)}/events`, 'POST', { type, amount }),
    maturePocket: (id: string) => request(`/savings/pockets/${encodeURIComponent(id)}/mark-matured`, 'POST'),
    withdrawPocket: (id: string) => request(`/savings/pockets/${encodeURIComponent(id)}/withdraw`, 'POST'),
    async close() {
      if (closed) return;
      closed = true;
      const wasAuthenticated = Boolean(authenticatedKey);
      authenticatedKey = '';
      controllers.forEach(controller => controller.abort());
      if (wasAuthenticated) {
        const cleanup = (async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          try { await fetch(`${MOBILE_API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include', signal: controller.signal }); }
          catch { /* Local access is locked even if the server cannot be reached. */ }
          finally { clearTimeout(timeout); }
        })();
        pendingLogout = cleanup;
        await cleanup;
        if (pendingLogout === cleanup) pendingLogout = undefined;
      }
    }
  };
}
export type MobileCloudClient = ReturnType<typeof createMobileCloudClient>;
