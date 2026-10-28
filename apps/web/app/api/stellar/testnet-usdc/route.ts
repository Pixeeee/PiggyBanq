import { getTestnetUsdcStatus } from '@piggybanq/stellar-core/testnet-usdc';
import { requireWalletSession } from '../../../(app)/dashboard/_lib/session';

export async function GET() {
  const user = await requireWalletSession();
  const headers = { 'Cache-Control': 'no-store' };
  if (!user.stellarPublicKey) return Response.json({ error: 'Link a Stellar Testnet wallet first.' }, { status: 400, headers });
  try { return Response.json(await getTestnetUsdcStatus(user.stellarPublicKey),{headers}); }
  catch { return Response.json({ error: 'Stellar Testnet USDC status is unavailable. Try again later.' },{status:503,headers}); }
}
