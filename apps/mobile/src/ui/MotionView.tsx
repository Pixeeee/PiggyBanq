import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, type ViewStyle } from 'react-native';

let knownReducedMotion = true;
export function useReducedMotion() {
  const [reduced, setReduced] = useState(knownReducedMotion);
  useEffect(() => {
    let alive = true, changed = false;
    const update = (value: boolean) => { knownReducedMotion = value; setReduced(value); };
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; update(value); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive && !changed) update(value); }).catch(() => {});
    return () => { alive = false; listener.remove(); };
  }, []);
  return reduced;
}

export function MotionView({ children, transitionKey = '', delay = 0, style }: { children: ReactNode; transitionKey?: string; delay?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const previousPreference = useRef(reduced);
  useEffect(() => {
    progress.stopAnimation();
    const changed = previousPreference.current !== reduced;
    previousPreference.current = reduced;
    if (reduced || changed) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 240, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [transitionKey, reduced, delay, progress]);
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>{children}</Animated.View>;
}
