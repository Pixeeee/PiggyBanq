import { requestTestnetXlm } from '@piggybanq/stellar-core/testnet-funding';
import { requireWalletSession } from '../../../(app)/dashboard/_lib/session';

export const maxDuration = 60;

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  let sameOrigin = false;
  try {
    const origin = new URL(request.headers.get('origin') ?? '');
    sameOrigin = origin.host === request.headers.get('host') && (origin.protocol === 'https:' || ['localhost','127.0.0.1'].includes(origin.hostname));
  } catch { /* Invalid or absent Origin is rejected. */ }
  if (!sameOrigin) return Response.json({ error: 'A same-origin request is required.' }, { status: 403, headers });
  // The destination comes exclusively from the authenticated session, never request data.
  const user = await requireWalletSession();
  if (!user.stellarPublicKey) return Response.json({ error: 'Link a Stellar Testnet wallet first.' }, { status: 400, headers });
  try { return Response.json(await requestTestnetXlm(user.stellarPublicKey), { headers }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Testnet funding is unavailable. Try again later.' }, { status: 503, headers }); }
}
