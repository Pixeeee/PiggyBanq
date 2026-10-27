import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, Share, StatusBar, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { maskStellarAddress } from '@piggybanq/stellar-core/address';
import { useMobileSession } from '../auth/session';
import { useMobileTheme } from '../theme';
import type { MobileStoredWallet } from '../wallet/create-local-wallet';
import { fetchMobileLedger, prepareMobileTransaction, submitMobileTransaction, reconcileMobileTransaction, type MobileTransactionReview, type MobileLedger } from '../wallet/stellar-mobile';
import { loadPlanningRecord, savePlanningRecord, type PlanningRecord } from './planning';
import { Body, Button, Card, Field, Heading, Icon, IconButton, ProgressBar, Segments, Sheet, type IconName } from '../ui/banking';
import { PiggyCompanion } from './PiggyCompanion';
import { SavingsPlans } from './SavingsPlans';
import { CloudWorkspace } from './CloudWorkspace';
import { MotionView } from '../ui/MotionView';
import { NativeActivityOverview } from './NativeActivityOverview';
import { NativeAgent } from './NativeAgent';
import { formatLedgerBalance, getGoalProgress } from './presentation';

const emptyPlanning: PlanningRecord = { allocations: [], goals: [] };
const navItems: Array<{label: string; icon: IconName; selected: IconName}> = [
  {label:'Home',icon:'home-outline',selected:'home'}, {label:'Save',icon:'wallet-outline',selected:'wallet'},
  {label:'Send',icon:'paper-plane-outline',selected:'paper-plane'}, {label:'Sync',icon:'cloud-outline',selected:'cloud'}, {label:'You',icon:'person-outline',selected:'person'}
];

