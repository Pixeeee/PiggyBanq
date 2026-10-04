import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Linking, Pressable, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { maskStellarAddress } from '@piggybanq/stellar-core/address';
import { useMobileSession } from '../auth/session';
import { type MobileThemeChoice, type MobileThemePalette, useMobileTheme } from '../theme';
import type { MobileStoredWallet } from '../wallet/create-local-wallet';
import { fetchMobileLedger, prepareMobileTransaction, submitMobileTransaction, reconcileMobileTransaction, type MobileTransactionReview } from '../wallet/stellar-mobile';
import { loadPlanningRecord, savePlanningRecord, type DashboardAllocation, type PlanningRecord, type SavingsGoal } from './planning';

const navItems = ['Overview', 'Plans', 'Send', 'Security'];
const emptyPlanning: PlanningRecord = { allocations: [], goals: [] };

export function DashboardHome() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Overview');
  const { palette: colors, resolvedTheme } = useMobileTheme();
  const session = useMobileSession();
  const wallet = session.wallet;
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  useEffect(() => () => { walletRef.current = null; }, []);
  const [planning, setPlanning] = useState<PlanningRecord>(emptyPlanning);
  const [planningLoaded, setPlanningLoaded] = useState(false);
  const [status, setStatus] = useState('Loading saved planning data...');
  const [ledger, setLedger] = useState<Awaited<ReturnType<typeof fetchMobileLedger>> | null>(null);
  const [ledgerStatus, setLedgerStatus] = useState('Connecting to Stellar Testnet...');
  const [pendingLoaded, setPendingLoaded] = useState(false);
  const [pendingHash, setPendingHash] = useState('');
  const [pendingExpiry, setPendingExpiry] = useState<string | undefined>();
  const [reconciling, setReconciling] = useState(false);
  const pendingKey = `piggybanq.pending.${wallet?.publicKey ?? ''}`;

  useEffect(() => {
    let mounted = true;
    if (!wallet) return;
    loadPlanningRecord(AsyncStorage, wallet.publicKey).then(record => {
      if (mounted) { setPlanning(record); setPlanningLoaded(true); setStatus('Plans saved on this device. No funds moved.'); }
    }).catch(error => { if (mounted) setStatus(error.message); });
    AsyncStorage.getItem(pendingKey).then(value => { if (mounted) {
      if (value) { const saved = JSON.parse(value); if (!/^[a-f0-9]{64}$/.test(saved.hash) || !Number.isFinite(Date.parse(saved.expiresAt))) throw new Error('Invalid pending record.'); setPendingHash(saved.hash); setPendingExpiry(saved.expiresAt); }
      setPendingLoaded(true);
    } }).catch(() => { if (mounted) setStatus('Pending transaction storage could not be read. Signing is blocked.'); });
    void refreshLedger();
    return () => { mounted = false; };
  }, [wallet?.publicKey]);

  async function refreshLedger() {
    const publicKey = walletRef.current?.publicKey;
    if (!publicKey) return;
    setLedgerStatus('Refreshing live ledger...');
    try {
      const next = await fetchMobileLedger(publicKey);
      if (!walletRef.current || walletRef.current.publicKey !== publicKey) return;
      setLedger(next); setLedgerStatus(next.exists ? 'Live Testnet ledger. Test assets have no monetary value.' : 'Unfunded Testnet wallet. Fund its public address using Stellar Friendbot.');
    } catch (error) { setLedger(null); setLedgerStatus(error instanceof Error ? error.message : 'Ledger unavailable. No sample balances substituted.'); }
  }
  const savingPlanning = useRef(false);
  async function savePlanning(next: PlanningRecord) {
    if (savingPlanning.current) { setStatus('Finish the current save before editing again.'); return; }
    if (!wallet || !planningLoaded) { setStatus('Saved data must load successfully before editing.'); return; }
    savingPlanning.current = true;
    try { await savePlanningRecord(AsyncStorage, wallet.publicKey, next); setPlanning(next); setStatus('Plans saved on this device. No funds moved.'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Could not save plans.'); }
    finally { savingPlanning.current = false; }
  }
  async function recordSigned(hash: string, expiresAt: string) {
    if (!walletRef.current || AppState.currentState !== 'active' || !session.walletReady) throw new Error('Wallet locked before signing. Unlock and review again.');
    await AsyncStorage.setItem(pendingKey, JSON.stringify({ hash, expiresAt }));
    setPendingHash(hash); setPendingExpiry(expiresAt);
  }
  async function settle(result: Awaited<ReturnType<typeof submitMobileTransaction>>) {
    setStatus(result.message);
    if (result.status !== 'UNKNOWN') { await AsyncStorage.removeItem(pendingKey); setPendingHash(''); }
    await refreshLedger();
  }
  async function reconcile() {
    setReconciling(true);
    try { await settle(await reconcileMobileTransaction(pendingHash, pendingExpiry)); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Reconciliation unavailable. Do not resend.'); }
    finally { setReconciling(false); }
  }
  if (!wallet) return null;

  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
    <StatusBar barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'} />
    <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ gap: 16, padding: 18, paddingBottom: 108 + insets.bottom }}>
      <Header wallet={wallet} walletReady={session.walletReady} />
      {pendingHash ? <Card title="Transaction awaiting reconciliation">
        <Text style={createBodyStyle(colors)}>Status has not been assumed. Do not resend while this hash remains unresolved.</Text>
        <Text selectable style={createBodyStyle(colors)}>{pendingHash}</Text>
        <ActionButton label={reconciling ? 'Checking ledger...' : 'Check transaction status'} disabled={reconciling} onPress={reconcile} variant="primary" />
      </Card> : null}
      {activeTab === 'Overview' ? <>
        <Card title="Live Stellar Testnet balances">
          <Text style={createBodyStyle(colors)}>{ledgerStatus}</Text>
          {ledger?.exists ? <><InfoRow label="XLM balance" value={`${ledger.xlm} XLM`} /><InfoRow label="Official USDC balance" value={`${ledger.usdc} USDC`} /><InfoRow label="USDC trustline" value={ledger.usdcTrustline ? 'Enabled' : 'Not enabled'} /></> : null}
          <Text selectable style={createBodyStyle(colors)}>{wallet.publicKey}</Text>
          <ActionButton label="Refresh live ledger" onPress={refreshLedger} variant="secondary" />
        </Card>
        <Card title="Confirmed ledger activity">
          {ledger?.activity.length ? ledger.activity.map(item => <View key={item.id} style={{ gap: 6 }}><Text style={createBodyStyle(colors)}>{item.description} · {item.successful ? 'Confirmed' : 'Failed'}</Text><Pressable accessibilityRole="button" onPress={() => Linking.openURL(`https://stellar.expert/explorer/testnet/tx/${item.hash}`)}><Text style={{ color: colors.rose }}>View transaction</Text></Pressable></View>) : <Text style={createBodyStyle(colors)}>No confirmed activity loaded.</Text>}
        </Card>
        <Card title="Your savings plans"><Text style={createBodyStyle(colors)}>{planning.allocations.length} allocations · {planning.goals.length} goals. Plans are local records, separate from ledger balances.</Text><ActionButton label="Open savings plans" onPress={() => setActiveTab('Plans')} variant="primary" /></Card>
      </> : null}
      {activeTab === 'Plans' ? <>
        <Text accessibilityLiveRegion="polite" style={createBodyStyle(colors)}>{status}</Text>
        {planningLoaded ? <><AllocationEditorPanel allocations={planning.allocations} onChange={allocations => { void savePlanning({ ...planning, allocations }); }} /><GoalsEditor goals={planning.goals} onChange={goals => { void savePlanning({ ...planning, goals }); }} /></> : null}
      </> : null}
      {activeTab === 'Send' ? <TransactionPanel wallet={wallet} walletReady={session.walletReady && pendingLoaded && !pendingHash} unlockWallet={session.unlockWallet} isStillUnlocked={() => Boolean(walletRef.current)} onSigned={recordSigned} onResult={settle} /> : null}
      {activeTab === 'Security' ? <Card title="Wallet security">
        <Text style={createBodyStyle(colors)}>SecureStore encrypts your wallet on Android. Your password gates access. Leaving the app locks it. Back up your Stellar secret key privately; it differs from the web recovery phrase.</Text>
        <Text style={createBodyStyle(colors)}>Planning records stay on this device. Mainnet, fiat, bridges, social login, swaps and yield products are unavailable in this Android release.</Text>
        <ActionButton label={session.secretVisible ? 'Hide secret key' : 'Reveal secret key for backup'} onPress={() => session.secretVisible ? session.setSecretVisible(false) : void session.revealSecretForBackup()} variant="secondary" />
        {session.secretVisible ? <Text selectable style={createBodyStyle(colors)}>{wallet.secretKey}</Text> : null}
        <Text accessibilityLiveRegion="polite" style={createBodyStyle(colors)}>{session.status}</Text>
        <ActionButton label="Lock wallet" onPress={session.lockWallet} variant="primary" />
      </Card> : null}
      {activeTab !== 'Plans' ? <Text accessibilityLiveRegion="polite" style={createBodyStyle(colors)}>{status}</Text> : null}
    </ScrollView>
    <BottomNav activeTab={activeTab} onSelect={tab => { session.setSecretVisible(false); setActiveTab(tab); }} />
  </SafeAreaView>;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  const { palette: colors } = useMobileTheme();
  return <View style={createPanelStyle(colors)}><Text style={{ color: colors.textDark, fontSize: 20, fontWeight: '800' }}>{title}</Text>{children}</View>;
}
function GoalsEditor({ goals, onChange }: { goals: SavingsGoal[]; onChange: (goals: SavingsGoal[]) => void }) {
  const { palette: colors } = useMobileTheme();
  const [name, setName] = useState(''); const [target, setTarget] = useState('');
  return <Card title="Savings goals (local plans)">
    <AllocationInput label="Goal name" value={name} onChangeText={setName} />
    <AllocationInput label="Goal target PHP" value={target} onChangeText={setTarget} keyboardType="decimal-pad" />
    <ActionButton label="Save savings goal" onPress={() => onChange([...goals, { id: `goal-${Date.now()}`, name, target, saved: '0.00' }])} variant="primary" />
    {goals.map(goal => <GoalRow key={goal.id} goal={goal} onSave={saved => onChange(goals.map(item => item.id === goal.id ? { ...item, saved } : item))} onDelete={() => onChange(goals.filter(item => item.id !== goal.id))} />)}
  </Card>;
}
function GoalRow({ goal, onSave, onDelete }: { goal: SavingsGoal; onSave: (saved: string) => void; onDelete: () => void }) {
  const { palette: colors } = useMobileTheme();
  const [saved, setSaved] = useState(goal.saved);
  return <View style={{ gap: 8 }}><Text style={createBodyStyle(colors)}>{goal.name} · PHP {goal.saved} / {goal.target}</Text><AllocationInput label={`Saved PHP for ${goal.name}`} value={saved} onChangeText={setSaved} keyboardType="decimal-pad" /><MiniButton label={`Save progress for ${goal.name}`} onPress={() => onSave(saved)} /><MiniButton label={`Delete goal ${goal.name}`} onPress={onDelete} /></View>;
}
function TransactionPanel({ wallet, walletReady, unlockWallet, isStillUnlocked, onSigned, onResult }: {
  wallet: MobileStoredWallet; walletReady: boolean; unlockWallet: (password: string) => Promise<boolean>;
  isStillUnlocked: () => boolean; onSigned: (hash: string, expiresAt: string) => Promise<void>; onResult: (result: Awaited<ReturnType<typeof submitMobileTransaction>>) => Promise<void>;
}) {
  const { palette: colors } = useMobileTheme();
  const [destination, setDestination] = useState(''); const [amount, setAmount] = useState('');
  const [assetCode, setAssetCode] = useState<'XLM' | 'USDC'>('XLM'); const [memo, setMemo] = useState('');
  const [password, setPassword] = useState(''); const [review, setReview] = useState<MobileTransactionReview | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('Review every operation before signing. Testnet only.');
  async function prepare(trustline = false) {
    setBusy(true); setReview(null);
    try { const next = await prepareMobileTransaction(wallet.publicKey, trustline ? { kind: 'TRUSTLINE' } : { kind: 'PAYMENT', destination: destination.trim().toUpperCase(), amount: amount.trim(), assetCode, memo }); if (isStillUnlocked()) { setReview(next); setMessage('Review destination, amount, asset issuer, memo and fee.'); } }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Review could not be prepared.'); }
    finally { setBusy(false); }
  }
  async function sign() {
    if (!review || !walletReady || !isStillUnlocked()) return;
    setBusy(true);
    try {
      if (!await unlockWallet(password) || !isStillUnlocked()) throw new Error('Unlock failed. No transaction signed.');
      setPassword(''); setMessage('Submitting to Testnet. Waiting for ledger confirmation...');
      const result = await submitMobileTransaction(review, wallet.secretKey, hash => onSigned(hash, review.expiresAt));
      setMessage(result.message); setReview(null); await onResult(result);
    } catch (error) { setPassword(''); setMessage(error instanceof Error ? error.message : 'Submission could not be confirmed.'); }
    finally { setBusy(false); }
  }
  return <Card title="Send on Stellar Testnet">
    <Text style={createBodyStyle(colors)}>{message}</Text>
    {!review ? <>
      <AllocationInput label="Destination public key" value={destination} onChangeText={setDestination} />
      <AllocationInput label="Send amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <View style={{ flexDirection: 'row', gap: 8 }}>{(['XLM', 'USDC'] as const).map(asset => <MiniButton key={asset} label={assetCode === asset ? `${asset} selected` : asset} onPress={() => setAssetCode(asset)} />)}</View>
      <AllocationInput label="Memo (optional)" value={memo} onChangeText={setMemo} />
      <ActionButton label={busy ? 'Preparing review...' : 'Review payment'} disabled={busy || !walletReady} onPress={() => prepare()} variant="primary" />
      <ActionButton label="Review USDC trustline" disabled={busy || !walletReady} onPress={() => prepare(true)} variant="secondary" />
    </> : <>
      <InfoRow label="Network" value="Stellar Testnet" /><InfoRow label="Operation" value={review.kind} /><InfoRow label="Amount / limit" value={`${review.amount} ${review.assetCode}`} /><InfoRow label="Destination" value={review.destination} selectable /><InfoRow label="Asset issuer" value={review.issuer ?? 'Native XLM'} selectable /><InfoRow label="Fee" value={`${review.feeStroops} stroops`} /><InfoRow label="Memo" value={review.memo || 'None'} /><InfoRow label="Expires" value={review.expiresAt} />
      <Text style={createBodyStyle(colors)}>Enter your wallet password to authorize this reviewed operation.</Text>
      <TextInput accessibilityLabel="Signing password" secureTextEntry autoCapitalize="none" autoCorrect={false} value={password} onChangeText={setPassword} style={createInputStyle(colors)} />
      <ActionButton label={busy ? 'Waiting for confirmation...' : 'Confirm and sign on device'} disabled={busy || !password || !walletReady} onPress={sign} variant="primary" />
      <ActionButton label="Cancel review" disabled={busy} onPress={() => { setReview(null); setPassword(''); }} variant="secondary" />
    </>}
  </Card>;
}

