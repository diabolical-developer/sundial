import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { haptic } from '../haptics';
import { useStore } from '../store';
import { F, SKY, useTheme } from '../theme';
import { addDays } from '../time';
import { Icon } from '../ui/Icon';
import { EASE_OUT } from '../ui/motion';
import { PressableScale } from '../ui/PressableScale';

/** First launch: the sun comes up, you say your name, and three example tasks show how it works. */
export function Onboarding() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { updateSettings, addTask, tasks, today } = useStore();
  const [name, setName] = useState('');

  const rise = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) rise.value = withDelay(250, withTiming(1, { duration: 2000, easing: EASE_OUT }));
  }, [reduceMotion, rise]);
  const sun = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(rise.value, [0, 1], [150, 0]) }],
    opacity: interpolate(rise.value, [0, 0.15], [0, 1]),
  }));

  const begin = () => {
    haptic.success();
    if (tasks.length === 0) {
      const hour = new Date().getHours();
      const soon = Math.min(20, Math.max(9, hour + 1));
      const lateDate = hour < 21 ? today : addDays(today, 1);
      addTask({ title: 'Plan tomorrow’s top three', date: lateDate, time: hour < 21 ? '21:00' : '09:00', priority: 'normal', reminder: false });
      addTask({ title: 'Swipe right to finish me, or left to delete', date: today, time: null, priority: 'low', reminder: false });
      addTask({ title: 'Tap me for details, or press Start focus', date: today, time: `${String(soon).padStart(2, '0')}:00`, priority: 'high', reminder: false });
    }
    updateSettings({ onboarded: true, name: name.trim().slice(0, 24) });
  };

  const arcW = Math.min(width, 560) - 64;
  const arcH = arcW * 0.42;

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={[styles.root, { backgroundColor: t.card }]}>
      <View style={[styles.sky, { paddingTop: insets.top + 28 }]}>
        <LinearGradient colors={SKY.dawn.colors} locations={SKY.dawn.locations} style={StyleSheet.absoluteFill} />
        <Animated.Text entering={FadeInDown.delay(500).duration(700)} style={[styles.brand, { top: insets.top + 20 }]}>
          Sundial
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(700).duration(700)} style={styles.headline}>
          Your day,{'\n'}laid out in daylight.
        </Animated.Text>

        <View style={[styles.horizon, { width: arcW, height: arcH }]}>
          <Svg width={arcW} height={arcH} style={StyleSheet.absoluteFill}>
            <Path
              d={`M 4 ${arcH} A ${arcW / 2 - 4} ${arcH - 8} 0 0 1 ${arcW - 4} ${arcH}`}
              stroke={SKY.dawn.arc}
              strokeOpacity={0.55}
              strokeWidth={1.5}
              strokeDasharray="3 6"
              fill="none"
            />
          </Svg>
          <View style={styles.sunClip}>
            <Animated.View style={[styles.sun, sun]}>
              <View style={[styles.glow, { width: 120, height: 120, opacity: 0.25 }]} />
              <View style={[styles.glow, { width: 84, height: 84, opacity: 0.45 }]} />
              <View style={styles.core} />
            </Animated.View>
          </View>
        </View>
      </View>

      <Animated.View
        entering={FadeInDown.delay(900).duration(600)}
        style={[styles.sheet, { backgroundColor: t.card, paddingBottom: insets.bottom + 24 }]}
      >
        <Text style={[styles.body, { color: t.muted }]}>
          Sundial puts today’s tasks on the sun’s path, so you always know what’s next and how much of the day is left.
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your first name (optional)"
          placeholderTextColor={t.faint}
          onSubmitEditing={begin}
          returnKeyType="go"
          autoCapitalize="words"
          style={[styles.input, { backgroundColor: t.bg, color: t.ink }]}
          accessibilityLabel="Your first name"
        />
        <PressableScale onPress={begin} style={[styles.cta, { backgroundColor: t.sol }]} accessibilityRole="button">
          <Icon name="sun" size={20} color={t.solInk} strokeWidth={2.4} />
          <Text style={[styles.ctaText, { color: t.solInk }]}>Start my day</Text>
        </PressableScale>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sky: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', paddingHorizontal: 28, paddingBottom: 28 },
  brand: { fontFamily: F.displayBold, fontSize: 17, color: 'rgba(255,255,255,0.85)', position: 'absolute', left: 28 },
  headline: {
    fontFamily: F.display,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.5,
    color: '#FFFFFF',
    alignSelf: 'stretch',
    maxWidth: 500,
    marginBottom: 28,
  },
  horizon: { alignItems: 'center' },
  sunClip: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 170, overflow: 'hidden', alignItems: 'center' },
  sun: { position: 'absolute', bottom: 0, width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', borderRadius: 999, backgroundColor: '#FFD65A' },
  core: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFD34D', borderWidth: 3, borderColor: '#FFF4C8' },
  sheet: {
    marginTop: -28,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  body: { fontFamily: F.medium, fontSize: 16.5, lineHeight: 24 },
  input: { fontFamily: F.semi, fontSize: 17, height: 56, borderRadius: 18, paddingHorizontal: 18 },
  cta: { height: 58, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontFamily: F.bold, fontSize: 17 },
});
