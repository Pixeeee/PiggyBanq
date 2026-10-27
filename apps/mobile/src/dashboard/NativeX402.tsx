import { useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';
import { assertX402Requirements, signApprovedX402Payment, type X402Intent } from '@piggybanq/stellar-core/x402';
import { formatStellarAmount } from '@piggybanq/stellar-core/amounts';
import { useMobileSession } from '../auth/session';
import { Body, Button, Card, Field, Heading } from '../ui/banking';
import type { createMobileCloudClient } from './cloud-api';

export function NativeX402({ client }: { client: ReturnType<typeof createMobileCloudClient> }) {
  const session = useMobileSession();
  const wallet = session.wallet;
  const [intent, setIntent] = useState<X402Intent | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('Purchase one test savings insight with explicit approval.');
  const [insight, setInsight] = useState<{ title: string; suggestion: string }>();
  const alive = useRef(true);
  const working = useRef(false);
  const current = useRef(wallet);
  current.current = wallet;
  const storage = `piggybanq.x402.pending.${wallet?.publicKey}`;
  const active = () => alive.current && AppState.currentState === 'active' && Boolean(wallet && current.current?.publicKey === wallet.publicKey);

  function accept(next: X402Intent) {
    assertX402Requirements(next.requirements);
    if (next.payer !== wallet?.publicKey) throw new Error('Payment belongs to another wallet.');
    if (active()) setIntent(next);
  }
  async function run(action: () => Promise<void>) {
    if (working.current || !active()) return;
    working.current = true; setBusy(true);
    try { await action(); }
    catch (error) { if (alive.current) setMessage(error instanceof Error ? error.message : 'Payment unavailable. Refresh its status before retrying.'); }
    finally { working.current = false; if (alive.current) setBusy(false); }
  }
  async function refresh(id: string) {
    const result = await client.x402(`/intents/${id}`);
    accept(result.intent);
    if (result.intent.status === 'SUCCEEDED') {
      const paid = await client.x402(`/test/insight/${id}`);
      accept(paid.intent);
      if (!paid.intent.receipt?.verified || !/^[a-f0-9]{64}$/.test(paid.intent.receipt.transaction)
        || paid.intent.receipt.network !== 'stellar:testnet' || !paid.insight) throw new Error('No verified Testnet receipt was returned.');
      if (active()) { setInsight(paid.insight); setMessage('Payment verified on Stellar Testnet. Result recovered without another payment.'); }
    } else if (active()) setMessage(`Payment status: ${result.intent.status}. Refresh pending payments; do not pay again.`);
  }
  useEffect(() => {
    alive.current = true;
    void run(async () => {
      const id = await AsyncStorage.getItem(storage);
      if (alive.current) { setSavedId(id); setRecoveryReady(true); }
      if (id) { if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw new Error('Saved payment is invalid. It was preserved for recovery.'); await refresh(id); }
    });
    return () => { alive.current = false; };
  }, [storage]);

  return <>
    <Heading title="Paid Testnet API" subtitle="Real x402 payment · Testnet XLM has no monetary value." />
    <Body>{message}</Body>
    <Button label="Preview test API payment" disabled={busy || !recoveryReady || Boolean(savedId && !intent) || Boolean(intent && ['AWAITING_APPROVAL', 'APPROVED', 'SUBMITTING', 'UNKNOWN'].includes(intent.status))} onPress={() => { void run(async () => {
      const result = await client.x402('/intents', 'POST', { 'idempotency-key': Crypto.randomUUID() });
      // Save before approval or signing so an interrupted payment can be recovered.
      await AsyncStorage.setItem(storage, result.intent.id);
      if (alive.current) setSavedId(result.intent.id);
      accept(result.intent); setInsight(undefined);
      if (active()) setMessage('Review the recipient, exact amount, token and limits before approving.');
    }); }} />
    {savedId && !intent ? <Button label="Recover saved API payment" disabled={busy} onPress={() => { void run(() => refresh(savedId)); }} /> : null}
    {intent ? <Card>
      <Body>PiggyBanq test savings insight</Body>
      <Body>Amount: {formatStellarAmount(BigInt(intent.requirements.amount))} XLM · Stellar Testnet</Body>
      <Body>Token contract: {intent.requirements.asset}</Body>
      <Body>Recipient: {intent.requirements.payTo}</Body>
      <Body>Fee: sponsored · 0 XLM charged to your wallet</Body>
      <Body>Limits: 0.001 XLM per payment · 0.01 XLM per rolling 24 hours</Body>
      <Body>Status: {intent.status}</Body>
      <Button label="Approve API payment" disabled={busy || intent.status !== 'AWAITING_APPROVAL'} onPress={() => { void run(async () => {
        const result = await client.x402(`/intents/${intent.id}/approve`, 'POST'); accept(result.intent);
        if (active()) setMessage('Approved. Enter your local wallet password to sign this exact payment.');
      }); }} />
      {intent.status === 'APPROVED' ? <Field label="API payment local password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} /> : null}
      <Button label="Sign locally and pay for API" disabled={busy || intent.status !== 'APPROVED' || !password} onPress={() => { void run(async () => {
        if (!wallet) throw new Error('Unlock your wallet first.');
        try {
          if (!await session.unlockWallet(password) || !active()) throw new Error('Wallet verification failed or wallet locked. Nothing submitted.');
        } finally { if (alive.current) setPassword(''); }
        const payload = await signApprovedX402Payment({ intent, wallet, rpcUrl: 'https://soroban-testnet.stellar.org', isActive: active });
        if (!active()) throw new Error('Wallet locked. Nothing submitted.');
        const result = await client.x402(`/test/insight/${intent.id}`, 'GET', { 'PAYMENT-SIGNATURE': Buffer.from(JSON.stringify(payload)).toString('base64') });
        accept(result.intent); await refresh(intent.id);
      }); }} />
      <Button label="Refresh API payment status" secondary disabled={busy} onPress={() => { void run(() => refresh(intent.id)); }} />
      <Button label="Cancel API payment" secondary disabled={busy || !['AWAITING_APPROVAL', 'APPROVED'].includes(intent.status)} onPress={() => { void run(async () => {
        const result = await client.x402(`/intents/${intent.id}/cancel`, 'POST'); accept(result.intent); setPassword('');
      }); }} />
      {intent.status === 'SUCCEEDED' && intent.receipt?.verified && /^[a-f0-9]{64}$/.test(intent.receipt.transaction) ? <>
        <Body>Verified ledger receipt: {intent.receipt.transaction} · Ledger {intent.receipt.ledger}</Body>
        <Button label="View API receipt on Stellar Expert" secondary onPress={() => { void Linking.openURL(`https://stellar.expert/explorer/testnet/tx/${intent.receipt!.transaction}`); }} />
      </> : null}
    </Card> : null}
    {insight ? <Card><Body>{insight.title}</Body><Body>{insight.suggestion}</Body></Card> : null}
  </>;
}