export function DashboardHome() {
  const scroll = useRef<ScrollView>(null);
  const [receiveVisible, setReceiveVisible] = useState(false);
  const [celebration, setCelebration] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [transactionMode, setTransactionMode] = useState('Send');
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
    if (savingPlanning.current) { setStatus('Finish the current save before editing again.'); return false; }
    if (!wallet || !planningLoaded) { setStatus('Saved data must load successfully before editing.'); return false; }
    savingPlanning.current = true; setSaving(true);
    try { await savePlanningRecord(AsyncStorage, wallet.publicKey, next); setPlanning(next); setStatus('Plans saved on this device. No funds moved.'); setCelebration(value => value + 1); return true; }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Could not save plans.'); return false; }
    finally { savingPlanning.current = false; setSaving(false); }
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
  function navigate(tab: string) { session.setSecretVisible(false); setActiveTab(tab); scroll.current?.scrollTo({ y: 0, animated: false }); }
  if (!wallet) return null;
  return <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <StatusBar barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'} />
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, padding: 20, paddingBottom: 28, width: '100%', maxWidth: 600, alignSelf: 'center' }}>
      <MotionView transitionKey={activeTab} style={{ gap: 18 }}>
      {activeTab === 'Home' ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.textSoft, fontSize: 13 }}>Welcome back,</Text><Text style={{ color: colors.textDark, fontSize: 24, fontWeight: '700', textTransform: 'capitalize', letterSpacing: -0.6 }}>{wallet.username?.replace(/_/g, ' ') || 'Saver'}</Text></View><IconButton label="Open profile and security" icon="person-outline" onPress={() => navigate('You')} /></View> : null}
      {activeTab !== 'Save' && status !== 'Plans saved on this device. No funds moved.' ? <Text accessibilityLiveRegion="polite" style={{ color: colors.textMid, fontSize: 13, lineHeight: 20 }}>{status}</Text> : null}
      {pendingHash ? <Card style={{ borderWidth: 1, borderColor: colors.rose }}><Text style={{ color: colors.textDark, fontSize: 18, fontWeight: '700' }}>Transaction awaiting reconciliation</Text><Body>The outcome is still unknown. Check its status before sending again.</Body><Text selectable style={{ color: colors.textMid, fontSize: 12, lineHeight: 18 }}>{pendingHash}</Text><Button label={reconciling ? 'Checking ledger...' : 'Check transaction status'} disabled={reconciling} onPress={() => { void reconcile(); }} /></Card> : null}
      {activeTab === 'Home' ? <Overview wallet={wallet} ledger={ledger} ledgerStatus={ledgerStatus} planning={planning} planningLoaded={planningLoaded} celebration={celebration} onSend={() => navigate('Send')} onReceive={() => setReceiveVisible(true)} onSave={() => navigate('Save')} onRefresh={() => { void refreshLedger(); }} /> : null}
      {activeTab === 'Save' ? <SavingsPlans record={planning} loaded={planningLoaded} busy={saving} message={status} celebration={celebration} onSave={savePlanning} /> : null}
      <CloudWorkspace visible={activeTab === 'Sync'} />
      {activeTab === 'Send' ? <>
        <Segments items={['Send', 'Swap', 'Agent']} active={transactionMode} onSelect={setTransactionMode} />
        {transactionMode === 'Agent' ? <NativeAgent publicKey={wallet.publicKey} /> : <>
          <Heading title={transactionMode === 'Swap' ? 'Swap on Testnet' : 'Send with confidence'} subtitle="Review the details. You’re always in control." />
          <TransactionPanel key={transactionMode} mode={transactionMode === 'Swap' ? 'SWAP' : 'PAYMENT'} wallet={wallet} walletReady={session.walletReady && pendingLoaded && !pendingHash} unlockWallet={session.unlockWallet} isStillUnlocked={() => Boolean(walletRef.current) && AppState.currentState === 'active'} onReviewChange={() => { setStatus('Review this Testnet transaction before signing.'); scroll.current?.scrollTo({ y: 0, animated: false }); }} onSigned={recordSigned} onResult={settle} />
        </>}
      </> : null}
      {activeTab === 'You' ? <>
        <Heading title="Your space" subtitle="Make PiggyBanq feel like you." />
        <Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}><View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center' }}><Icon name="person-outline" color={colors.rose} size={26} /></View><View style={{ flex: 1, gap: 5 }}><Text style={{ color: colors.textDark, fontSize: 20, fontWeight: '700' }}>{wallet.username || 'PiggyBanq saver'}</Text><Text style={{ color: colors.textMid, fontSize: 13 }}>Local wallet · Stellar Testnet</Text></View></View><Text selectable style={{ color: colors.textMid, fontSize: 13 }}>{maskStellarAddress(wallet.publicKey)}</Text><Button label="View & share public address" secondary icon="arrow-down-outline" onPress={() => setReceiveVisible(true)} /></Card>
        <Card><Text style={{ color: colors.textDark, fontSize: 18, fontWeight: '700' }}>Wallet security</Text><View style={{ flexDirection: 'row', gap: 10 }}><Icon name="shield-checkmark-outline" color={colors.green} /><View style={{ flex: 1 }}><Body>Your keys stay in SecureStore. Leaving the app locks your wallet.</Body></View></View><Button label={session.secretVisible ? 'Hide wallet backup' : 'Reveal wallet backup'} secondary icon="key-outline" onPress={() => session.secretVisible ? session.setSecretVisible(false) : void session.revealSecretForBackup()} />{session.secretVisible ? <Text selectable style={{ color: colors.textDark, fontSize: 13, lineHeight: 20 }}>{wallet.recoveryPhrase ?? wallet.secretKey}</Text> : null}<Text accessibilityLiveRegion="polite" style={{ color: colors.textMid, fontSize: 13 }}>{session.status}</Text></Card>
        <Card><Text style={{ color: colors.textDark, fontSize: 18, fontWeight: '700' }}>Appearance</Text><ThemeSelector /></Card>
        <Card><Text style={{ color: colors.textDark, fontSize: 17, fontWeight: '700' }}>About this release</Text><Body>Stellar Testnet assets have no monetary value. Save contains device-only plans; Sync connects your shared web account, allocations, pockets and profile. Send includes live Testnet swaps and the agent sandbox. Mainnet, fiat, real bridges, social login and actual yield products remain unavailable.</Body><Button label="Open shared web workspace" secondary onPress={() => navigate('Sync')} /></Card>
        <Button label="Lock wallet" icon="lock-closed-outline" onPress={session.lockWallet} />
      </> : null}
      </MotionView>
    </ScrollView>
    <BottomNav activeTab={activeTab} onSelect={navigate} />
    <Sheet visible={receiveVisible} title="Receive on Testnet" onClose={() => setReceiveVisible(false)}>
      <Body>Share this public address to receive XLM. Hold the address to copy it. Your secret key is never needed to receive.</Body>
      <View style={{ backgroundColor: colors.cardAlt, borderRadius: 18, padding: 20, gap: 14, alignItems: 'center' }}><Icon name="arrow-down-circle-outline" size={46} color={colors.rose} /><Text selectable accessibilityLabel={`Your Stellar public address: ${wallet.publicKey}`} style={{ color: colors.textDark, fontSize: 15, lineHeight: 24, textAlign: 'center' }}>{wallet.publicKey}</Text><Text style={{ color: colors.textSoft, fontSize: 12 }}>Stellar Testnet only</Text></View>
      <Button label="Share public address" icon="share-outline" onPress={() => { void Share.share({ message: wallet.publicKey }).catch(() => setStatus('The share sheet could not be opened. Hold the public address to copy it.')); }} />
      <Body>USDC needs an enabled trustline first. Review that setup in Send.</Body>
    </Sheet>
  </SafeAreaView>;
}

