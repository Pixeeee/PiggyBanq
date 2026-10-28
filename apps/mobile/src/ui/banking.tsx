import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotionView, useReducedMotion } from './MotionView';
import { useMobileTheme } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, color, size = 22 }: { name: IconName; color?: string; size?: number }) {
  const { palette } = useMobileTheme();
  return <Ionicons accessible={false} importantForAccessibility="no" name={name} size={size} color={color ?? palette.textDark} />;
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { palette, dashboard } = useMobileTheme();
  return <MotionView delay={40} style={{ backgroundColor: palette.card, borderRadius: dashboard ? 24 : 22, borderWidth: 1, borderColor: palette.borderSoft, padding: 20, gap: 16, ...style }}>{children}</MotionView>;
}
export function Heading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const { palette } = useMobileTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1, gap: 6 }}>
    <Text accessibilityRole="header" style={{ color: palette.textDark, fontSize: 28, fontWeight: '700', letterSpacing: -0.8 }}>{title}</Text>
    {subtitle ? <Text style={{ color: palette.textMid, fontSize: 14, lineHeight: 20 }}>{subtitle}</Text> : null}
  </View>{action}</View>;
}
export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  const { palette } = useMobileTheme();
  return <Text style={{ color: muted ? palette.textSoft : palette.textMid, fontSize: 14, lineHeight: 21 }}>{children}</Text>;
}
export function Button({ label, onPress, disabled, secondary = false, icon }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; icon?: IconName }) {
  const { palette, dashboard } = useMobileTheme();
  const color = secondary ? palette.textDark : palette.white;
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const press = (value: number) => { Animated.spring(scale, { toValue: reduced ? 1 : value, speed: 35, bounciness: 0, useNativeDriver: true }).start(); };
  return <Animated.View style={{ transform: [{ scale }] }}><Pressable onPressIn={() => press(.98)} onPressOut={() => press(1)} accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: 18, paddingVertical: 14, borderRadius: dashboard ? 999 : 16, borderWidth: dashboard ? 1 : 0, borderColor: secondary ? palette.border : palette.rose, backgroundColor: secondary ? (dashboard ? palette.card : palette.cardAlt) : palette.rose, opacity: disabled ? 0.45 : pressed ? 0.78 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 })}>
    {icon ? <Icon name={icon} size={20} color={color} /> : null}<Text style={{ color, fontSize: 15, fontWeight: '700', textAlign: 'center', flexShrink: 1 }}>{label}</Text>
  </Pressable></Animated.View>;
}
export function IconButton({ label, icon, onPress, selected = false }: { label: string; icon: IconName; onPress: () => void; selected?: boolean }) {
  const { palette, dashboard } = useMobileTheme();
  return <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: dashboard ? 999 : 16, borderWidth: dashboard ? 1 : 0, borderColor: palette.border, backgroundColor: selected ? palette.surfaceStrong : palette.cardAlt, opacity: pressed ? 0.7 : 1 })}><Icon name={icon} color={selected ? palette.rose : palette.textDark} /></Pressable>;
}
export function Field({ label, trailing, ...props }: TextInputProps & { label: string; trailing?: ReactNode }) {
  const { palette, dashboard } = useMobileTheme();
  const [focused,setFocused]=useState(false);
  return <View style={{ gap: 8, flexGrow: 1 }}><Text style={{ color: palette.textDark, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    <View><TextInput {...props} onFocus={event=>{setFocused(true);props.onFocus?.(event);}} onBlur={event=>{setFocused(false);props.onBlur?.(event);}} accessibilityLabel={label} placeholderTextColor={palette.textSoft} style={[{ backgroundColor: dashboard ? palette.card : palette.cardAlt, borderColor: dashboard && focused ? palette.rose : palette.border, borderWidth: 1, borderRadius: dashboard ? 24 : 16, paddingLeft: 16, paddingRight: trailing ? 56 : 16, paddingVertical: 13, minHeight: 52, fontSize: 16, color: palette.textDark }, props.style]} />{trailing ? <View style={{ position: 'absolute', right: 2, bottom: 2 }}>{trailing}</View> : null}</View>
  </View>;
}
export function Segments({ items, active, onSelect, disabled = false }: { items: string[]; active: string; onSelect: (value: string) => void; disabled?: boolean }) {
  const { palette, dashboard } = useMobileTheme();
  return <View style={{ flexDirection: 'row', backgroundColor: palette.cardAlt, borderWidth: dashboard ? 1 : 0, borderColor: palette.border, borderRadius: dashboard ? 999 : 16, padding: 4, gap: 4 }}>{items.map(item => <Pressable key={item} accessibilityRole="button" disabled={disabled} accessibilityState={{ selected: active === item, disabled }} onPress={() => onSelect(item)} style={{ flex: 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', borderRadius: dashboard ? 999 : 13, backgroundColor: active === item ? (dashboard ? palette.surfaceStrong : palette.card) : 'transparent' }}><Text style={{ color: active === item ? palette.textDark : palette.textMid, fontSize: 14, fontWeight: active === item ? '700' : '500' }}>{item}</Text></Pressable>)}</View>;
}
export function Sheet({ title, visible, onClose, children }: { title: string; visible: boolean; onClose: () => void; children: ReactNode }) {
  const { palette, dashboard } = useMobileTheme();
  const reduced = useReducedMotion();
  return <Modal visible={visible} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose} statusBarTranslucent>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: dashboard ? '#211019AA' : '#0C1929AA' }}>
      <Pressable accessibilityLabel="Dismiss sheet" accessibilityRole="button" onPress={onClose} style={{ flex: 1 }} />
      <View style={{ maxHeight: '88%', backgroundColor: palette.card, borderWidth: dashboard ? 1 : 0, borderColor: palette.border, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8 }}>
        <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: palette.border, marginBottom: 10 }} />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40, gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text accessibilityRole="header" style={{ flex: 1, color: palette.textDark, fontSize: 24, fontWeight: '700', letterSpacing: -0.6 }}>{title}</Text><IconButton label={`Close ${title}`} icon="close" onPress={onClose} /></View>
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
export function ProgressBar({ percent }: { percent: number }) {
  const { palette } = useMobileTheme();
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={{ height: 7, backgroundColor: palette.cardAlt, borderRadius: 6, overflow: 'hidden' }}><View style={{ width: `${percent}%`, height: '100%', backgroundColor: palette.rose, borderRadius: 6 }} /></View>;
}
