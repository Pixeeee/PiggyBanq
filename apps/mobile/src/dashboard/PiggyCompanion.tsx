import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, Pressable, Text, View } from 'react-native';
import { useMobileTheme } from '../theme';

const tips = ['Small steps. Big dreams.', 'Give every goal a little love.', 'Your next milestone starts today.'];
export function PiggyCompanion({ celebration = 0, compact = false }: { celebration?: number; compact?: boolean }) {
  const { palette } = useMobileTheme();
  const [reducedMotion, setReducedMotion] = useState(true);
  const [reaction, setReaction] = useState(0);
  const [message, setMessage] = useState(tips[0]);
  const bounce = useRef(new Animated.Value(0)).current;
  const coins = useRef(new Animated.Value(0)).current;
  const previousCelebration = useRef(celebration);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReducedMotion(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { mounted = false; listener.remove(); animation.current?.stop(); if (resetTimer.current) clearTimeout(resetTimer.current); };
  }, []);
  function animate() {
    animation.current?.stop(); bounce.setValue(0); coins.setValue(0);
    if (reducedMotion) return;
    animation.current = Animated.parallel([
      Animated.sequence([Animated.spring(bounce, { toValue: 1, speed: 18, bounciness: 8, useNativeDriver: true }), Animated.spring(bounce, { toValue: 0, speed: 12, bounciness: 5, useNativeDriver: true })]),
      Animated.timing(coins, { toValue: 1, duration: 1000, useNativeDriver: true })
    ]);
    animation.current.start();
  }
  useEffect(() => {
    if (celebration === previousCelebration.current) return;
    previousCelebration.current = celebration;
    setMessage('Progress saved. Proud of you!'); animate();
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setMessage(tips[0]), 4000);
  }, [celebration, reducedMotion]);
  useEffect(() => { if (reducedMotion) { animation.current?.stop(); bounce.setValue(0); coins.setValue(0); } }, [reducedMotion]);
  function greet() {
    const next = reaction + 1; setReaction(next); setMessage(tips[next % tips.length]); animate();
  }
  return <View style={{ backgroundColor: palette.surfaceStrong, borderRadius: 24, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, minHeight: compact ? 104 : 122 }}>
    <View style={{ flex: 1, gap: 6, paddingVertical: 16 }}>{!compact ? <Text style={{ color: palette.rose, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>YOUR SAVINGS SIDEKICK</Text> : null}
      <Text accessibilityLiveRegion="polite" style={{ color: palette.textDark, fontSize: compact ? 17 : 19, fontWeight: '700', lineHeight: 25 }}>{message}</Text>
      <Text style={{ color: palette.textMid, fontSize: 12 }}>{compact ? 'Tap to say hello' : 'Tap Piggy for a little encouragement'}</Text>
    </View>
    <Pressable accessibilityLabel="Play with Piggy" accessibilityHint="Piggy reacts and shares a savings encouragement" accessibilityRole="button" onPress={greet} style={{ width: compact ? 104 : 124, height: compact ? 96 : 118, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', bottom: 21, width: 65, height: 8, borderRadius: 30, backgroundColor: '#9C5A6220' }} />
      <Animated.View style={{ transform: [{ translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }, { rotate: bounce.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-7deg'] }) }] }}>
        <Image accessibilityIgnoresInvertColors source={reducedMotion ? require('../../assets/piggy_icon_square.png') : require('../../assets/piggy.gif')} resizeMode="contain" style={{ width: compact ? 92 : 116, height: compact ? 92 : 116 }} />
      </Animated.View>
      {!reducedMotion ? [0, 1, 2].map(index => <Animated.View key={index} pointerEvents="none" style={{ position: 'absolute', left: 35 + index * 22, top: 20 + index * 5, opacity: coins.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: coins.interpolate({ inputRange: [0, 1], outputRange: [20, -28 - index * 8] }) }] }}><Text style={{ color: palette.rose, fontSize: 16 }}>✦</Text></Animated.View>) : null}
    </Pressable>
  </View>;
}