function Overview({ wallet, ledger, ledgerStatus, planning, planningLoaded, celebration, onSend, onReceive, onSave, onRefresh }: { wallet: MobileStoredWallet; ledger: MobileLedger | null; ledgerStatus: string; planning: PlanningRecord; planningLoaded: boolean; celebration: number; onSend: () => void; onReceive: () => void; onSave: () => void; onRefresh: () => void }) {
  const { palette } = useMobileTheme();
  const [hidden, setHidden] = useState(false); const [asset, setAsset] = useState('XLM');
  const amount = ledger?.exists ? asset === 'XLM' ? ledger.xlm : ledger.usdc : undefined;
  return <>
    <View style={{ backgroundColor: '#862F4A', borderRadius: 24, padding: 24, gap: 17 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: '#FFE3EB', fontSize: 13 }}>Your wallet balance</Text><Text style={{ color: '#E9A7AB', fontSize: 10, letterSpacing: 1.4, fontWeight: '700' }}>STELLAR TESTNET</Text></View><Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Show balances' : 'Hide balances'} onPress={() => setHidden(!hidden)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name={hidden ? 'eye-off-outline' : 'eye-outline'} color="#FFFFFF" /></Pressable></View>
      <View style={{ gap: 5 }}><Text accessibilityLabel={hidden ? `${asset} balance hidden` : amount === undefined ? `${asset} balance unavailable` : `${formatLedgerBalance(amount)} ${asset} wallet balance`} numberOfLines={1} adjustsFontSizeToFit style={{ color: '#FFFFFF', fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 }}>{hidden ? '••••••' : formatLedgerBalance(amount)}<Text style={{ color: '#FFE3EB', fontSize: 17 }}> {asset}</Text></Text><Text style={{ color: '#FFE3EB', fontSize: 12 }}>Test assets · No monetary value</Text></View>
      <View style={{ flexDirection: 'row', gap: 10 }}>{['XLM', 'USDC'].map(item => <Pressable key={item} accessibilityRole="button" accessibilityLabel={`Show ${item} balance`} accessibilityState={{ selected: asset === item }} onPress={() => setAsset(item)} style={{ minHeight: 40, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 14, backgroundColor: asset === item ? '#FFFFFF' : '#FFFFFF12' }}><Text style={{ color: asset === item ? '#862F4A' : '#FFFFFF', fontWeight: '700', fontSize: 13 }}>{item}</Text></Pressable>)}</View>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>{[{label:'Send',icon:'arrow-up-outline' as const,onPress:onSend},{label:'Receive',icon:'arrow-down-outline' as const,onPress:onReceive},{label:'Save',icon:'wallet-outline' as const,onPress:onSave},{label:'Refresh',icon:'refresh-outline' as const,onPress:onRefresh}].map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label === 'Refresh' ? 'Refresh live ledger' : `${item.label} quick action`} onPress={item.onPress} style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 9, opacity: pressed ? 0.6 : 1, minHeight: 68 })}><View style={{ backgroundColor: palette.surfaceStrong, borderRadius: 18, width: 56, height: 52, alignItems: 'center', justifyContent: 'center' }}><Icon name={item.icon} color={palette.rose} /></View><Text style={{ color: palette.textDark, fontSize: 12, fontWeight: '600' }}>{item.label}</Text></Pressable>)}</View>
    {!ledger?.exists ? <Text accessibilityLiveRegion="polite" style={{ color: palette.textMid, fontSize: 12, lineHeight: 18 }}>{ledgerStatus}</Text> : null}
    <NativeActivityOverview activity={ledger?.activity ?? []} asset={asset === 'USDC' ? 'USDC' : 'XLM'} ready={Boolean(ledger?.exists)} hidden={hidden} />
    <PiggyCompanion celebration={celebration} compact />
    <SectionTitle title="Your savings goals" action="See all" onPress={onSave} />
    {!planningLoaded ? <Body>Loading your local savings plans…</Body> : planning.goals.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>{planning.goals.slice(0, 5).map(goal => { const progress = getGoalProgress(goal); return <Pressable key={goal.id} accessibilityRole="button" accessibilityLabel={`Open savings goal ${goal.name}`} onPress={onSave} style={{ width: 244 }}><Card style={{ padding: 17, gap: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Icon name="flag-outline" color={palette.rose} size={20} /><Text numberOfLines={1} style={{ flex: 1, color: palette.textDark, fontSize: 15, fontWeight: '700' }}>{goal.name}</Text><Text style={{ color: palette.rose, fontSize: 12 }}>{Math.floor(progress.percent)}%</Text></View><Text style={{ color: palette.textDark, fontSize: 20, fontWeight: '700' }}>PHP {goal.saved}</Text><ProgressBar percent={progress.percent} /><Text style={{ color: palette.textSoft, fontSize: 11 }}>Local plan · Target PHP {goal.target}</Text></Card></Pressable>; })}</ScrollView> : <Card><Body>Your next big thing starts with a small goal.</Body><Button label="Create a savings goal" onPress={onSave} secondary icon="add" /></Card>}
    <SectionTitle title="Recent activity" />
    <Card style={{ gap: 0, paddingVertical: 8 }}>{ledger?.activity.length ? ledger.activity.slice(0, 5).map((item, index) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.description}. ${item.successful ? 'Confirmed' : 'Failed'}. View transaction`} onPress={() => { void Linking.openURL(`https://stellar.expert/explorer/testnet/tx/${item.hash}`).catch(() => {}); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 15, borderTopWidth: index ? 1 : 0, borderColor: palette.borderSoft }}><View style={{ height: 40, width: 40, borderRadius: 14, backgroundColor: palette.cardAlt, alignItems: 'center', justifyContent: 'center' }}><Icon name={item.description.startsWith('Received') ? 'arrow-down-outline' : 'arrow-up-outline'} size={19} color={item.description.startsWith('Received') ? palette.green : palette.textDark} /></View><View style={{ flex: 1, gap: 5 }}><Text style={{ color: palette.textDark, fontSize: 14, fontWeight: '600' }}>{item.description}</Text><Text style={{ color: palette.textSoft, fontSize: 11 }}>{item.successful ? 'Ledger confirmed' : 'Failed on ledger'}</Text></View><Icon name="chevron-forward" size={16} color={palette.textSoft} /></Pressable>) : <View style={{ paddingVertical: 12 }}><Body>No confirmed ledger activity loaded yet.</Body></View>}</Card>
    <Text style={{ color: palette.textSoft, fontSize: 11, textAlign: 'center' }}>{maskStellarAddress(wallet.publicKey)} · Keys stay on your device</Text>
  </>;
}
function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const { palette } = useMobileTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text accessibilityRole="header" style={{ flex: 1, color: palette.textDark, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 }}>{title}</Text>{action ? <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 10 }}><Text style={{ color: palette.rose, fontSize: 13, fontWeight: '600' }}>{action}</Text></Pressable> : null}</View>;
}
function ThemeSelector() {
  const { choice, setChoice } = useMobileTheme();
  return <Segments items={['System', 'Light', 'Dark']} active={choice[0].toUpperCase() + choice.slice(1)} onSelect={item => setChoice(item.toLowerCase() as 'system' | 'light' | 'dark')} />;
}
function BottomNav({ activeTab, onSelect }: { activeTab: string; onSelect: (tab: string) => void }) {
  const { palette } = useMobileTheme(); const insets = useSafeAreaInsets();
  return <View style={{ flexDirection: 'row', backgroundColor: palette.card, paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(8, insets.bottom ? 0 : 8), borderTopWidth: 1, borderColor: palette.borderSoft }}>{navItems.map(item => <Pressable key={item.label} accessibilityRole="tab" accessibilityLabel={`${item.label} tab`} accessibilityState={{ selected: activeTab === item.label }} onPress={() => onSelect(item.label)} style={{ flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 4 }}><View style={{ minWidth: 50, borderRadius: 16, backgroundColor: activeTab === item.label ? palette.surfaceStrong : 'transparent', alignItems: 'center', paddingVertical: 4 }}><Icon name={activeTab === item.label ? item.selected : item.icon} size={22} color={activeTab === item.label ? palette.rose : palette.textSoft} /></View><Text style={{ fontSize: 10, color: activeTab === item.label ? palette.rose : palette.textSoft, fontWeight: activeTab === item.label ? '700' : '500' }}>{item.label}</Text></Pressable>)}</View>;
}

