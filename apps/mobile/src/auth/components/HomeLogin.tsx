import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createLoginFitLayout, palette, socialIdentityProviders } from '../layout';
import type { ProviderId } from '../types';
import { linkButtonPressedTextStyle } from './AuthCard';
import { WalletPreviewCard } from './WalletPreviewCard';

export function HomeLogin({
  authError,
  authStatus,
  isCreating,
  onCreateLocalWallet,
  onImportWallet,
  onProviderConnect
}: {
  authError: string;
  authStatus: string;
  isCreating: boolean;
  onCreateLocalWallet: () => void;
  onImportWallet: () => void;
  onProviderConnect: (provider: ProviderId) => void;
}) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const loginFit = createLoginFitLayout({ height, insets, width });

  return (
    <View style={[entryScreenStyle, loginFit.screen]}>
      <View style={[entryChoiceStyle, { maxWidth: loginFit.maxWidth }]}>
        <View style={entrySegmentStyle}>
          <View style={entrySegmentActivePillStyle}>
            <Text style={entrySegmentActiveTextStyle}>Wallet</Text>
          </View>
          <View style={entrySegmentInactivePillStyle}>
            <Text style={entrySegmentInactiveTextStyle}>Savings</Text>
          </View>
        </View>

        <View style={[entryHeroStyle, { marginTop: loginFit.heroMarginTop }]}>
          <View style={entryHeroTitleBlockStyle}>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[entryHeroTitleStyle, { fontSize: loginFit.heroFontSize, lineHeight: loginFit.heroLineHeight }]}
            >
              A New Way
            </Text>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[entryHeroTitleStyle, entryHeroAccentStyle, { fontSize: loginFit.heroFontSize, lineHeight: loginFit.heroLineHeight }]}
            >
              To Save
            </Text>
          </View>
          <Text style={entryHeroSubtitleStyle}>Your self-custodial Stellar wallet.</Text>
        </View>

        <WalletPreviewCard marginTop={loginFit.walletCardMarginTop} minHeight={loginFit.walletCardMinHeight} pigSize={loginFit.walletPigSize} />

        <View style={[entryWalletButtonsStyle, { marginTop: loginFit.buttonMarginTop }]}>
          <Pressable accessibilityRole="button" onPress={onImportWallet} style={[entryWalletButtonStyle, { minHeight: loginFit.buttonMinHeight }]}>
            <Text style={entryWalletButtonTextStyle}>I have a wallet</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCreateLocalWallet} style={[entryCreateButtonStyle, { minHeight: loginFit.buttonMinHeight }]}>
            <Text style={entryCreateButtonTextStyle}>Create wallet</Text>
          </Pressable>
        </View>

        {__DEV__ ? <>
        <View style={[entryDividerStyle, { marginTop: loginFit.dividerMarginTop }]}>
          <View style={entryDividerLineStyle} />
          <Text style={entryDividerTextStyle}>OR CONTINUE WITH</Text>
          <View style={entryDividerLineStyle} />
        </View>

        <View style={[entryIdentityGridStyle, { marginTop: loginFit.identityMarginTop }]}>
          {socialIdentityProviders.map((provider) => (
            <Pressable
              accessibilityRole="button"
              key={provider.id}
              onPress={() => onProviderConnect(provider.id)}
              style={[entryIdentityCompactButtonStyle, { minHeight: loginFit.identityMinHeight }]}
            >
              <ProviderIcon provider={provider.id} />
              <View style={entryIdentityCompactCopyStyle}>
                <Text numberOfLines={1} style={entryIdentityCompactLabelStyle}>
                  {provider.id === 'privy' ? 'Privy' : 'Web3Auth'}
                </Text>
                <Text numberOfLines={1} style={entryIdentityCompactMetaStyle}>
                  Google, X, email, o...
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        </> : null}

        <View style={[entryFooterStyle, { marginTop: loginFit.footerMarginTop }]}>
          <Pressable accessibilityRole="button" onPress={onCreateLocalWallet} style={entryFooterLinkStyle}>
            {({ pressed }) => (
              <Text style={[entryFooterLinkTextStyle, pressed ? linkButtonPressedTextStyle : null]}>
                Create a local wallet instead
              </Text>
            )}
          </Pressable>
          <Text style={entryFooterSafetyTextStyle}>+ Keys never leave your device. Ever.</Text>
        </View>
      </View>

      {authStatus || authError ? (
        <View style={[toastStyle, authError ? errorToastStyle : null]}>
          <Text style={[toastTextStyle, authError ? errorToastTextStyle : null]}>{authError || authStatus}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ProviderIcon({ provider }: { provider: ProviderId }) {
  if (provider === 'privy') {
    return (
      <View style={entryPrivyIconStyle}>
        <View style={entryPrivyIconDotStyle} />
        <View style={entryPrivyIconShadowStyle} />
      </View>
    );
  }

  return (
    <View style={entryWeb3AuthIconStyle}>
      <Text style={entryWeb3AuthIconTextStyle}>W</Text>
    </View>
  );
}

const entryScreenStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.background,
  flex: 1,
  justifyContent: 'flex-start' as const,
  paddingBottom: 12,
  paddingHorizontal: 16,
  paddingTop: 10
};

const entryChoiceStyle = {
  alignItems: 'center' as const,
  flex: 1,
  justifyContent: 'flex-start' as const,
  maxWidth: 430,
  width: '100%' as const
};

const entrySegmentStyle = {
  alignItems: 'center' as const,
  alignSelf: 'center' as const,
  backgroundColor: 'rgba(255,255,255,0.82)',
  borderColor: '#F6CDD8',
  borderRadius: 999,
  borderWidth: 1,
  flexDirection: 'row' as const,
  gap: 4,
  minHeight: 31,
  padding: 4,
  shadowColor: '#8C5967',
  shadowOffset: { width: 0, height: 7 },
  shadowOpacity: 0.12,
  shadowRadius: 12
};

const entrySegmentActivePillStyle = {
  alignItems: 'center' as const,
  backgroundColor: '#15101A',
  borderRadius: 999,
  justifyContent: 'center' as const,
  minHeight: 23,
  minWidth: 74,
  paddingHorizontal: 13
};

const entrySegmentInactivePillStyle = {
  alignItems: 'center' as const,
  borderRadius: 999,
  justifyContent: 'center' as const,
  minHeight: 23,
  minWidth: 74,
  paddingHorizontal: 13
};

const entrySegmentActiveTextStyle = {
  color: palette.white,
  fontSize: 12,
  fontWeight: '900' as const,
  lineHeight: 15
};

const entrySegmentInactiveTextStyle = {
  color: '#856B77',
  fontSize: 12,
  fontWeight: '800' as const,
  lineHeight: 15
};

const entryHeroStyle = {
  alignItems: 'center' as const,
  gap: 8,
  marginTop: 49,
  width: '100%' as const
};

const entryHeroTitleBlockStyle = {
  alignItems: 'center' as const,
  gap: 0,
  width: '100%' as const
};

const entryHeroTitleStyle = {
  color: '#17101F',
  fontSize: 34,
  fontWeight: '900' as const,
  letterSpacing: 0,
  lineHeight: 37,
  textAlign: 'center' as const
};

const entryHeroAccentStyle = {
  color: palette.rose
};

const entryHeroSubtitleStyle = {
  color: '#927081',
  fontSize: 12,
  fontWeight: '800' as const,
  lineHeight: 16,
  textAlign: 'center' as const
};

const entryWalletButtonsStyle = {
  flexDirection: 'row' as const,
  gap: 10,
  marginTop: 44,
  width: '100%' as const
};

const entryWalletButtonStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.white,
  borderColor: '#EBD7CE',
  borderRadius: 18,
  borderWidth: 1,
  elevation: 3,
  flex: 1,
  justifyContent: 'center' as const,
  minHeight: 50,
  paddingHorizontal: 12,
  shadowColor: '#8B5865',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 12
};

const entryCreateButtonStyle = {
  alignItems: 'center' as const,
  backgroundColor: '#120F18',
  borderRadius: 18,
  elevation: 4,
  flex: 1,
  justifyContent: 'center' as const,
  minHeight: 50,
  paddingHorizontal: 12,
  shadowColor: '#2D1720',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 12
};

const entryWalletButtonTextStyle = {
  color: '#0F0C12',
  fontSize: 14,
  fontWeight: '900' as const,
  lineHeight: 18,
  textAlign: 'center' as const
};

const entryCreateButtonTextStyle = {
  color: palette.white,
  fontSize: 14,
  fontWeight: '900' as const,
  lineHeight: 18,
  textAlign: 'center' as const
};

const entryDividerStyle = {
  alignItems: 'center' as const,
  flexDirection: 'row' as const,
  gap: 12,
  marginTop: 45,
  width: '100%' as const
};

const entryDividerLineStyle = {
  backgroundColor: '#E8CBCB',
  flex: 1,
  height: 1
};

const entryDividerTextStyle = {
  color: '#A17F8E',
  fontSize: 10,
  fontWeight: '900' as const,
  letterSpacing: 1.5,
  lineHeight: 13
};

const entryIdentityGridStyle = {
  flexDirection: 'row' as const,
  gap: 10,
  marginTop: 15,
  width: '100%' as const
};

const entryIdentityCompactButtonStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.white,
  borderColor: '#EBD7CE',
  borderRadius: 16,
  borderWidth: 1,
  elevation: 2,
  flex: 1,
  flexDirection: 'row' as const,
  gap: 8,
  minHeight: 50,
  paddingHorizontal: 11,
  shadowColor: '#8B5865',
  shadowOffset: { width: 0, height: 7 },
  shadowOpacity: 0.09,
  shadowRadius: 10
};

const entryPrivyIconStyle = {
  alignItems: 'center' as const,
  backgroundColor: '#FF7A6E',
  borderRadius: 999,
  height: 30,
  justifyContent: 'center' as const,
  width: 30
};

const entryPrivyIconDotStyle = {
  backgroundColor: '#05020B',
  borderRadius: 999,
  height: 14,
  width: 14
};

const entryPrivyIconShadowStyle = {
  backgroundColor: '#05020B',
  borderRadius: 999,
  height: 3,
  marginTop: 3,
  width: 16
};

const entryWeb3AuthIconStyle = {
  alignItems: 'center' as const,
  backgroundColor: '#0364FF',
  borderRadius: 999,
  height: 30,
  justifyContent: 'center' as const,
  width: 30
};

const entryWeb3AuthIconTextStyle = {
  color: palette.white,
  fontSize: 18,
  fontWeight: '900' as const,
  lineHeight: 22
};

const entryIdentityCompactCopyStyle = {
  flex: 1,
  minWidth: 0
};

const entryIdentityCompactLabelStyle = {
  color: '#20171E',
  fontSize: 12,
  fontWeight: '900' as const,
  lineHeight: 15
};

const entryIdentityCompactMetaStyle = {
  color: '#856B77',
  fontSize: 9,
  fontWeight: '700' as const,
  lineHeight: 12
};

const entryFooterStyle = {
  alignItems: 'center' as const,
  gap: 4,
  marginTop: 44,
  paddingBottom: 2,
  width: '100%' as const
};

const entryFooterLinkStyle = {
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  minHeight: 25,
  paddingHorizontal: 12,
  paddingVertical: 4
};

const entryFooterLinkTextStyle = {
  color: palette.rose,
  fontSize: 13,
  fontWeight: '900' as const,
  lineHeight: 16,
  textAlign: 'center' as const
};

const entryFooterSafetyTextStyle = {
  color: '#927081',
  fontSize: 10,
  fontWeight: '800' as const,
  lineHeight: 13,
  textAlign: 'center' as const
};

const toastStyle = {
  alignSelf: 'center' as const,
  backgroundColor: '#241B28',
  borderRadius: 8,
  bottom: 18,
  maxWidth: 430,
  paddingHorizontal: 14,
  paddingVertical: 10,
  position: 'absolute' as const,
  width: '100%' as const
};

const errorToastStyle = {
  backgroundColor: '#FFE3E8'
};

const toastTextStyle = {
  color: palette.white,
  fontSize: 12,
  fontWeight: '800' as const,
  lineHeight: 16,
  textAlign: 'center' as const
};

const errorToastTextStyle = {
  color: '#9B1439'
};
