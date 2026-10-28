import { Text } from '../../ui/Typography';
import { Pressable } from 'react-native';
import { palette } from '../layout';

export function AuthButton({
  disabled,
  label,
  onPress,
  variant
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  variant: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[entryButtonStyle, variant === 'primary' ? entryPrimaryButtonStyle : entrySecondaryButtonStyle, disabled ? entryDisabledButtonStyle : null]}
    >
      <Text style={variant === 'primary' ? entryPrimaryButtonTextStyle : entrySecondaryButtonTextStyle}>{label}</Text>
    </Pressable>
  );
}

export const entryDisabledButtonStyle = {
  opacity: 0.58
};

const entryButtonStyle = {
  alignItems: 'center' as const,
  borderRadius: 12,
  justifyContent: 'center' as const,
  minHeight: 46,
  paddingHorizontal: 16,
  paddingVertical: 12,
  shadowColor: '#6F3B4D',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.1,
  shadowRadius: 12
};

const entryPrimaryButtonStyle = {
  backgroundColor: '#120F18',
  elevation: 2
};

const entrySecondaryButtonStyle = {
  backgroundColor: palette.white,
  borderColor: '#EBD7CE',
  borderWidth: 1,
  elevation: 2
};

const entryPrimaryButtonTextStyle = {
  color: palette.white,
  fontSize: 13,
  fontWeight: '900' as const,
  lineHeight: 18,
  textAlign: 'center' as const
};

const entrySecondaryButtonTextStyle = {
  color: '#090A0B',
  fontSize: 13,
  fontWeight: '900' as const,
  lineHeight: 18,
  textAlign: 'center' as const
};
