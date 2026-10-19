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
import { addDays, nowMinutes, toTime } from '../time';
import { Icon } from '../ui/Icon';
import { EASE_OUT } from '../ui/motion';
import { PressableScale } from '../ui/PressableScale';
import { clockNow } from '../useNow';
import { Hills, SkyScene } from './SkyScene';
import { Sun } from './SunArc';

const FEATURES = [
  { icon: 'sun' as const, text: 'Tasks sit on the sun’s path' },
  { icon: 'repeat' as const, text: 'Repeats and reminders' },
  { icon: 'flame' as const, text: 'Streaks for clear days' },
];

/**
 * First launch: night turns to dawn as the sun climbs over the hills, you say your name,
 * and three example tasks show how it works.
 */
export function Onboarding() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { updateSettings, addTask, tasks, today } = useStore();
  const [name, setName] = useState('');

  const rise = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) rise.value = withDelay(300, withTiming(1, { duration: 2600, easing: EASE_OUT }));
  }, [reduceMotion, rise]);
  const arcW = Math.min(width, 560) - 56;
  const arcH = arcW * 0.42;
  const sunSize = 170;
  const sun = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(rise.value, [0, 1], [arcH + sunSize * 0.6, 0]) },
      { scale: interpolate(rise.value, [0, 1], [0.8, 1]) },
    ],
  }));
  // The night sky fades as the sun comes up.
  const night = useAnimatedStyle(() => ({ opacity: interpolate(rise.value, [0, 0.75], [1, 0], 'clamp') }));
  const trail = useAnimatedStyle(() => ({ opacity: interpolate(rise.value, [0.55, 1], [0, 1], 'clamp') }));

  const begin = () => {
    haptic.success();
    if (tasks.length === 0) {
      // Hours on the planning-day clock, so onboarding at 1 am still plans "tonight".
      const hour = Math.floor(nowMinutes(clockNow()) / 60);
      const soon = toTime(Math.max(9, hour + 1) * 60);
      const evening = hour < 21;
      addTask({ title: 'Plan tomorrow’s top three', date: evening ? today : addDays(today, 1), time: evening ? '21:00' : '09:00', priority: 'normal', reminder: false });
      addTask({ title: 'Swipe right to finish me, or left to delete', date: today, time: null, priority: 'low', reminder: false });
      addTask({ title: 'Tap me for details, or press Start focus', date: today, time: soon, priority: 'high', reminder: false });
    }
    updateSettings({ onboarded: true, name: name.trim().slice(0, 24) });
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={[styles.root, { backgroundColor: t.card }]}>
      <View style={[styles.sky, { paddingTop: insets.top + 28 }]}>
        <SkyScene phase="dawn" ground={t.card} bare />
        <Animated.View style={[StyleSheet.absoluteFill, night]} pointerEvents="none">
          <SkyScene phase="night" ground={t.card} bare />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(700)} style={[styles.brandRow, { top: insets.top + 18 }]}>
          <View style={styles.brandMark}>
            <Icon name="sun" size={14} color="#17143A" strokeWidth={2.6} />
          </View>
          <Text style={styles.brand}>Sundial</Text>
        </Animated.View>

        <View style={styles.headlineWrap}>
          <Animated.Text entering={FadeInDown.delay(650).springify().damping(18)} style={styles.headline}>
            Your day,
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(800).springify().damping(18)} style={[styles.headline, styles.headlineAccent]}>
            laid out in daylight.
          </Animated.Text>
        </View>

        <View style={[styles.horizon, { width: arcW, height: arcH }]}>
          <Svg width={arcW} height={arcH} style={StyleSheet.absoluteFill}>
            <Path
              d={`M 4 ${arcH} A ${arcW / 2 - 4} ${arcH - 8} 0 0 1 ${arcW - 4} ${arcH}`}
              stroke="#FFFFFF"
              strokeOpacity={0.45}
              strokeWidth={1.5}
              strokeDasharray="2 7"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
          <Animated.View style={[StyleSheet.absoluteFill, trail]}>
            <Svg width={arcW} height={arcH}>
              <Path
                d={`M 4 ${arcH} A ${arcW / 2 - 4} ${arcH - 8} 0 0 1 ${arcW / 2} 8`}
                stroke="#FFFFFF"
                strokeOpacity={0.9}
                strokeWidth={2.5}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>
          <View style={[styles.sunClip, { height: arcH + sunSize / 2 }]}>
            <Animated.View style={[{ position: 'absolute', top: 8, width: sunSize, height: sunSize }, sun]}>
              <Sun reduceMotion={reduceMotion} size={sunSize} glow={SKY.dawn.sunGlow} />
            </Animated.View>
          </View>
        </View>
        <Hills phase="dawn" ground={t.card} height={110} />
      </View>

      <Animated.View entering={FadeInDown.delay(1000).duration(600)} style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <Animated.View
              key={f.text}
              entering={reduceMotion ? undefined : FadeInDown.delay(1150 + i * 110).springify().damping(18)}
              style={[styles.feature, { backgroundColor: t.bg }]}
            >
              <View style={[styles.featureIcon, { backgroundColor: t.irisSoft }]}>
                <Icon name={f.icon} size={15} color={t.iris} strokeWidth={2.4} />
              </View>
              <Text style={[styles.featureText, { color: t.ink }]} numberOfLines={2}>
                {f.text}
              </Text>
            </Animated.View>
          ))}
        </View>
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
  sky: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', paddingHorizontal: 28, paddingBottom: 60 },
  brandRow: { position: 'absolute', left: 28, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFD34D', alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: F.displayBold, fontSize: 17, color: 'rgba(255,255,255,0.92)' },
  headlineWrap: { alignSelf: 'stretch', maxWidth: 500, marginBottom: 44 },
  headline: {
    fontFamily: F.display,
    fontSize: 44,
    lineHeight: 47,
    letterSpacing: -1.5,
    color: '#FFFFFF',
    textShadowColor: 'rgba(10, 8, 40, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  headlineAccent: { color: '#FFE2B8' },
  horizon: { alignItems: 'center' },
  // Not clipped: the mountains in front hide the sun until it clears the ridge.
  sunClip: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  sheet: { paddingHorizontal: 24, paddingTop: 8, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  features: { flexDirection: 'row', gap: 8 },
  feature: { flex: 1, borderRadius: 16, padding: 10, gap: 8 },
  featureIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontFamily: F.semi, fontSize: 12.5, lineHeight: 16 },
  input: { fontFamily: F.semi, fontSize: 17, height: 56, borderRadius: 18, paddingHorizontal: 18 },
  cta: {
    height: 58,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#FFC21A',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaText: { fontFamily: F.bold, fontSize: 17 },
});
