import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { maskStellarAddress } from '@piggybanq/stellar-core/address';
import { useMobileSession } from '../auth/session';
import type { WalletSetupMode } from '../auth/types';
import { type MobileThemeChoice, type MobileThemePalette, useMobileTheme } from '../theme';
import type { MobileStoredWallet } from '../wallet/create-local-wallet';
import { type WalletActivationStatus } from '../wallet/local-wallet';

const savingsCards = [
  { label: 'Emergency', value: 'PHP 8,400', meta: '42% funded' },
  { label: 'Bills', value: 'PHP 3,250', meta: 'Next due Friday' },
  { label: 'Learning', value: 'PHP 1,600', meta: 'Auto-save weekly' }
];
type DashboardAllocation = {
  amount: string;
  currency: 'PHP' | 'USD' | 'XLM' | 'USDC';
  id: string;
  name: string;
};
const starterAllocations: DashboardAllocation[] = [
  { id: 'food', name: 'Food', amount: '4500.00', currency: 'PHP' },
  { id: 'bills', name: 'Bills', amount: '6200.00', currency: 'PHP' },
  { id: 'emergency', name: 'Emergency', amount: '2000.00', currency: 'PHP' }
];
const pockets = [
  { label: 'XLM starter', value: '18.4 XLM', meta: 'Native asset' },
  { label: 'USDC pocket', value: 'PHP 2,000 est.', meta: 'Trustline required' }
];
const aprMethods = [
  {
    title: 'Crypto Lending',
    status: 'Research mode',
    summary: 'Deposit assets into a lending platform where borrowers pay interest back to suppliers.'
  },
  {
    title: 'Liquidity Mining / Yield Farming',
    status: 'DEX pool review',
    summary: 'Supply assets to a liquidity pool so traders can swap tokens, earning a share of transaction fees.'
  },
  {
    title: 'Staking',
    status: 'Native-token only',
    summary: 'Lock native proof-of-stake tokens to help validate transactions and receive network rewards.'
  }
];
const navItems = ['Overview', 'Pockets', 'Goals', 'Security'];

export function DashboardHome() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [allocations, setAllocations] = useState<DashboardAllocation[]>(starterAllocations);
  const { palette: colors } = useMobileTheme();
  const {
    activationStatus,
    backupConfirmed,
    confirmBackup,
    createLocalWallet,
    importSecretKey,
    importWallet,
    isCreating,
    paymentReview,
    revealSecretForBackup,
    secretVisible,
    setImportSecretKey,
    setWalletSetupMode,
    status,
    wallet,
    walletReady,
    walletSetupMode
  } = useMobileSession();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, padding: 18, paddingBottom: 108 }}
      >
        <Header wallet={wallet} walletReady={walletReady} />
        <WalletPanel
          activationStatus={activationStatus}
          backupConfirmed={backupConfirmed}
          importSecretKey={importSecretKey}
          isCreating={isCreating}
          onChangeImportSecretKey={setImportSecretKey}
          onConfirmBackup={confirmBackup}
          onCreateWallet={createLocalWallet}
          onImportWallet={importWallet}
          onRevealSecret={revealSecretForBackup}
          onSelectWalletSetupMode={setWalletSetupMode}
          secretVisible={secretVisible}
          status={status}
          wallet={wallet}
          walletReady={walletReady}
          walletSetupMode={walletSetupMode}
        />
        <AllocationEditorPanel allocations={allocations} onChange={setAllocations} />
        <SavingsWorkspace />
        <PocketsPanel />
        <AprMethodsPanel />
        <GoalsPanel />
        <TransactionReview review={paymentReview} walletReady={walletReady} />
        <SecurityPanel />
      </ScrollView>
      <BottomNav activeTab={activeTab} onSelect={setActiveTab} />
    </View>
  );
}

