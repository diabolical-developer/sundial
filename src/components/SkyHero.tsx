import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { F, phaseAt, useTheme } from '../theme';
import { DAY_END, DAY_START, dateOf, duration, greeting, isNight, longDate, nowMinutes, taskMinutes } from '../time';
import type { Task } from '../types';
import { Icon } from '../ui/Icon';
import { loop } from '../ui/motion';
import { PressableScale } from '../ui/PressableScale';
import { useUI } from '../ui/UIContext';
import { ProgressRing } from './ProgressRing';
import { SkyScene } from './SkyScene';
import { SunArc, type Marker } from './SunArc';

interface Props {
  now: Date;
  today: string;
  todays: Task[];
  streak: number;
  name: string;
  scrollY: SharedValue<number>;
  /** The task shown in "Up next", highlighted on the sun's path. */
  nextId?: string;
}

const enter = (i: number, reduce: boolean) => (reduce ? undefined : FadeInDown.delay(80 + i * 90).springify().damping(18).stiffness(140));

export function SkyHero({ now, today, todays, streak, name, scrollY, nextId }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const ui = useUI();
  const phase = phaseAt(now);
  const nowMin = nowMinutes(now);

  const done = todays.filter((x) => x.done).length;
  const total = todays.length;

  const markers = useMemo<Marker[]>(
    () =>
      todays
        .filter((x) => x.time)
        .map((x) => ({
          task: x,
          state: x.done ? 'done' : taskMinutes(x.time!) < nowMin - 1 ? 'late' : 'open',
          next: x.id === nextId,
        })),
    [todays, nowMin, nextId],
  );

  const night = isNight(nowMin);
  const lateLeft = todays.filter((x) => !x.done && x.time && isNight(taskMinutes(x.time)) && taskMinutes(x.time) >= nowMin - 1).length;
  const toSunrise = duration((nowMin < DAY_START ? DAY_START : DAY_START + 24 * 60) - nowMin);
  const dayLeft = !night
    ? `${duration(DAY_END - nowMin)} of your day left`
    : lateLeft > 0
      ? `${lateLeft} late-night ${lateLeft === 1 ? 'task' : 'tasks'} to go, sunrise in ${toSunrise}`
      : `Sunrise in ${toSunrise}`;

  const parallax = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 260], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [-200, 0, 400], [-60, 0, 180], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-200, 0], [1.06, 1], Extrapolation.CLAMP) },
    ],
  }));
  // Pulling down stretches the sky a little, like a rubber band.
  const stretch = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scrollY.value, [-200, 0], [1.25, 1], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, stretch]}>
        <SkyScene phase={phase} ground={t.bg} />
      </Animated.View>

      <Animated.View style={[styles.inner, parallax]}>
        <Animated.View entering={enter(0, reduceMotion)} style={styles.topRow}>
          {/* The planning day: at 1 am it's still last night. */}
          <Text style={styles.date}>{longDate(dateOf(today))}</Text>
          <PressableScale
            onPress={ui.calendar}
            style={styles.streak}
            accessibilityRole="button"
            accessibilityLabel={`${streak} day streak. Open the calendar`}
          >
              <Animated.View
                style={loop(reduceMotion, { from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } }, 12000, {
                  linear: true,
                })}
              >
                <Icon name="sun" size={14} color="#FFD65A" strokeWidth={2.4} />
              </Animated.View>
              <Text style={styles.streakText}>{streak > 0 ? `${streak} ${streak === 1 ? 'day' : 'days'} clear` : 'Streak'}</Text>
              <Icon name="calendar" size={13} color="rgba(255,255,255,0.8)" strokeWidth={2.2} />
          </PressableScale>
        </Animated.View>

        <Animated.Text entering={enter(1, reduceMotion)} style={styles.greeting} accessibilityRole="header">
          {greeting(now, name)}
        </Animated.Text>

        <Animated.View entering={enter(2, reduceMotion)} style={styles.stats}>
          <View style={styles.ringWrap}>
            <ProgressRing size={38} stroke={4} progress={total ? done / total : 0} color={t.sol} track="rgba(255,255,255,0.2)" />
            <Text style={styles.ringText}>{total ? Math.round((done / total) * 100) : 0}</Text>
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.statMain}>
              {total === 0 ? 'Nothing planned yet' : done === total ? `All ${total} done today` : `${done} of ${total} done today`}
            </Text>
            <Text style={styles.statSub}>{dayLeft}</Text>
          </View>
        </Animated.View>

        <SunArc phase={phase} now={now} markers={markers} leaf={t.leaf} ember={t.ember} key={`${today}-${night ? 'night' : 'day'}`} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: 30, overflow: 'hidden' },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 22 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
  date: { fontFamily: F.semi, fontSize: 14, color: 'rgba(255,255,255,0.82)', letterSpacing: 0.1 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  streakText: { fontFamily: F.semi, fontSize: 12.5, color: '#FFFFFF' },
  greeting: {
    fontFamily: F.display,
    fontSize: 40,
    lineHeight: 43,
    letterSpacing: -1.2,
    color: '#FFFFFF',
    marginTop: 12,
    textShadowColor: 'rgba(10, 8, 40, 0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  ringWrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  ringText: { position: 'absolute', fontFamily: F.bold, fontSize: 11, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  statMain: { fontFamily: F.bold, fontSize: 15, color: '#FFFFFF' },
  statSub: { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 1 },
});
