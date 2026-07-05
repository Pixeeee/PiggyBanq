import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { createAndStoreLocalWallet, loadStoredLocalWallet, type MobileStoredWallet } from '../src/wallet/create-local-wallet';

const palette = {
  cream: '#FFF7CD',
  peach: '#FDC3A1',
  salmon: '#FB9B8F',
  rose: '#F57799',
  textDark: '#4A2C2A',
  textMid: '#7A4A45',
  surface: '#FFF0E0'
};

export default function Index() {
  const [wallet, setWallet] = useState<MobileStoredWallet | null>(null);
  const [status, setStatus] = useState('Wallet keys are generated on-device and stored in SecureStore.');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadStoredLocalWallet()
      .then((storedWallet) => {
        if (!mounted || !storedWallet) {
          return;
        }

        setWallet(storedWallet);
        setStatus('Wallet loaded from SecureStore.');
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

    try {
      const nextWallet = await createAndStoreLocalWallet();
      setWallet(nextWallet);
      setStatus('Wallet created. Back up your secret key before using real funds.');
    } catch {
      setStatus('Wallet creation failed on this device.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: palette.cream }}
      contentContainerStyle={{ gap: 18, padding: 20, paddingBottom: 40 }}
    >
      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: palette.rose, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>
          PIGGYBANQ TESTNET
        </Text>
        <Text selectable style={{ color: palette.textDark, fontSize: 38, fontWeight: '800', lineHeight: 42 }}>
          Create your wallet
        </Text>
        <Text selectable style={{ color: palette.textMid, fontSize: 16, lineHeight: 23 }}>
          Generate a self-custodial Stellar wallet on this device. The backend should only ever receive your public key.
        </Text>
      </View>

      <View
        style={{
          gap: 16,
          borderColor: palette.peach,
          borderRadius: 18,
          borderWidth: 1,
          backgroundColor: palette.surface,
          padding: 18
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Text selectable style={{ color: palette.textDark, fontSize: 12, fontWeight: '800', letterSpacing: 1.3 }}>
            LOCAL WALLET
          </Text>
          <Text selectable style={{ color: wallet ? palette.rose : palette.textMid, fontSize: 12, fontWeight: '800' }}>
            {wallet ? 'READY' : 'EMPTY'}
          </Text>
        </View>

        <Text selectable style={{ color: palette.textMid, fontSize: 14, lineHeight: 21 }}>
          {status}
        </Text>

        {wallet ? (
          <View style={{ gap: 10, borderTopColor: palette.peach, borderTopWidth: 1, paddingTop: 14 }}>
            <Text selectable style={{ color: palette.textMid, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }}>
              PUBLIC KEY
            </Text>
            <Text selectable style={{ color: palette.textDark, fontSize: 13, lineHeight: 20 }}>
              {wallet.publicKey}
            </Text>
            <Text selectable style={{ color: palette.textMid, fontSize: 12 }}>
              Created {new Date(wallet.createdAt).toLocaleString()}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={isCreating}
          onPress={handleCreateWallet}
          style={{
            alignItems: 'center',
            borderRadius: 10,
            backgroundColor: palette.rose,
            opacity: isCreating ? 0.7 : 1,
            paddingHorizontal: 16,
            paddingVertical: 14
          }}
        >
          <Text style={{ color: palette.cream, fontSize: 13, fontWeight: '800', letterSpacing: 1 }}>
            {isCreating ? 'Creating...' : wallet ? 'Replace testnet wallet' : 'Create testnet wallet'}
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          gap: 8,
          borderColor: palette.peach,
          borderRadius: 18,
          borderWidth: 1,
          backgroundColor: '#FFF8ED',
          padding: 18
        }}
      >
        <Text selectable style={{ color: palette.textDark, fontSize: 14, fontWeight: '800' }}>
          Security boundary
        </Text>
        <Text selectable style={{ color: palette.textMid, fontSize: 14, lineHeight: 21 }}>
          PiggyBanq cannot recover this key. Store only public keys on the server, and require backup confirmation before real transfers.
        </Text>
      </View>
    </ScrollView>
  );
}
