import { Text } from '../../ui/Typography';
import { useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { AuthButton } from './AuthButton';
import { AuthCard, bodyStyle, linkButtonStyle, linkButtonTextStyle } from './AuthCard';
import { AuthShell } from './AuthShell';
import { palette } from '../layout';
import type { ProviderId } from '../types';

export function ProviderConnectCard({
  providerId,
  providerName,
  onBack
}: {
  providerId: ProviderId;
  providerName: string;
  onBack: () => void;
}) {
  const [status, setStatus] = useState(`${providerName} native connection is not wired yet.`);

  function checkConnection() {
    const message = `${providerName} native connection is not wired yet. This placeholder page is ready for the real SDK or deep-link integration.`;
    setStatus(message);
    Alert.alert(`${providerName} connection`, message);
  }

  return (
    <AuthShell>
      <AuthCard title={`${providerName} connection`} onBack={onBack}>
        <ProviderIcon provider={providerId} />
        <Text style={bodyStyle}>{status}</Text>
        <Text style={bodyStyle}>When the native integration is added, this page will check whether {providerName} is installed and continue the connection flow.</Text>
        <AuthButton label={`Check ${providerName}`} onPress={checkConnection} variant="primary" />
        <Pressable accessibilityRole="button" onPress={onBack} style={linkButtonStyle}>
          <Text style={linkButtonTextStyle}>Back to login</Text>
        </Pressable>
      </AuthCard>
    </AuthShell>
  );
}

function ProviderIcon({ provider }: { provider: ProviderId }) {
  if (provider === 'privy') {
    return (
      <Text accessibilityLabel="Privy icon" style={privyIconStyle}>
        ●
      </Text>
    );
  }

  return (
    <Text accessibilityLabel="Web3Auth icon" style={web3AuthIconStyle}>
      W
    </Text>
  );
}

const providerIconBaseStyle = {
  alignSelf: 'flex-start' as const,
  borderRadius: 999,
  fontWeight: '900' as const,
  height: 46,
  lineHeight: 45,
  overflow: 'hidden' as const,
  textAlign: 'center' as const,
  width: 46
};

const privyIconStyle = {
  ...providerIconBaseStyle,
  backgroundColor: '#FF7A6E',
  color: '#05020B',
  fontSize: 24
};

const web3AuthIconStyle = {
  ...providerIconBaseStyle,
  backgroundColor: '#0364FF',
  color: palette.white,
  fontSize: 25
};