function Header({ wallet, walletReady }: { wallet: MobileStoredWallet | null; walletReady: boolean }) {
  const { choice, palette: colors, resolvedTheme, setChoice } = useMobileTheme();

  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={createEyebrowStyle(colors)}>PIGGYBANQ TESTNET</Text>
          <Text style={{ color: colors.textDark, fontSize: 34, fontWeight: '800', lineHeight: 38 }}>
            Savings workspace
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
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
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={label === 'Amount' ? '1500.00' : 'Food'}
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

function WalletPanel({
  activationStatus,
  backupConfirmed,
  importSecretKey,
  isCreating,
  onChangeImportSecretKey,
  onConfirmBackup,
  onCreateWallet,
  onImportWallet,
  onRevealSecret,
  onSelectWalletSetupMode,
  secretVisible,
  status,
  wallet,
  walletReady,
  walletSetupMode
}: {
  activationStatus: WalletActivationStatus;
  backupConfirmed: boolean;
  importSecretKey: string;
  isCreating: boolean;
  onChangeImportSecretKey: (secretKey: string) => void;
  onConfirmBackup: () => void;
  onCreateWallet: () => void;
  onImportWallet: () => void;
  onRevealSecret: () => void;
  onSelectWalletSetupMode: (mode: WalletSetupMode) => void;
  secretVisible: boolean;
  status: string;
  wallet: MobileStoredWallet | null;
  walletReady: boolean;
  walletSetupMode: WalletSetupMode;
}) {
  const { palette: colors } = useMobileTheme();

  return (
    <View style={createPanelStyle(colors)}>
      <PanelTitle title="Local wallet" action={activationStatusLabel(activationStatus)} />
      <Text style={createBodyStyle(colors)}>{status}</Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <ModeButton active={walletSetupMode === 'create'} label="Create wallet" onPress={() => onSelectWalletSetupMode('create')} />
        <ModeButton active={walletSetupMode === 'import'} label="Import existing wallet" onPress={() => onSelectWalletSetupMode('import')} />
      </View>

      {wallet ? (
        <View style={{ gap: 10 }}>
          <InfoRow label="Public key" value={wallet.publicKey} selectable />
          <InfoRow label="Created" value={new Date(wallet.createdAt).toLocaleString()} />
          <InfoRow label="Source" value={wallet.source === 'imported-secret' ? 'Imported secret key' : 'Created on this device'} />
          <InfoRow
            label="Storage"
            value={wallet.storageKind === 'web-preview-fallback' ? 'Web preview fallback - use Android for SecureStore activation' : 'Expo SecureStore'}
          />
          <View style={{ borderTopColor: colors.peach, borderTopWidth: 1, gap: 10, paddingTop: 12 }}>
            <Text style={createEyebrowStyle(colors)}>Back up secret key</Text>
            <Text selectable style={{ color: colors.textDark, fontSize: 13, lineHeight: 20 }}>
              {secretVisible ? wallet.secretKey : 'Hidden until device authentication succeeds.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <ActionButton label="Reveal" onPress={onRevealSecret} variant="secondary" />
              <ActionButton label={backupConfirmed ? 'Backed up' : 'I saved it'} onPress={onConfirmBackup} variant={backupConfirmed ? 'success' : 'primary'} />
            </View>
          </View>
        </View>
      ) : null}

      {walletSetupMode === 'import' ? (
        <View style={{ gap: 10 }}>
          <TextInput
            accessibilityLabel="Stellar secret key"
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={onChangeImportSecretKey}
            placeholder="S... Stellar secret key"
            placeholderTextColor={colors.textMid}
            secureTextEntry
            style={createInputStyle(colors)}
            value={importSecretKey}
          />
          <ActionButton
            disabled={isCreating}
            label={isCreating ? 'Importing...' : 'Import Stellar secret key'}
            onPress={onImportWallet}
            variant="primary"
          />
        </View>
      ) : (
        <ActionButton
          disabled={isCreating}
          label={isCreating ? 'Creating...' : wallet ? 'Replace testnet wallet' : 'Create testnet wallet'}
          onPress={onCreateWallet}
          variant="primary"
        />
      )}

      <Text style={{ color: walletReady ? colors.green : colors.textMid, fontSize: 12, fontWeight: '700', lineHeight: 18 }}>
        {walletReady ? 'Wallet activation complete for testnet review flows.' : 'Transfers stay locked until wallet storage and backup are confirmed.'}
      </Text>
    </View>
  );
}

function ModeButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const { palette: colors } = useMobileTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: active ? colors.rose : colors.card,
        borderColor: active ? colors.rose : colors.peach,
        borderRadius: 8,
        borderWidth: 1,
        flex: 1,
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10
      }}
    >
      <Text style={{ color: active ? colors.white : colors.textDark, fontSize: 12, fontWeight: '800', textAlign: 'center' }}>
        {label}
      </Text>
    </Pressable>
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

