import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { F, phaseAt, SKY, useTheme } from '../theme';
import { DAY_END, DAY_START, duration, greeting, longDate, minutesOf, nowMinutes } from '../time';
import type { Task } from '../types';
import { Icon } from '../ui/Icon';
import { ProgressRing } from './ProgressRing';
import { SunArc, type Marker } from './SunArc';

interface Props {
  now: Date;
  today: string;
  todays: Task[];
  streak: number;
  name: string;
  scrollY: SharedValue<number>;
}

/** Deterministic star field for the night sky. */
const STARS = Array.from({ length: 28 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return { left: `${r(1) * 100}%` as const, top: `${r(2) * 70}%` as const, size: 1.2 + r(3) * 1.8, opacity: 0.35 + r(4) * 0.55 };
});

export function SkyHero({ now, today, todays, streak, name, scrollY }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const phase = phaseAt(now);
  const sky = SKY[phase];
  const nowMin = nowMinutes(now);

  const done = todays.filter((x) => x.done).length;
  const total = todays.length;

  const markers = useMemo<Marker[]>(
    () =>
      todays
        .filter((x) => x.time)
        .map((x) => ({
          task: x,
          state: x.done ? 'done' : minutesOf(x.time!) < nowMin - 1 ? 'late' : 'open',
        })),
    [todays, nowMin],
  );

  const dayLeft =
    nowMin < DAY_START
      ? 'Your day starts at 6 am'
      : nowMin >= DAY_END
        ? 'Your day has wound down'
        : `${duration(DAY_END - nowMin)} of your day left`;

  const parallax = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 260], [1, 0.15], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [-200, 0, 400], [-60, 0, 160], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
      <LinearGradient colors={sky.colors} locations={sky.locations} style={StyleSheet.absoluteFill} />
      {phase === 'night' &&
        STARS.map((s, i) => (
          <View
            key={i}
            style={{ position: 'absolute', left: s.left, top: s.top, width: s.size, height: s.size, borderRadius: 2, backgroundColor: '#FFFFFF', opacity: s.opacity }}
          />
        ))}

      <Animated.View style={[styles.inner, parallax]}>
        <View style={styles.topRow}>
          <Text style={styles.date}>{longDate(now)}</Text>
          {streak > 0 && (
            <View style={styles.streak} accessibilityLabel={`${streak} day streak of finishing everything planned`}>
              <Icon name="sun" size={14} color="#FFD65A" strokeWidth={2.4} />
              <Text style={styles.streakText}>
                {streak} {streak === 1 ? 'day' : 'days'} clear
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.greeting} accessibilityRole="header">
          {greeting(now)}
          {name ? `, ${name}` : ''}
        </Text>

        <View style={styles.stats}>
          <ProgressRing size={36} stroke={4} progress={total ? done / total : 0} color={t.sol} track="rgba(255,255,255,0.22)" />
          <View>
            <Text style={styles.statMain}>
              {total === 0 ? 'Nothing planned yet' : done === total ? `All ${total} done today` : `${done} of ${total} done today`}
            </Text>
            <Text style={styles.statSub}>{dayLeft}</Text>
          </View>
        </View>

        <SunArc phase={phase} now={now} markers={markers} leaf={t.leaf} ember={t.ember} key={today} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: 42, overflow: 'hidden' },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 22 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
  date: { fontFamily: F.semi, fontSize: 14, color: 'rgba(255,255,255,0.82)' },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  streakText: { fontFamily: F.semi, fontSize: 12.5, color: '#FFFFFF' },
  greeting: {
    fontFamily: F.display,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1.2,
    color: '#FFFFFF',
    marginTop: 12,
  },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  statMain: { fontFamily: F.bold, fontSize: 15, color: '#FFFFFF' },
  statSub: { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 1 },
});
