import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveApiBaseUrl } from '../../../../api-config.ts';

const AUTH_COOKIE_NAME = process.env.AUTH_SESSION_COOKIE_NAME ?? 'piggybanq_wallet_session';
const DEMO_SESSION_COOKIE_NAME = 'piggybanq_demo_session';
const DEMO_USER: AuthUser = {
  id: 'local-demo-user',
  username: 'demo_saver',
  stellarPublicKey: 'GB3JDWCQJCWMJ3IILWIGDTQJJC5567PGVEVXSCVPEQOTDN64VJBDQBYX',
  displayName: 'Demo Saver',
  email: null,
  role: 'USER',
  status: 'ACTIVE',
  lastLoginAt: null
};
const API_BASE_URL = resolveApiBaseUrl();

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

export async function requireWalletSession(): Promise<AuthUser> {
  const cookieStore = await cookies();
  const demoSession = cookieStore.get(DEMO_SESSION_COOKIE_NAME)?.value;
  if (process.env.NODE_ENV !== 'production' && demoSession === 'active') return DEMO_USER;

  const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!sessionCookie) redirect('/login');

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
      headers: { cookie: `${AUTH_COOKIE_NAME}=${sessionCookie}` }
    });
  } catch {
    throw new Error('Session service is unavailable. Your wallet session has been preserved. Try again.');
  }
  if (response.status === 401 || response.status === 403) redirect('/login');
  if (!response.ok) throw new Error('Session validation is temporarily unavailable. Try again.');
  const payload = (await response.json()) as { user?: AuthUser };
  if (!payload.user) throw new Error('Session service returned an invalid response. Try again.');
  return payload.user;
}