function Header({ wallet, walletReady }: { wallet: MobileStoredWallet | null; walletReady: boolean }) {
  const { choice, palette: colors, resolvedTheme, setChoice } = useMobileTheme();

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 12 }}>
        <View>
          <Text style={createEyebrowStyle(colors)}>PIGGYBANQ TESTNET</Text>
          <Text style={{ color: colors.textDark, fontSize: 34, fontWeight: '800', lineHeight: 38 }}>
            Savings workspace
          </Text>
        </View>
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: walletReady ? colors.green : colors.rose, fontSize: 12, fontWeight: '800' }}>
            {walletReady ? 'ACTIVE' : 'SETUP'}
          </Text>
          <Text selectable style={{ color: colors.textMid, fontSize: 12 }}>
            {wallet ? maskStellarAddress(wallet.publicKey) : 'No wallet'}
          </Text>
        </View>
      </View>
      <Text style={{ color: colors.textMid, fontSize: 15, lineHeight: 22 }}>
        Android-first savings tools for allocations, pockets, goals, and safe Stellar transaction review. Secret keys stay on this device.
      </Text>
      <ThemeSelector choice={choice} resolvedTheme={resolvedTheme} onChange={setChoice} />
    </View>
  );
}

function ThemeSelector({
  choice,
  onChange,
  resolvedTheme
}: {
  choice: MobileThemeChoice;
  onChange: (choice: MobileThemeChoice) => void;
  resolvedTheme: 'light' | 'dark';
}) {
  const { palette: colors } = useMobileTheme();
  const choices: MobileThemeChoice[] = ['system', 'light', 'dark'];

  return (
    <View accessibilityLabel={`Theme selector. Resolved ${resolvedTheme} theme.`} style={{ flexDirection: 'row', gap: 8 }}>
      {choices.map((item) => (
        <Pressable
          accessibilityRole="button"
          key={item}
          onPress={() => onChange(item)}
          style={{
            alignItems: 'center',
            backgroundColor: choice === item ? colors.rose : colors.card,
            borderColor: choice === item ? colors.rose : colors.border,
            borderRadius: 8,
            borderWidth: 1,
            flex: 1,
            minHeight: 40,
            justifyContent: 'center'
          }}
        >
          <Text style={{ color: choice === item ? colors.white : colors.textDark, fontSize: 12, fontWeight: '800', textTransform: 'capitalize' }}>
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function AllocationEditorPanel({
  allocations,
  onChange
}: {
  allocations: DashboardAllocation[];
  onChange: (allocations: DashboardAllocation[]) => void;
}) {
  const { palette: colors } = useMobileTheme();
  const [draft, setDraft] = useState<DashboardAllocation>({ id: 'draft', name: 'Food', amount: '', currency: 'PHP' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DashboardAllocation>(draft);

  function createAllocation() {
    if (!draft.name.trim() || !draft.amount.trim()) {
      return;
    }

    onChange([
      ...allocations,
      {
        ...draft,
        id: `allocation-${Date.now()}`
      }
    ]);
    setDraft({ id: 'draft', name: 'Food', amount: '', currency: 'PHP' });
  }

  function startEdit(allocation: DashboardAllocation) {
    setEditingId(allocation.id);
    setEditDraft(allocation);
  }

  function saveEdit() {
    onChange(allocations.map((allocation) => (allocation.id === editingId ? editDraft : allocation)));
    setEditingId(null);
  }

  function deleteAllocation(id: string) {
    onChange(allocations.filter((allocation) => allocation.id !== id));
    setEditingId((current) => (current === id ? null : current));
  }

  function moveAllocation(id: string, direction: -1 | 1) {
    const currentIndex = allocations.findIndex((allocation) => allocation.id === id);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= allocations.length) {
      return;
    }

    const nextAllocations = [...allocations];
    const [movedAllocation] = nextAllocations.splice(currentIndex, 1);
    nextAllocations.splice(nextIndex, 0, movedAllocation);
    onChange(nextAllocations);
  }

  return (
    <View style={createPanelStyle(colors)}>
      <PanelTitle title="Editable budget allocation" action="Create + edit" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <AllocationInput label="Type" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
        <AllocationInput label="Amount" value={draft.amount} onChangeText={(amount) => setDraft({ ...draft, amount })} keyboardType="decimal-pad" />
      </View>
      <CurrencyPicker value={draft.currency} onChange={(currency) => setDraft({ ...draft, currency })} />
      <ActionButton label="Create allocation" onPress={createAllocation} variant="primary" />

      <View style={{ gap: 10 }}>
        {allocations.map((allocation, index) => {
          const isEditing = editingId === allocation.id;

          return (
            <View
              key={allocation.id}
              style={{ backgroundColor: colors.card, borderColor: colors.borderSoft, borderRadius: 8, borderWidth: 1, gap: 10, padding: 12 }}
            >
              {isEditing ? (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    <AllocationInput label="Type" value={editDraft.name} onChangeText={(name) => setEditDraft({ ...editDraft, name })} />
                    <AllocationInput label="Amount" value={editDraft.amount} onChangeText={(amount) => setEditDraft({ ...editDraft, amount })} keyboardType="decimal-pad" />
                  </View>
                  <CurrencyPicker value={editDraft.currency} onChange={(currency) => setEditDraft({ ...editDraft, currency })} />
                </>
              ) : (
                <View style={{ gap: 4 }}>
                  <Text style={createEyebrowStyle(colors)}>Position {index + 1}</Text>
                  <Text style={{ color: colors.textDark, fontSize: 16, fontWeight: '800' }}>{allocation.name}</Text>
                  <Text style={{ color: colors.textMid, fontSize: 20, fontWeight: '800' }}>{allocation.currency} {allocation.amount}</Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <MiniButton disabled={index === 0} label="Move up" onPress={() => moveAllocation(allocation.id, -1)} />
                <MiniButton disabled={index === allocations.length - 1} label="Move down" onPress={() => moveAllocation(allocation.id, 1)} />
                {isEditing ? (
                  <>
                    <MiniButton label="Save" onPress={saveEdit} />
                    <MiniButton label="Cancel" onPress={() => setEditingId(null)} />
                  </>
                ) : (
                  <MiniButton label="Edit" onPress={() => startEdit(allocation)} />
                )}
                <MiniButton label="Delete" onPress={() => deleteAllocation(allocation.id)} />
              </View>
            </View>
          );
        })}
      </View>
      <Text style={createBodyStyle(colors)}>Cards adapt to phone width. Use move controls where drag gestures are unavailable.</Text>
    </View>
  );
}

function AllocationInput({
  keyboardType,
  label,
  onChangeText,
  value
}: {
  keyboardType?: 'decimal-pad';
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  const { palette: colors } = useMobileTheme();

  return (
    <View style={{ flex: 1, gap: 5, minWidth: 130 }}>
      <Text style={createEyebrowStyle(colors)}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={keyboardType === 'decimal-pad' ? '0.00' : label}
        placeholderTextColor={colors.textSoft}
        style={createInputStyle(colors)}
        value={value}
      />
    </View>
  );
}

function CurrencyPicker({ onChange, value }: { onChange: (currency: DashboardAllocation['currency']) => void; value: DashboardAllocation['currency'] }) {
  const { palette: colors } = useMobileTheme();
  const currencies: DashboardAllocation['currency'][] = ['PHP', 'USD', 'XLM', 'USDC'];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {currencies.map((currency) => (
        <MiniButton active={value === currency} key={currency} label={currency} onPress={() => onChange(currency)} />
      ))}
      <Text style={{ color: colors.textSoft, flexBasis: '100%', fontSize: 12 }}>Planning only. No wallet transaction is created here.</Text>
    </View>
  );
}

function MiniButton({
  active,
  disabled,
  label,
  onPress
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  const { palette: colors } = useMobileTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: active ? colors.rose : colors.cardAlt,
        borderColor: active ? colors.rose : colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexGrow: 1,
        minHeight: 38,
        minWidth: 82,
        justifyContent: 'center',
        opacity: disabled ? 0.45 : 1,
        paddingHorizontal: 10,
        paddingVertical: 8
      }}
    >
      <Text style={{ color: active ? colors.white : colors.textDark, fontSize: 12, fontWeight: '800', textAlign: 'center' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function BottomNav({ activeTab, onSelect }: { activeTab: string; onSelect: (tab: string) => void }) {
  const insets = useSafeAreaInsets();
  const { palette: colors } = useMobileTheme();

  return (
    <View style={{
      backgroundColor: colors.card,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      bottom: 0,
      flexDirection: 'row',
      gap: 6,
      left: 0,
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: Math.max(insets.bottom, 18),
      position: 'absolute',
      right: 0
    }}>
      {navItems.map((item) => (
        <Pressable
          accessibilityRole="button"
          key={item}
          onPress={() => onSelect(item)}
          style={{
            alignItems: 'center',
            backgroundColor: activeTab === item ? colors.surfaceStrong : colors.card,
            borderRadius: 8,
            flex: 1,
            minHeight: 48,
            justifyContent: 'center'
          }}
        >
          <Text style={{ color: activeTab === item ? colors.rose : colors.textMid, fontSize: 11, fontWeight: '800' }}>
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function PanelTitle({ action, title }: { action: string; title: string }) {
  const { palette: colors } = useMobileTheme();

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: colors.textDark, fontSize: 18, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: colors.rose, fontSize: 12, fontWeight: '800' }}>{action}</Text>
    </View>
  );
}

function InfoRow({ label, selectable, value }: { label: string; selectable?: boolean; value: string }) {
  const { palette: colors } = useMobileTheme();

  return (
    <View style={{ gap: 4 }}>
      <Text style={createEyebrowStyle(colors)}>{label}</Text>
      <Text selectable={selectable} style={{ color: colors.textDark, fontSize: 13, lineHeight: 20 }}>{value}</Text>
    </View>
  );
}

function SummaryCard({ label, meta, value }: { label: string; meta: string; value: string }) {
  const { palette: colors } = useMobileTheme();

  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.borderSoft, borderRadius: 8, borderWidth: 1, gap: 4, padding: 12 }}>
      <Text style={{ color: colors.textDark, fontSize: 15, fontWeight: '800' }}>{label}</Text>
      <Text style={{ color: colors.textDark, fontSize: 20, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: colors.textMid, fontSize: 12 }}>{meta}</Text>
    </View>
  );
}

function ActionButton({ disabled, label, onPress, variant }: { disabled?: boolean; label: string; onPress: () => void; variant: 'primary' | 'secondary' | 'success' }) {
  const { palette: colors } = useMobileTheme();
  const backgroundColor = variant === 'secondary' ? colors.surfaceStrong : variant === 'success' ? colors.green : colors.rose;
  const color = variant === 'secondary' ? colors.textDark : colors.white;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor,
        borderRadius: 10,
        flex: 1,
        minHeight: 48,
        justifyContent: 'center',
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: 12,
        paddingVertical: 12
      }}
    >
      <Text style={{ color, fontSize: 13, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

function createPanelStyle(colors: MobileThemePalette) {
  return {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16
  };
}

function createEyebrowStyle(colors: MobileThemePalette) {
  return {
    color: colors.textMid,
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const
  };
}

function createBodyStyle(colors: MobileThemePalette) {
  return {
    color: colors.textMid,
    fontSize: 14,
    lineHeight: 21
  };
}

function createInputStyle(colors: MobileThemePalette) {
  return {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textDark,
    fontSize: 13,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12
  };
}

function createWarningStyle(colors: MobileThemePalette) {
  return {
    backgroundColor: colors.cardAlt,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textDark,
    fontSize: 13,
    lineHeight: 19,
    padding: 10
  };
}
