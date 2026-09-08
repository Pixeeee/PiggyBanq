import { cookies } from 'next/headers';

const DEMO_SESSION_COOKIE_NAME = 'piggybanq_demo_session';

function productionResponse() {
  return Response.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, { status: 404 });
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') return productionResponse();

  const cookieStore = await cookies();
  cookieStore.set(DEMO_SESSION_COOKIE_NAME, 'active', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 8
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  if (process.env.NODE_ENV === 'production') return productionResponse();

  const cookieStore = await cookies();
  cookieStore.set(DEMO_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 0
  });

  return Response.json({ ok: true });
}
