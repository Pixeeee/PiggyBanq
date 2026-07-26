import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { maskStellarAddress } from '@piggybanq/stellar-core/address';

import { createAndStoreLocalWallet, importAndStoreLocalWallet, loadStoredLocalWallet, type MobileStoredWallet } from '../src/wallet/create-local-wallet';
import { canActivateWallet, createMobilePaymentReview, getWalletActivationStatus, type WalletActivationStatus } from '../src/wallet/local-wallet';

const piggyImage = require('../assets/piggy.gif');

const palette = {
  background: '#FFF1E9',
  surface: '#FFF0E0',
  surfaceStrong: '#FFE4C8',
  peach: '#FDC3A1',
  salmon: '#FB9B8F',
  rose: '#F57799',
  plum: '#57314B',
  green: '#1D7A59',
  textDark: '#4A2C2A',
  textMid: '#7A4A45',
  white: '#FFFFFF'
};

const sampleDestination = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const savingsCards = [
  { label: 'Emergency', value: 'PHP 8,400', meta: '42% funded' },
  { label: 'Bills', value: 'PHP 3,250', meta: 'Next due Friday' },
  { label: 'Learning', value: 'PHP 1,600', meta: 'Auto-save weekly' }
];
const pockets = [
  { label: 'XLM starter', value: '18.4 XLM', meta: 'Native asset' },
  { label: 'USDC pocket', value: 'PHP 2,000 est.', meta: 'Trustline required' }
];
const navItems = ['Overview', 'Pockets', 'Goals', 'Security'];

