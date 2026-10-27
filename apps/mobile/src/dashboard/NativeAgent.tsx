import { useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMobileTheme } from '../theme';
import { Body, Button, Card, Field, Heading } from '../ui/banking';
import { createMobileAgentStore } from './agent-store';

export function NativeAgent({ publicKey }: { publicKey: string }) {
  const { palette } = useMobileTheme();
  const [store] = useState(() => createMobileAgentStore(AsyncStorage, publicKey));
  const alive = useRef(true);
  const working = useRef(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<Awaited<ReturnType<typeof store.load>>>({ intents: [], receipts: [] });
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState('');
  const [command, setCommand] = useState('Pay 5 USDC to weather-api');
  const [message, setMessage] = useState('Loading saved agent history...');
  useEffect(() => {
    alive.current = true;
    store.load().then(record => { if (alive.current) { setState(record); setLoaded(true); setMessage('The agent prepares a simulation; you approve before executing.'); } })
      .catch(error => { if (alive.current) setMessage(error instanceof Error ? error.message : 'Agent history is unavailable.'); });
    return () => { alive.current = false; store.close(); };
  }, [store]);
  async function run(action: () => ReturnType<typeof store.load>, status: string, selectNewest = false) {
    if (working.current || !alive.current || !loaded || AppState.currentState !== 'active') return;
    working.current = true; setBusy(true);
    try {
      const next = await action();
      if (!alive.current) return;
      setState(next); if (selectNewest) setSelected(next.intents[0].id); setMessage(status);
    } catch (error) { if (alive.current) setMessage(error instanceof Error ? error.message : 'Agent action failed.'); }
    finally { working.current = false; if (alive.current) setBusy(false); }
  }
  const intent = state.intents.find(item => item.id === selected);
  const receipt = state.receipts.find(item => item.intentId === selected);
  return <>
    <Heading title="Agent sandbox" subtitle="Preview → approve → execute. No real funds move." />
    <Card>
      <Body>This uses the web agent’s command parser, policies and simulated providers. It does not run an AI model or sign wallet transactions. Live hosted x402 payments remain disabled.</Body>
      <Field label="Agent command" value={command} editable={!busy && loaded} onChangeText={setCommand} maxLength={500} autoCapitalize="none" />
      {['Pay 5 USDC to weather-api', 'Swap 25 XLM to USDC', 'Bridge 10 USDC to Base'].map(example => <Button key={example} label={example} secondary disabled={busy || !loaded} onPress={() => setCommand(example)} />)}
      <Button label="Preview agent intent" disabled={busy || !loaded} onPress={() => { void run(() => store.preview(command), 'Preview ready. Review the amount, destination, fee and policy checks.', true); }} />
    </Card>
    <Text accessibilityLiveRegion="polite" style={{ color: palette.textMid, fontSize: 14, lineHeight: 21 }}>{busy ? 'Saving simulation...' : message}</Text>
    {intent ? <Card>
      <Body>{intent.actionType} · {intent.status} · SANDBOX</Body>
      <Body>Send: {intent.amount} {intent.assetCode}</Body>
      <Body>Estimated output: {intent.estimatedOutput} {intent.outputAssetCode}</Body>
      <Body>Minimum received: {intent.minimumReceived} {intent.outputAssetCode}</Body>
      <Body>Recipient: {intent.recipient ?? intent.destinationAddress ?? 'Your simulated wallet'}</Body>
      <Body>Route: {intent.sourceNetwork} → {intent.destinationNetwork}</Body>
      <Body>Fee: {intent.fee} {intent.assetCode} · Slippage: {intent.slippageBps / 100}%</Body>
      <Body>Expires: {new Date(intent.expiresAt).toLocaleString()}</Body>
      {intent.policyChecks.map(check => <Body key={check.label}>✓ {check.label}</Body>)}
      <Button label="Approve agent intent" disabled={busy || intent.status !== 'AWAITING_APPROVAL'} onPress={() => { void run(() => store.approve(intent.id), 'Intent approved. Sandbox execution is available.'); }} />
      <Button label="Execute agent sandbox" disabled={busy || intent.status !== 'APPROVED'} onPress={() => { void run(() => store.execute(intent.id), 'Sandbox execution completed. No real funds moved.'); }} />
      {receipt ? <><Body>Sandbox receipt · {receipt.externalReference}</Body><Body>{receipt.network} · No real funds moved</Body></> : null}
    </Card> : null}
    {state.intents.length ? <Card><Body>Saved simulations on this device</Body>{state.intents.map(item => <View key={item.id}><Button label={`Open ${item.actionType} ${item.amount} ${item.assetCode} ${item.status}`} secondary disabled={busy} onPress={() => setSelected(item.id)} /></View>)}</Card> : null}
  </>;
}