function SavingsWorkspace() {
  const { palette: colors } = useMobileTheme();

  return (
    <View style={createPanelStyle(colors)}>
      <PanelTitle title="Savings momentum" action="Monthly" />
      <View style={{ flexDirection: 'row', gap: 8, minHeight: 116 }}>
        {[42, 68, 52, 78, 64].map((height, index) => (
          <View key={height} style={{ alignItems: 'center', flex: 1, justifyContent: 'flex-end', gap: 7 }}>
            <View style={{ backgroundColor: colors.surfaceStrong, borderRadius: 10, height: 92, justifyContent: 'flex-end', overflow: 'hidden', width: '100%' }}>
              <View style={{ backgroundColor: index === 3 ? colors.rose : colors.salmon, borderRadius: 10, height: `${height}%` }} />
            </View>
            <Text style={{ color: colors.textMid, fontSize: 11 }}>W{index + 1}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        {savingsCards.map((card) => <SummaryCard key={card.label} {...card} />)}
      </View>
    </View>
  );
}

function PocketsPanel() {
  const { palette: colors } = useMobileTheme();

  return (
    <View style={createPanelStyle(colors)}>
      <PanelTitle title="Earning pockets" action="2 active" />
      {pockets.map((pocket) => <SummaryCard key={pocket.label} {...pocket} />)}
    </View>
  );
}

function AprMethodsPanel() {
  const { palette: colors } = useMobileTheme();

  return (
    <View style={createPanelStyle(colors)}>
      <PanelTitle title="Common ways to earn APR" action="Education" />
      {aprMethods.map((method) => (
        <View
          key={method.title}
          style={{ backgroundColor: colors.card, borderColor: colors.borderSoft, borderRadius: 8, borderWidth: 1, gap: 6, padding: 12 }}
        >
          <Text style={createEyebrowStyle(colors)}>{method.status}</Text>
          <Text style={{ color: colors.textDark, fontSize: 16, fontWeight: '800' }}>{method.title}</Text>
          <Text style={{ color: colors.textMid, fontSize: 13, lineHeight: 19 }}>{method.summary}</Text>
        </View>
      ))}
      <Text style={[createWarningStyle(colors), { color: colors.textDark }]}>
        APR is not guaranteed. Review risk, trustlines, amount, asset, destination, and fee before signing any earning transaction.
      </Text>
    </View>
  );
}

function GoalsPanel() {
  const { palette: colors } = useMobileTheme();

  return (
    <View style={createPanelStyle(colors)}>
      <PanelTitle title="Goals" action="Testnet" />
      <SummaryCard label="School emergency fund" value="PHP 12,000 target" meta="70% confidence path" />
      <SummaryCard label="Family buffer" value="PHP 6,500 target" meta="Auto-save review needed" />
    </View>
  );
}

function TransactionReview({ review, walletReady }: { review: ReturnType<typeof import('../wallet/local-wallet').createMobilePaymentReview>; walletReady: boolean }) {
  const { palette: colors } = useMobileTheme();

  return (
    <View style={createPanelStyle(colors)}>
      <PanelTitle title="Transaction review" action={walletReady ? 'Ready' : 'Locked'} />
      <InfoRow label="Amount" value={`${review.confirmation.amount} ${review.confirmation.assetCode}`} />
      <InfoRow label="Destination" value={maskStellarAddress(review.confirmation.destination)} />
      <InfoRow label="Fee" value={`${review.confirmation.estimatedFeeStroops} stroops`} />
      <InfoRow label="Network" value={review.networkLabel} />
      <Text style={createBodyStyle(colors)}>{review.pollingCopy}</Text>
      {review.requiresTrustline ? (
        <Text style={createWarningStyle(colors)}>USDC requires a receiving trustline before anchor handoff or payment receipt.</Text>
      ) : null}
      <ActionButton disabled={!walletReady} label="Review before signing" onPress={() => undefined} variant="primary" />
    </View>
  );
}

function SecurityPanel() {
  const { palette: colors } = useMobileTheme();

  return (
    <View style={[createPanelStyle(colors), { backgroundColor: colors.plum }]}>
      <Text style={{ color: colors.white, fontSize: 15, fontWeight: '800' }}>Self-custodial safety</Text>
      <Text style={{ color: colors.white, fontSize: 14, lineHeight: 21, opacity: 0.82 }}>
        No silent signing. Confirm amount, asset, destination, and fee before every transaction. PENDING results must be polled until SUCCESS or failure.
      </Text>
    </View>
  );
}

function BottomNav({ activeTab, onSelect }: { activeTab: string; onSelect: (tab: string) => void }) {
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
      paddingBottom: 18,
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

function activationStatusLabel(status: WalletActivationStatus) {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'needs_backup':
      return 'Backup needed';
    case 'needs_secure_store':
      return 'Storage needed';
    case 'needs_wallet':
    default:
      return 'Empty';
  }
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