export default function Index() {
  const [wallet, setWallet] = useState<MobileStoredWallet | null>(null);
  const [status, setStatus] = useState('Wallet keys are generated on-device and stored in SecureStore.');
  const [isCreating, setIsCreating] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);
  const [walletSetupMode, setWalletSetupMode] = useState<'entry' | 'create' | 'import'>('entry');
  const [importSecretKey, setImportSecretKey] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');

  const activationState = {
    publicKey: wallet?.publicKey ?? '',
    mnemonicBackedUp: backupConfirmed,
    storedInSecureStore: wallet?.storageKind !== 'web-preview-fallback' && Boolean(wallet)
  };
  const activationStatus = getWalletActivationStatus(activationState);
  const walletReady = canActivateWallet(activationState);
  const paymentReview = useMemo(() => createMobilePaymentReview({
    amount: '25.00',
    assetCode: 'USDC',
    destination: sampleDestination,
    estimatedFeeStroops: '100'
  }), []);

  useEffect(() => {
    let mounted = true;

    loadStoredLocalWallet()
      .then((storedWallet) => {
        if (!mounted || !storedWallet) {
          return;
        }

        setWallet(storedWallet);
        setStatus('Wallet loaded from SecureStore. Confirm backup before activating transfers.');
      })
      .catch(() => {
        if (mounted) {
          setStatus('SecureStore wallet check failed. Try creating a fresh testnet wallet.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleCreateWallet() {
    setIsCreating(true);
    setSecretVisible(false);
    setBackupConfirmed(false);

    try {
      const nextWallet = await createAndStoreLocalWallet();
      setWallet(nextWallet);
      setStatus('Wallet created. Back up secret key before activating transfers.');
    } catch {
      setStatus('Wallet creation failed on this device.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleImportWallet() {
    if (!importSecretKey.trim()) {
      setStatus('Paste a Stellar secret key before importing.');
      return;
    }

    setIsCreating(true);
    setSecretVisible(false);
    setBackupConfirmed(false);

    try {
      const nextWallet = await importAndStoreLocalWallet(importSecretKey);
      setWallet(nextWallet);
      setImportSecretKey('');
      setStatus('Wallet imported. Back up secret key before activating transfers.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Wallet import failed on this device.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevealSecretForBackup() {
    if (!wallet) {
      setStatus('Create a testnet wallet before backup.');
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Back up PiggyBanq wallet',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false
      });

      if (!result.success) {
        setStatus('Device authentication cancelled. Secret key remains hidden.');
        return;
      }
    }

    setSecretVisible(true);
    setStatus('Secret key revealed locally. PiggyBanq cannot recover it for you.');
  }

  function confirmBackup() {
    if (!secretVisible) {
      setStatus('Reveal and save the secret key before confirming backup.');
      return;
    }

    setBackupConfirmed(true);
    setStatus('Backup confirmed. Wallet is active for testnet review flows.');
  }

  if (!wallet && walletSetupMode === 'entry') {
    return (
      <MobileWalletEntry
        isCreating={isCreating}
        onCreate={handleCreateWallet}
        onImport={() => setWalletSetupMode('import')}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, padding: 18, paddingBottom: 108 }}
      >
        <Header wallet={wallet} walletReady={walletReady} />
        <WalletPanel
          activationStatus={activationStatus}
          backupConfirmed={backupConfirmed}
          isCreating={isCreating}
          importSecretKey={importSecretKey}
          onChangeImportSecretKey={setImportSecretKey}
          onConfirmBackup={confirmBackup}
          onCreateWallet={handleCreateWallet}
          onImportWallet={handleImportWallet}
          onRevealSecret={handleRevealSecretForBackup}
          onSelectWalletSetupMode={setWalletSetupMode}
          secretVisible={secretVisible}
          status={status}
          wallet={wallet}
          walletReady={walletReady}
          walletSetupMode={walletSetupMode === 'entry' ? 'create' : walletSetupMode}
        />
        <SavingsWorkspace />
        <PocketsPanel />
        <GoalsPanel />
        <TransactionReview review={paymentReview} walletReady={walletReady} />
        <SecurityPanel />
      </ScrollView>
      <BottomNav activeTab={activeTab} onSelect={setActiveTab} />
    </View>
  );
}

function MobileWalletEntry({
  isCreating,
  onCreate,
  onImport
}: {
  isCreating: boolean;
  onCreate: () => void;
  onImport: () => void;
}) {
  return (
    <View style={entryScreenStyle}>
      <View style={entryBrandStyle}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={entryTitleStyle}>
          PiggyBanq
        </Text>
        <Text style={entrySubtitleStyle}>Stellar self-custodial wallet</Text>
      </View>

      <View style={entryActionsStyle}>
        <Pressable
          accessibilityRole="button"
          disabled={isCreating}
          onPress={onCreate}
          style={[entryButtonStyle, entryPrimaryButtonStyle, isCreating ? entryDisabledButtonStyle : null]}
        >
          <Text style={entryPrimaryButtonTextStyle}>{isCreating ? 'Creating...' : 'Create a new wallet'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isCreating}
          onPress={onImport}
          style={[entryButtonStyle, entrySecondaryButtonStyle, isCreating ? entryDisabledButtonStyle : null]}
        >
          <Text style={entrySecondaryButtonTextStyle}>I have an existing wallet</Text>
        </Pressable>
      </View>

      <View style={entryPigStageStyle}>
        <Image resizeMode="contain" source={piggyImage} style={entryPigImageStyle} />
      </View>
    </View>
  );
}

function Header({ wallet, walletReady }: { wallet: MobileStoredWallet | null; walletReady: boolean }) {  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={eyebrowStyle}>PIGGYBANQ TESTNET</Text>
          <Text style={{ color: palette.textDark, fontSize: 34, fontWeight: '800', lineHeight: 38 }}>
            Savings workspace
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ color: walletReady ? palette.green : palette.rose, fontSize: 12, fontWeight: '800' }}>
            {walletReady ? 'ACTIVE' : 'SETUP'}
          </Text>
          <Text selectable style={{ color: palette.textMid, fontSize: 12 }}>
            {wallet ? maskStellarAddress(wallet.publicKey) : 'No wallet'}
          </Text>
        </View>
      </View>
      <Text style={{ color: palette.textMid, fontSize: 15, lineHeight: 22 }}>
        Android-first savings tools for allocations, pockets, goals, and safe Stellar transaction review. Secret keys stay on this device.
      </Text>
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
  onSelectWalletSetupMode: (mode: 'create' | 'import') => void;
  secretVisible: boolean;
  status: string;
  wallet: MobileStoredWallet | null;
  walletReady: boolean;
  walletSetupMode: 'create' | 'import';
}) {
  return (
    <View style={panelStyle}>
      <PanelTitle title="Local wallet" action={activationStatusLabel(activationStatus)} />
      <Text style={bodyStyle}>{status}</Text>

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
          <View style={{ borderTopColor: palette.peach, borderTopWidth: 1, gap: 10, paddingTop: 12 }}>
            <Text style={eyebrowStyle}>Back up secret key</Text>
            <Text selectable style={{ color: palette.textDark, fontSize: 13, lineHeight: 20 }}>
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
            placeholderTextColor={palette.textMid}
            secureTextEntry
            style={inputStyle}
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

      <Text style={{ color: walletReady ? palette.green : palette.textMid, fontSize: 12, fontWeight: '700', lineHeight: 18 }}>
        {walletReady ? 'Wallet activation complete for testnet review flows.' : 'Transfers stay locked until wallet storage and backup are confirmed.'}
      </Text>
    </View>
  );
}

function ModeButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: active ? palette.rose : palette.white,
        borderColor: active ? palette.rose : palette.peach,
        borderRadius: 8,
        borderWidth: 1,
        flex: 1,
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10
      }}
    >
      <Text style={{ color: active ? palette.white : palette.textDark, fontSize: 12, fontWeight: '800', textAlign: 'center' }}>
        {label}
      </Text>
    </Pressable>
  );
}
function SavingsWorkspace() {
  return (
    <View style={panelStyle}>
      <PanelTitle title="Savings momentum" action="Monthly" />
      <View style={{ flexDirection: 'row', gap: 8, minHeight: 116 }}>
        {[42, 68, 52, 78, 64].map((height, index) => (
          <View key={height} style={{ alignItems: 'center', flex: 1, justifyContent: 'flex-end', gap: 7 }}>
            <View style={{ backgroundColor: palette.surfaceStrong, borderRadius: 10, height: 92, justifyContent: 'flex-end', overflow: 'hidden', width: '100%' }}>
              <View style={{ backgroundColor: index === 3 ? palette.rose : palette.salmon, borderRadius: 10, height: `${height}%` }} />
            </View>
            <Text style={{ color: palette.textMid, fontSize: 11 }}>W{index + 1}</Text>
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
  return (
    <View style={panelStyle}>
      <PanelTitle title="Earning pockets" action="2 active" />
      {pockets.map((pocket) => <SummaryCard key={pocket.label} {...pocket} />)}
    </View>
  );
}

function GoalsPanel() {
  return (
    <View style={panelStyle}>
      <PanelTitle title="Goals" action="Testnet" />
      <SummaryCard label="School emergency fund" value="PHP 12,000 target" meta="70% confidence path" />
      <SummaryCard label="Family buffer" value="PHP 6,500 target" meta="Auto-save review needed" />
    </View>
  );
}

function TransactionReview({ review, walletReady }: { review: ReturnType<typeof createMobilePaymentReview>; walletReady: boolean }) {
  return (
    <View style={panelStyle}>
      <PanelTitle title="Transaction review" action={walletReady ? 'Ready' : 'Locked'} />
      <InfoRow label="Amount" value={`${review.confirmation.amount} ${review.confirmation.assetCode}`} />
      <InfoRow label="Destination" value={maskStellarAddress(review.confirmation.destination)} />
      <InfoRow label="Fee" value={`${review.confirmation.estimatedFeeStroops} stroops`} />
      <InfoRow label="Network" value={review.networkLabel} />
      <Text style={bodyStyle}>{review.pollingCopy}</Text>
      {review.requiresTrustline ? (
        <Text style={warningStyle}>USDC requires a receiving trustline before anchor handoff or payment receipt.</Text>
      ) : null}
      <ActionButton disabled={!walletReady} label="Review before signing" onPress={() => undefined} variant="primary" />
    </View>
  );
}

function SecurityPanel() {
  return (
    <View style={[panelStyle, { backgroundColor: palette.plum }]}>
      <Text style={{ color: palette.white, fontSize: 15, fontWeight: '800' }}>Self-custodial safety</Text>
      <Text style={{ color: '#FFE9D6', fontSize: 14, lineHeight: 21 }}>
        No silent signing. Confirm amount, asset, destination, and fee before every transaction. PENDING results must be polled until SUCCESS or failure.
      </Text>
    </View>
  );
}

function BottomNav({ activeTab, onSelect }: { activeTab: string; onSelect: (tab: string) => void }) {
  return (
    <View style={{
      backgroundColor: palette.white,
      borderTopColor: palette.peach,
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
            backgroundColor: activeTab === item ? palette.surfaceStrong : palette.white,
            borderRadius: 8,
            flex: 1,
            minHeight: 48,
            justifyContent: 'center'
          }}
        >
          <Text style={{ color: activeTab === item ? palette.rose : palette.textMid, fontSize: 11, fontWeight: '800' }}>
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function PanelTitle({ action, title }: { action: string; title: string }) {
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: palette.textDark, fontSize: 18, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: palette.rose, fontSize: 12, fontWeight: '800' }}>{action}</Text>
    </View>
  );
}

function InfoRow({ label, selectable, value }: { label: string; selectable?: boolean; value: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={eyebrowStyle}>{label}</Text>
      <Text selectable={selectable} style={{ color: palette.textDark, fontSize: 13, lineHeight: 20 }}>{value}</Text>
    </View>
  );
}

function SummaryCard({ label, meta, value }: { label: string; meta: string; value: string }) {
  return (
    <View style={{ backgroundColor: palette.white, borderRadius: 8, gap: 4, padding: 12 }}>
      <Text style={{ color: palette.textDark, fontSize: 15, fontWeight: '800' }}>{label}</Text>
      <Text style={{ color: palette.textDark, fontSize: 20, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: palette.textMid, fontSize: 12 }}>{meta}</Text>
    </View>
  );
}

function ActionButton({ disabled, label, onPress, variant }: { disabled?: boolean; label: string; onPress: () => void; variant: 'primary' | 'secondary' | 'success' }) {
  const backgroundColor = variant === 'secondary' ? palette.surfaceStrong : variant === 'success' ? palette.green : palette.rose;
  const color = variant === 'secondary' ? palette.textDark : palette.white;

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

const entryScreenStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.background,
  flex: 1,
  justifyContent: 'flex-start' as const,
  paddingBottom: 26,
  paddingHorizontal: 22,
  paddingTop: 72
};

const entryBrandStyle = {
  alignItems: 'center' as const,
  gap: 4,
  width: '100%' as const
};

const entryTitleStyle = {
  color: palette.rose,
  fontSize: 56,
  fontWeight: '900' as const,
  letterSpacing: 0,
  lineHeight: 62,
  textAlign: 'center' as const
};

const entrySubtitleStyle = {
  color: '#55504D',
  fontSize: 16,
  fontWeight: '800' as const,
  lineHeight: 22,
  textAlign: 'center' as const
};

const entryActionsStyle = {
  gap: 14,
  marginTop: 84,
  maxWidth: 430,
  width: '100%' as const
};

const entryButtonStyle = {
  alignItems: 'center' as const,
  borderRadius: 8,
  justifyContent: 'center' as const,
  minHeight: 60,
  paddingHorizontal: 18,
  paddingVertical: 14
};

const entryPrimaryButtonStyle = {
  backgroundColor: '#111214'
};

const entrySecondaryButtonStyle = {
  backgroundColor: palette.white
};

const entryDisabledButtonStyle = {
  opacity: 0.58
};

const entryPrimaryButtonTextStyle = {
  color: palette.white,
  fontSize: 17,
  fontWeight: '900' as const,
  lineHeight: 23,
  textAlign: 'center' as const
};

const entrySecondaryButtonTextStyle = {
  color: '#090A0B',
  fontSize: 17,
  fontWeight: '900' as const,
  lineHeight: 23,
  textAlign: 'center' as const
};

const entryPigStageStyle = {
  alignItems: 'center' as const,
  flex: 1,
  justifyContent: 'flex-end' as const,
  width: '100%' as const
};

const entryPigImageStyle = {
  height: 220,
  maxHeight: '42%' as const,
  maxWidth: 410,
  width: '82%' as const
};

const panelStyle = {  backgroundColor: palette.surface,
  borderColor: palette.peach,
  borderRadius: 8,
  borderWidth: 1,
  gap: 14,
  padding: 16
};

const eyebrowStyle = {
  color: palette.textMid,
  fontSize: 11,
  fontWeight: '800' as const,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const
};

const bodyStyle = {
  color: palette.textMid,
  fontSize: 14,
  lineHeight: 21
};

const inputStyle = {
  backgroundColor: palette.white,
  borderColor: palette.peach,
  borderRadius: 8,
  borderWidth: 1,
  color: palette.textDark,
  fontSize: 13,
  minHeight: 48,
  paddingHorizontal: 12,
  paddingVertical: 12
};
const warningStyle = {
  backgroundColor: '#FFF8ED',
  borderColor: palette.peach,
  borderRadius: 8,
  borderWidth: 1,
  color: palette.textDark,
  fontSize: 13,
  lineHeight: 19,
  padding: 10
};
