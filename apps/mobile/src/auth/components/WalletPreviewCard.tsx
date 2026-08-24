import { Image, Text, View } from 'react-native';
import { palette } from '../layout';

const piggyImage = require('../../../assets/piggy.gif');

export function WalletPreviewCard({
  marginTop,
  minHeight,
  pigSize
}: {
  marginTop: number;
  minHeight: number;
  pigSize: { height: number; width: number };
}) {
  return (
    <View style={[walletPreviewCardStyle, { marginTop, minHeight }]}>
      <View style={walletPreviewTopStyle}>
        <View style={walletPreviewCopyStyle}>
          <Text style={walletPreviewLabelStyle}>Est. total value</Text>
          <Text style={walletPreviewValueStyle}>
            114.83 <Text style={walletPreviewUnitStyle}>XLM</Text>
          </Text>
          <Text style={walletPreviewGainStyle}>+ 13.21 (+5.90%) Today</Text>
        </View>
        <Image resizeMode="contain" source={piggyImage} style={[walletPreviewPigStyle, pigSize]} />
      </View>
      <View style={walletPreviewRowsStyle}>
        <WalletPreviewRow change="+0.12%" pair="XLM / USDC" />
        <WalletPreviewRow change="+9.25%" pair="USDC / XLM" />
      </View>
    </View>
  );
}

function WalletPreviewRow({ change, pair }: { change: string; pair: string }) {
  return (
    <View style={walletPreviewRowStyle}>
      <Text style={walletPreviewPairStyle}>{pair}</Text>
      <Text style={walletPreviewChangeStyle}>{change}</Text>
    </View>
  );
}

const walletPreviewCardStyle = {
  backgroundColor: '#120F18',
  borderColor: '#241B28',
  borderRadius: 18,
  borderWidth: 1,
  elevation: 6,
  gap: 12,
  padding: 14,
  shadowColor: '#2D1720',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.22,
  shadowRadius: 18,
  width: '100%' as const
};

const walletPreviewTopStyle = {
  alignItems: 'flex-start' as const,
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  minHeight: 77
};

const walletPreviewCopyStyle = {
  flex: 1,
  paddingRight: 8
};

const walletPreviewLabelStyle = {
  color: '#9D8FA5',
  fontSize: 10,
  fontWeight: '800' as const,
  lineHeight: 13
};

const walletPreviewValueStyle = {
  color: palette.white,
  fontSize: 24,
  fontWeight: '900' as const,
  letterSpacing: 0,
  lineHeight: 31,
  marginTop: 4
};

const walletPreviewUnitStyle = {
  color: '#D8CEDD',
  fontSize: 13,
  fontWeight: '800' as const
};

const walletPreviewGainStyle = {
  color: palette.rose,
  fontSize: 11,
  fontWeight: '900' as const,
  lineHeight: 15,
  marginTop: 2
};

const walletPreviewPigStyle = {
  height: 74,
  width: 84
};

const walletPreviewRowsStyle = {
  gap: 7,
  width: '100%' as const
};

const walletPreviewRowStyle = {
  alignItems: 'center' as const,
  backgroundColor: '#25202A',
  borderRadius: 12,
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  minHeight: 31,
  paddingHorizontal: 12
};

const walletPreviewPairStyle = {
  color: palette.white,
  fontSize: 12,
  fontWeight: '900' as const,
  lineHeight: 16
};

const walletPreviewChangeStyle = {
  backgroundColor: '#4A2B41',
  borderRadius: 999,
  color: palette.rose,
  fontSize: 10,
  fontWeight: '900' as const,
  lineHeight: 14,
  overflow: 'hidden' as const,
  paddingHorizontal: 8,
  paddingVertical: 2
};
