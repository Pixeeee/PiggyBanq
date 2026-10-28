import { Text, TextInput } from '../../ui/Typography';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { palette } from '../layout';

export function AuthCard({ children, onBack, title }: { children: ReactNode; onBack: () => void; title: string }) {
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={authCardScrollStyle} style={{ width: '100%' }}>
      <View style={authCardStyle}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onBack} style={backButtonStyle}>
          <Text style={backButtonTextStyle}>{'<'}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={authCardTitleStyle}>{title}</Text>
        {children}
      </View>
    </ScrollView>
  );
}

export function AuthInput({
  autoCapitalize = 'sentences',
  label,
  onChangeText,
  placeholder,
  secureTextEntry,
  value
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <View style={fieldStyle}>
      <Text style={fieldLabelStyle}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#B98D8B"
        secureTextEntry={secureTextEntry}
        style={authInputStyle}
        value={value}
      />
    </View>
  );
}

export function PasswordInput({
  label,
  onChangeText,
  onToggleVisibility,
  showPassword,
  value
}: {
  label: string;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
  showPassword: boolean;
  value: string;
}) {
  return (
    <View style={fieldStyle}>
      <Text style={fieldLabelStyle}>{label}</Text>
      <View style={passwordInputWrapStyle}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          onChangeText={onChangeText}
          placeholder="Minimum 12 characters"
          placeholderTextColor="#B98D8B"
          secureTextEntry={!showPassword}
          style={passwordInputStyle}
          value={value}
        />
        <Pressable accessibilityRole="button" onPress={onToggleVisibility} style={passwordToggleStyle}>
          <Text style={passwordToggleTextStyle}>{showPassword ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function CheckboxRow({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={checkboxRowStyle}>
      <View style={[checkboxBoxStyle, checked ? checkboxBoxCheckedStyle : null]}>
        {checked ? <Text style={checkboxMarkStyle}>✓</Text> : null}
      </View>
      <Text style={checkboxLabelStyle}>{label}</Text>
    </Pressable>
  );
}

export const linkButtonStyle = {
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  marginTop: 2,
  minHeight: 30,
  paddingHorizontal: 12,
  paddingVertical: 6
};

export const linkButtonTextStyle = {
  color: palette.rose,
  fontSize: 10,
  fontWeight: '900' as const,
  textAlign: 'center' as const
};

export const linkButtonPressedTextStyle = {
  textDecorationLine: 'underline' as const
};

export const helperTextStyle = {
  color: palette.textMid,
  fontSize: 11,
  lineHeight: 16
};

export const warningTextStyle = {
  color: '#B6254F',
  fontSize: 12,
  fontWeight: '800' as const,
  lineHeight: 17
};

export const bodyStyle = {
  color: palette.textMid,
  fontSize: 13,
  lineHeight: 19
};

export const secretPhraseStyle = {
  backgroundColor: palette.surfaceStrong,
  borderColor: palette.border,
  borderRadius: 18,
  borderWidth: 1,
  gap: 8,
  minHeight: 112,
  justifyContent: 'center' as const,
  padding: 14
};

export const secretPhraseTextStyle = {
  color: palette.textDark,
  fontSize: 15,
  fontWeight: '900' as const,
  lineHeight: 22
};

export const secretPhraseMetaStyle = {
  color: palette.textMid,
  fontSize: 11,
  lineHeight: 16
};

const authCardScrollStyle = {
  flexGrow: 1,
  justifyContent: 'center' as const,
  paddingBottom: 26,
  width: '100%' as const
};

const authCardStyle = {
  alignSelf: 'center' as const,
  backgroundColor: palette.white,
  borderColor: palette.border,
  borderRadius: 24,
  borderWidth: 0,
  gap: 18,
  maxWidth: 430,
  padding: 18,
  width: '100%' as const
};

const backButtonStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.surfaceStrong,
  borderRadius: 18,
  height: 42,
  justifyContent: 'center' as const,
  width: 42
};

const backButtonTextStyle = {
  color: palette.textDark,
  fontSize: 30,
  fontWeight: '800' as const,
  lineHeight: 34
};

const authCardTitleStyle = {
  color: palette.textDark,
  fontSize: 28,
  fontWeight: '700' as const,
  lineHeight: 34
};

const fieldStyle = {
  gap: 6
};

const fieldLabelStyle = {
  color: palette.textDark,
  fontSize: 12,
  fontWeight: '800' as const
};

const authInputStyle = {
  backgroundColor: palette.surface,
  borderColor: palette.border,
  borderRadius: 18,
  borderWidth: 1,
  color: palette.textDark,
  fontSize: 14,
  minHeight: 52,
  paddingHorizontal: 12
};

const passwordInputWrapStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.surface,
  borderColor: palette.border,
  borderRadius: 18,
  borderWidth: 1,
  flexDirection: 'row' as const
};

const passwordInputStyle = {
  color: palette.textDark,
  flex: 1,
  fontSize: 14,
  minHeight: 52,
  paddingHorizontal: 12
};

const passwordToggleStyle = {
  paddingHorizontal: 12,
  paddingVertical: 10
};

const passwordToggleTextStyle = {
  color: palette.rose,
  fontSize: 11,
  fontWeight: '900' as const
};

const checkboxRowStyle = {
  alignItems: 'center' as const,
  flexDirection: 'row' as const,
  gap: 10,
  paddingVertical: 4
};

const checkboxBoxStyle = {
  alignItems: 'center' as const,
  borderColor: palette.border,
  borderRadius: 6,
  borderWidth: 1,
  height: 22,
  justifyContent: 'center' as const,
  width: 22
};

const checkboxBoxCheckedStyle = {
  backgroundColor: palette.rose,
  borderColor: palette.rose
};

const checkboxMarkStyle = {
  color: palette.white,
  fontSize: 13,
  fontWeight: '900' as const,
  lineHeight: 16
};

const checkboxLabelStyle = {
  color: palette.textMid,
  flex: 1,
  fontSize: 12,
  fontWeight: '700' as const,
  lineHeight: 17
};
