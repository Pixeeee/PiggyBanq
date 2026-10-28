import { Text } from '../ui/Typography';
import { NativeX402 } from './NativeX402';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, View } from 'react-native';
import { useMobileSession } from '../auth/session';
import { useMobileTheme } from '../theme';
import { Body, Button, Card, Field, Heading, Segments, Sheet } from '../ui/banking';
import { CloudApiError, cloudAmount, createMobileCloudClient, type AllocationDraft, type CloudChallenge, type CloudPlan, type CloudPocket, type CloudProfile, type PocketDraft } from './cloud-api';

type Snapshot = { profile: CloudProfile; plans: CloudPlan[]; pockets: CloudPocket[] };
const emptyAllocation: AllocationDraft = { category: '', amount: '', currency: 'PHP' };

export function CloudWorkspace({ visible }: { visible: boolean }) {
  const session = useMobileSession();
  const { palette } = useMobileTheme();
  const [client] = useState(() => createMobileCloudClient());
  const alive = useRef(true);
  const currentWallet = useRef(session.wallet);
  currentWallet.current = session.wallet;
  const working = useRef(false);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState('Connect the same wallet you use on the web to see its shared data.');
  const [username, setUsername] = useState(session.wallet?.username?.toLowerCase() ?? '');
  const [challenge, setChallenge] = useState<CloudChallenge | null>(null);
  const [section, setSection] = useState('Goals & budget');
  const [allocation, setAllocation] = useState(emptyAllocation);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CloudProfile | null>(null);
  const [pocketDraft, setPocketDraft] = useState<PocketDraft | null>(null);
  const [event, setEvent] = useState<{ pocket: CloudPocket; type: 'POCKET_CREDIT' | 'POCKET_DEBIT'; amount: string } | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; currentWallet.current = null; void client.close(); };
  }, [client]);

  async function run(action: () => Promise<void>) {
    if (working.current || !currentWallet.current) return;
    working.current = true; setBusy(true);
    try { await action(); }
    catch (error) {
      if (!alive.current) return;
      setMessage(error instanceof Error ? error.message : 'Shared data is unavailable.');
      if (error instanceof CloudApiError && [401, 403].includes(error.status)) { setConnected(false); setSnapshot(null); setProfileDraft(null); setChallenge(null); }
    } finally { working.current = false; if (alive.current) setBusy(false); }
  }
  async function refresh() {
    const next = await client.snapshot();
    if (!alive.current) return;
    setSnapshot(next); setConnected(true); setMessage('Synced with your web account. Planning records do not move funds.');
  }
  async function prepare() {
    const wallet = currentWallet.current;
    if (!wallet || !session.walletReady || AppState.currentState !== 'active') throw new Error('Unlock and confirm your wallet backup first.');
    setMessage('Preparing a sign-in message...');
    const next = await client.prepareLogin(wallet.publicKey, username.trim().toLowerCase());
    if (alive.current) setChallenge(next);
  }
  async function approve() {
    const wallet = currentWallet.current;
    if (!wallet || !challenge) return;
    await client.approveLogin(challenge, wallet, () => alive.current && AppState.currentState === 'active' && currentWallet.current?.publicKey === wallet.publicKey);
    if (!alive.current) return;
    setChallenge(null); setConnected(true);
    await refresh();
  }
  async function change(action: () => Promise<unknown>) {
    setMessage('Saving to your web account...');
    await action();
    if (!alive.current) return;
    await refresh();
  }
  function move(plan: CloudPlan, index: number, direction: -1 | 1) {
    const ids = plan.categories.map(item => item.id);
    const destination = index + direction;
    if (destination < 0 || destination >= ids.length) return;
    [ids[index], ids[destination]] = [ids[destination], ids[index]];
    void run(() => change(() => client.reorder(plan.id, ids)));
  }
  function remove(id: string, name: string) {
    Alert.alert(`Delete ${name}?`, 'This removes the shared category from both web goals and allocations. No funds move.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void run(() => change(() => client.deleteAllocation(id))); } }
    ]);
  }
  if (!visible) return null;
  return <>
    <Heading title="Your shared workspace" subtitle="The same account and saved records as the web." />
    <Text accessibilityLiveRegion="polite" style={{ color: palette.textMid, fontSize: 14, lineHeight: 21 }}>{busy ? 'Working…' : message}</Text>
    {!connected ? <Card>
      <Body>Import your web recovery phrase into this device to use the same account. Creating a different wallet creates a separate account.</Body>
      <Field label="Username for a new web account" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={24} editable={!busy} />
      <Body muted>Existing accounts use their registered username. This signs an authentication message only; your private key stays on this device.</Body>
      <Button label="Connect web account" disabled={busy || !session.walletReady} onPress={() => { void run(prepare); }} />
    </Card> : <>
      <Button label="Refresh shared data" secondary disabled={busy} onPress={() => { void run(refresh); }} />
      <Segments items={['Goals & budget', 'Pockets', 'Profile', 'Paid API']} active={section} onSelect={setSection} disabled={busy} />
      {snapshot && section === 'Goals & budget' ? <>
        <Body>The web’s Goals and Allocations pages use these same categories. Device-only goals remain under Save.</Body>
        <Button label="Add shared goal or allocation" disabled={busy} onPress={() => { setAllocation(emptyAllocation); setEditingId(undefined); setEditing(true); }} />
        {!snapshot.plans.some(plan => plan.categories.length) ? <Card><Body>No shared goals or allocations yet.</Body></Card> : null}
        {snapshot.plans.map(plan => <View key={plan.id} style={{ gap: 12 }}>
          <Body>{plan.month}</Body>
          {plan.categories.map((item, index) => <Card key={item.id}>
            <Body>{item.name}</Body><Body>{item.currency} {cloudAmount(item.amountMinor)}</Body>
            <Button label={`Edit shared ${item.name}`} secondary disabled={busy} onPress={() => { setAllocation({ category: item.name, amount: cloudAmount(item.amountMinor), currency: item.currency }); setEditingId(item.id); setEditing(true); }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><Button label="Move up" secondary disabled={busy || index === 0} onPress={() => move(plan, index, -1)} /></View>
              <View style={{ flex: 1 }}><Button label="Move down" secondary disabled={busy || index === plan.categories.length - 1} onPress={() => move(plan, index, 1)} /></View>
            </View>
            <Button label={`Delete shared ${item.name}`} secondary disabled={busy} onPress={() => remove(item.id, item.name)} />
          </Card>)}
        </View>)}
      </> : null}
      {snapshot && section === 'Pockets' ? <>
        <Body>These are the web’s Testnet planning/demo records. Recorded credits, interest and withdrawals are not blockchain transfers or real yield.</Body>
        <Button label="Create shared pocket" disabled={busy} onPress={() => setPocketDraft({ label: '', assetCode: 'XLM', pocketType: 'FLEXIBLE' })} />
        {!snapshot.pockets.length ? <Card><Body>No shared pockets yet.</Body></Card> : null}
        {snapshot.pockets.map(pocket => <Card key={pocket.id}>
          <Body>{pocket.label} · {pocket.status}</Body><Body>{pocket.assetCode} {cloudAmount(pocket.balanceMinor)} recorded</Body>
          {pocket.maturesAt ? <Body>Demo maturity: {new Date(pocket.maturesAt).toLocaleString()}</Body> : null}
          {pocket.pocketType === 'FLEXIBLE' ? <>
            <Button label={`Record credit for ${pocket.label}`} secondary disabled={busy} onPress={() => setEvent({ pocket, type: 'POCKET_CREDIT', amount: '' })} />
            <Button label={`Record debit for ${pocket.label}`} secondary disabled={busy} onPress={() => setEvent({ pocket, type: 'POCKET_DEBIT', amount: '' })} />
          </> : <>
            <Button label={`Refresh maturity for ${pocket.label}`} secondary disabled={busy || pocket.status === 'withdrawn'} onPress={() => { void run(() => change(() => client.maturePocket(pocket.id))); }} />
            <Button label={`Record demo withdrawal for ${pocket.label}`} secondary disabled={busy || pocket.status !== 'matured'} onPress={() => {
              Alert.alert('Record demo withdrawal?', 'This updates the same demo pocket as the web. No funds will move.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => { void run(() => change(() => client.withdrawPocket(pocket.id))); } }]);
            }} />
          </>}
          {pocket.events.slice(0, 5).map(item => <Body key={item.id}>{item.type}: {cloudAmount(item.amountMinor)}</Body>)}
        </Card>)}
      </> : null}
      {section === 'Paid API' ? <NativeX402 client={client} /> : null}
      {snapshot && section === 'Profile' ? <Card>
        <Body>{snapshot.profile.displayName} (@{snapshot.profile.username})</Body>
        <Body>{snapshot.profile.bio || 'No bio yet.'}</Body>
        <Body>Currency: {snapshot.profile.currency} · Visibility: {snapshot.profile.visibility}</Body>
        <Button label="Edit shared profile" secondary disabled={busy} onPress={() => setProfileDraft(snapshot.profile)} />
        <Body muted>Your wallet address and username stay associated with the same account on web and mobile.</Body>
      </Card> : null}
    </>}
    <Sheet visible={Boolean(challenge)} title="Approve web sign-in" onClose={() => { if (!busy) setChallenge(null); }}>
      <Body>Review this message before signing on your device. No payment or blockchain transaction will be signed.</Body>
      <Text selectable style={{ color: palette.textDark, fontSize: 12, lineHeight: 18 }}>{challenge?.message}</Text>
      <Button label={challenge?.purpose === 'SIGN_UP' ? 'Sign and create web account' : 'Sign and connect account'} disabled={busy} onPress={() => { void run(approve); }} />
    </Sheet>
    <Sheet visible={editing} title={editingId ? 'Edit shared allocation' : 'New shared goal or allocation'} onClose={() => { if (!busy) setEditing(false); }}>
      <Field label="Shared category name" value={allocation.category} maxLength={60} editable={!busy} onChangeText={category => setAllocation({ ...allocation, category })} />
      <Field label="Shared amount" value={allocation.amount} keyboardType="decimal-pad" editable={!busy} onChangeText={amount => setAllocation({ ...allocation, amount })} />
      <Segments items={['PHP', 'USD', 'XLM', 'USDC']} active={allocation.currency} disabled={busy} onSelect={currency => setAllocation({ ...allocation, currency: currency as AllocationDraft['currency'] })} />
      <Button label="Save shared allocation" disabled={busy || !allocation.category.trim() || !/^\d+(\.\d{1,2})?$/.test(allocation.amount)} onPress={() => { void run(async () => { await change(() => client.allocation(allocation, editingId)); if (alive.current) setEditing(false); }); }} />
      <Body>{message}</Body>
    </Sheet>
    <Sheet visible={Boolean(profileDraft)} title="Edit shared profile" onClose={() => { if (!busy) setProfileDraft(null); }}>
      {profileDraft ? <>
        <Field label="Display name" value={profileDraft.displayName} maxLength={80} editable={!busy} onChangeText={displayName => setProfileDraft({ ...profileDraft, displayName })} />
        <Field label="Bio" value={profileDraft.bio} maxLength={240} editable={!busy} onChangeText={bio => setProfileDraft({ ...profileDraft, bio })} />
        <Segments items={['PHP', 'USD', 'XLM', 'USDC']} active={profileDraft.currency} disabled={busy} onSelect={currency => setProfileDraft({ ...profileDraft, currency: currency as CloudProfile['currency'] })} />
        <Segments items={['PRIVATE', 'WALLET_ADDRESS_ONLY', 'PUBLIC']} active={profileDraft.visibility} disabled={busy} onSelect={visibility => setProfileDraft({ ...profileDraft, visibility: visibility as CloudProfile['visibility'] })} />
        <Button label="Save shared profile" disabled={busy || profileDraft.displayName.trim().length < 2} onPress={() => { void run(async () => { const { displayName, bio, currency, visibility } = profileDraft; await change(() => client.updateProfile({ displayName, bio, currency, visibility })); if (alive.current) setProfileDraft(null); }); }} />
      </> : null}<Body>{message}</Body>
    </Sheet>
    <Sheet visible={Boolean(pocketDraft)} title="Create shared pocket" onClose={() => { if (!busy) setPocketDraft(null); }}>
      {pocketDraft ? <>
        <Body>Planning/demo records only. Creating a pocket does not lock or transfer actual assets.</Body>
        <Field label="Pocket name" value={pocketDraft.label} maxLength={60} editable={!busy} onChangeText={label => setPocketDraft({ ...pocketDraft, label })} />
        <Segments items={['XLM', 'USDC', 'USDT']} active={pocketDraft.assetCode} disabled={busy} onSelect={assetCode => setPocketDraft({ ...pocketDraft, assetCode: assetCode as CloudPocket['assetCode'] })} />
        <Segments items={['FLEXIBLE', 'LOCKED_EARN']} active={pocketDraft.pocketType} disabled={busy} onSelect={kind => setPocketDraft({ ...pocketDraft, pocketType: kind as CloudPocket['pocketType'], ...(kind === 'LOCKED_EARN' ? { amount: '', lockDays: 7, apyBps: 500 } : {}) })} />
        {pocketDraft.pocketType === 'LOCKED_EARN' ? <>
          <Field label="Demo principal amount" value={pocketDraft.amount ?? ''} keyboardType="decimal-pad" editable={!busy} onChangeText={amount => setPocketDraft({ ...pocketDraft, amount })} />
          <Segments items={['7', '30', '90']} active={String(pocketDraft.lockDays)} disabled={busy} onSelect={days => setPocketDraft({ ...pocketDraft, lockDays: Number(days) as 7 | 30 | 90 })} />
          <Body>Demo APY: 5%. No actual yield is earned.</Body>
        </> : <Field label="Pocket target amount (optional)" value={pocketDraft.targetAmount ?? ''} keyboardType="decimal-pad" editable={!busy} onChangeText={targetAmount => setPocketDraft({ ...pocketDraft, targetAmount })} />}
        <Button label="Create demo pocket" disabled={busy || pocketDraft.label.trim().length < 2} onPress={() => { void run(async () => { await change(() => client.createPocket({ ...pocketDraft, targetAmount: pocketDraft.targetAmount || undefined })); if (alive.current) setPocketDraft(null); }); }} />
      </> : null}<Body>{message}</Body>
    </Sheet>
    <Sheet visible={Boolean(event)} title="Record pocket activity" onClose={() => { if (!busy) setEvent(null); }}>
      {event ? <>
        <Body>{event.type === 'POCKET_CREDIT' ? 'Credit' : 'Debit'} · {event.pocket.label}. Planning record only; no funds move.</Body>
        <Field label="Recorded amount" value={event.amount} keyboardType="decimal-pad" editable={!busy} onChangeText={amount => setEvent({ ...event, amount })} />
        <Button label="Save pocket activity" disabled={busy || !/^\d+(\.\d{1,2})?$/.test(event.amount)} onPress={() => { void run(async () => { await change(() => client.pocketEvent(event.pocket.id, event.type, event.amount)); if (alive.current) setEvent(null); }); }} />
      </> : null}<Body>{message}</Body>
    </Sheet>
  </>;
}