function TransactionPanel({ mode = 'PAYMENT', wallet, walletReady, unlockWallet, isStillUnlocked, onReviewChange, onSigned, onResult }: {
  mode?: 'PAYMENT' | 'SWAP';
  wallet: MobileStoredWallet; walletReady: boolean; unlockWallet: (password: string) => Promise<boolean>;
  isStillUnlocked: () => boolean; onReviewChange: () => void; onSigned: (hash: string, expiresAt: string) => Promise<void>; onResult: (result: Awaited<ReturnType<typeof submitMobileTransaction>>) => Promise<void>;
}) {
  const { palette: colors } = useMobileTheme();
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const [destination, setDestination] = useState(''); const [amount, setAmount] = useState('');
  const [assetCode, setAssetCode] = useState<'XLM' | 'USDC'>('XLM'); const [memo, setMemo] = useState('');
  const [slippageBps, setSlippageBps] = useState(100);
  const [password, setPassword] = useState(''); const [review, setReview] = useState<MobileTransactionReview | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('Review every operation before signing. Testnet only.');
  async function prepare(trustline = false) {
    setBusy(true); setReview(null);
    try { const next = await prepareMobileTransaction(wallet.publicKey, trustline ? { kind: 'TRUSTLINE' } : mode === 'SWAP' ? { kind: 'SWAP', amount: amount.trim(), assetCode, destinationAssetCode: assetCode === 'XLM' ? 'USDC' : 'XLM', slippageBps, memo } : { kind: 'PAYMENT', destination: destination.trim().toUpperCase(), amount: amount.trim(), assetCode, memo }); if (isStillUnlocked()) { setReview(next); setMessage('Review destination, amount, asset issuer, memo and fee.'); onReviewChange(); } }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Review could not be prepared.'); }
    finally { setBusy(false); }
  }
  async function sign() {
    if (!review || !walletReady || !isStillUnlocked()) return;
    setBusy(true);
    try {
      if (!await unlockWallet(password) || !active.current || !isStillUnlocked()) throw new Error('Unlock failed or review closed. No transaction signed.');
      setPassword(''); setMessage('Submitting to Testnet. Waiting for ledger confirmation...');
      const result = await submitMobileTransaction(review, wallet.secretKey, async hash => {
        if (!active.current || !isStillUnlocked()) throw new Error('Review closed or wallet locked before submission.');
        await onSigned(hash, review.expiresAt);
        if (!active.current || !isStillUnlocked()) throw new Error('Submission paused. Check the saved transaction hash before trying again.');
      });
      setMessage(result.message); setReview(null); await onResult(result);
    } catch (error) { setPassword(''); setMessage(error instanceof Error ? error.message : 'Submission could not be confirmed.'); }
    finally { setBusy(false); }
  }
  return <Card>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Icon name={review ? 'shield-checkmark-outline' : 'paper-plane-outline'} color={colors.rose} /><Text style={{ color: colors.textDark, fontSize: 19, fontWeight: '700' }}>{review ? 'Review transaction' : mode === 'SWAP' ? 'Swap XLM ↔ USDC on Testnet' : 'Send on Stellar Testnet'}</Text></View>
    <Text accessibilityLiveRegion="polite" style={{ color: colors.textMid, fontSize: 13, lineHeight: 20 }}>{message}</Text>
    {!review ? <>
      {mode === 'PAYMENT' ? <Field label="Destination public key" value={destination} onChangeText={setDestination} placeholder="G… Stellar address" autoCapitalize="characters" autoCorrect={false} /> : <Body>Swap into your own wallet only. Both assets are Testnet assets with no monetary value. Official USDC trustline and live liquidity are required.</Body>}
      <Field label="Send amount" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
      <Segments items={['XLM', 'USDC']} active={assetCode} onSelect={value => setAssetCode(value as 'XLM' | 'USDC')} />
      {mode === 'SWAP' ? <><Body>Receive {assetCode === 'XLM' ? 'USDC' : 'XLM'} · Maximum slippage</Body><Segments items={['0.5%', '1%', '2%']} active={`${slippageBps / 100}%`} onSelect={value => setSlippageBps(Number(value.replace('%', '')) * 100)} disabled={busy} /></> : null}
      <Field label="Memo (optional)" value={memo} onChangeText={setMemo} placeholder="What’s it for?" />
      <Button label={busy ? 'Preparing review...' : mode === 'SWAP' ? 'Review swap' : 'Review payment'} disabled={busy || !walletReady} onPress={() => { void prepare(); }} icon="arrow-forward" />
      <Button label="Review USDC trustline" disabled={busy || !walletReady} onPress={() => { void prepare(true); }} secondary />
      {!walletReady ? <Body>Wallet signing is blocked until backup and pending transaction checks are complete.</Body> : null}
    </> : <>
      <ReviewRow label="Network" value="Stellar Testnet" /><ReviewRow label="Operation" value={review.kind} /><ReviewRow label="Source" value={review.source} /><ReviewRow label="Amount / limit" value={`${review.amount} ${review.assetCode}`} /><ReviewRow label="Destination" value={review.destination} /><ReviewRow label="Asset issuer" value={review.issuer ?? 'Native XLM'} /><ReviewRow label="Fee" value={`${review.feeStroops} stroops`} /><ReviewRow label="Memo" value={review.memo || 'None'} /><ReviewRow label="Expires" value={review.expiresAt} />
      {review.swap ? <><ReviewRow label="Quoted output" value={`${review.swap.quotedAmount} ${review.swap.destinationAssetCode}`} /><ReviewRow label="Minimum received" value={`${review.swap.minimumAmount} ${review.swap.destinationAssetCode}`} /><ReviewRow label="Receive issuer" value={review.swap.destinationAssetCode === 'USDC' ? 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' : 'Native XLM'} /><ReviewRow label="Maximum slippage" value={`${review.swap.slippageBps / 100}%`} /><ReviewRow label="Swap path" value={review.swap.path.join(' → ') || 'Direct'} /></> : null}
      <Field label="Signing password" secureTextEntry autoCapitalize="none" autoCorrect={false} value={password} onChangeText={setPassword} placeholder="Authorize on this device" />
      <Button label={busy ? 'Waiting for confirmation...' : 'Confirm and sign on device'} disabled={busy || !password || !walletReady} onPress={() => { void sign(); }} icon="lock-closed-outline" />
      <Button label="Cancel review" disabled={busy} onPress={() => { setReview(null); setPassword(''); onReviewChange(); }} secondary />
    </>}
  </Card>;
}
function ReviewRow({ label, value }: { label: string; value: string }) {
  const { palette } = useMobileTheme();
  return <View style={{ gap: 7, borderBottomWidth: 1, borderColor: palette.borderSoft, paddingBottom: 13 }}><Text style={{ color: palette.textSoft, fontSize: 12 }}>{label}</Text><Text selectable style={{ color: palette.textDark, fontSize: 14, lineHeight: 22 }}>{value}</Text></View>;
}
