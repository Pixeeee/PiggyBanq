import { createContext, forwardRef, useContext } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, type TextProps, type TextInputProps } from 'react-native';
import { fontFamily } from './font-family';

const HeadingContext = createContext(false);

// Explicit components keep font choices out of native defaults and icon fonts.
export const Text = forwardRef<NativeText, TextProps>(function Text({style, ...props}, ref) {
  const flat = StyleSheet.flatten(style);
  const parentHeading = useContext(HeadingContext);
  const heading = parentHeading || props.accessibilityRole === 'header' || props.role === 'heading';
  const family = flat?.fontFamily ?? (props.selectable ? 'GeistMono-400' : fontFamily(flat?.fontWeight, heading));
  return <HeadingContext.Provider value={heading}><NativeText {...props} ref={ref} style={[style, {fontFamily: family, fontWeight: 'normal'}]} /></HeadingContext.Provider>;
});
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput({style, ...props}, ref) {
  const flat = StyleSheet.flatten(style);
  return <NativeTextInput {...props} ref={ref} style={[style, {fontFamily: flat?.fontFamily ?? fontFamily(flat?.fontWeight), fontWeight: 'normal'}]} />;
});
