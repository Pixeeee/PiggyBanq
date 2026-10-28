import { Text } from '../../ui/Typography';
import { type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '../layout';

export function AuthShell({
  authError,
  authStatus,
  children
}: {
  authError?: string;
  authStatus?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[shellStyle, { paddingBottom: Math.max(insets.bottom, 18) + 10, paddingTop: Math.max(insets.top, 22) + 10 }]}>
      {children}
      {authStatus || authError ? (
        <View style={[toastStyle, authError ? errorToastStyle : null]}>
          <Text style={[toastTextStyle, authError ? errorToastTextStyle : null]}>{authError || authStatus}</Text>
        </View>
      ) : null}
    </View>
  );
}

const shellStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.background,
  flex: 1,
  justifyContent: 'flex-start' as const,
  paddingHorizontal: 16
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
