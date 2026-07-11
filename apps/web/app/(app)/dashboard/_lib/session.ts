import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const AUTH_COOKIE_NAME = process.env.AUTH_SESSION_COOKIE_NAME ?? 'piggybanq_wallet_session';
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4000'
).replace(/\/+$/, '');

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
  const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!sessionCookie) redirect('/login');

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      cache: 'no-store',
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${sessionCookie}`
      }
    });
    if (!response.ok) redirect('/login');
    const payload = (await response.json()) as { user?: AuthUser };
    if (!payload.user) redirect('/login');
    return payload.user;
  } catch {
    redirect('/login');
  }
}
