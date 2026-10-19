import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  SlideOutDown,
  useReducedMotion,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { haptic } from '../haptics';
import { useStore } from '../store';
import { F, useTheme } from '../theme';
import { addDays, dateOf, dayLabel, duration, keyOf } from '../time';
import type { DayRecord } from '../types';
import { Icon } from '../ui/Icon';
import { loop } from '../ui/motion';
import { PressableScale } from '../ui/PressableScale';
import { useTween } from '../useNow';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL = 44;

type KeyTarget = {
  addEventListener: (type: 'keydown', fn: (e: { key: string }) => void) => void;
  removeEventListener: (type: 'keydown', fn: (e: { key: string }) => void) => void;
};

/** Longest run of consecutive cleared days. */
function bestRun(days: string[]) {
  const set = new Set(days);
  let best = 0;
  for (const d of set) {
    if (set.has(addDays(d, -1))) continue; // only count from the start of a run
    let n = 1;
    while (set.has(addDays(d, n))) n += 1;
    best = Math.max(best, n);
  }
  return best;
}

/** The days of a month laid out Monday-first, with blanks before the 1st. */
function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= count; d++) cells.push(keyOf(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** A small sun for a cleared day. */
function SunCell({ day, glow }: { day: number; glow: boolean }) {
  return (
    <View style={styles.cellInner}>
      {glow && (
        <Svg width={CELL + 10} height={CELL + 10} style={styles.cellGlow} pointerEvents="none">
          <Defs>
            <RadialGradient id="calGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0.45" stopColor="#FFC21A" stopOpacity={0.45} />
              <Stop offset="1" stopColor="#FFC21A" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={(CELL + 10) / 2} cy={(CELL + 10) / 2} r={(CELL + 10) / 2} fill="url(#calGlow)" />
        </Svg>
      )}
      <View style={styles.sun}>
        <Text style={styles.sunText}>{day}</Text>
      </View>
    </View>
  );
}

/** A ring that fills with the share of a day's tasks that got done. */
function PartialCell({ day, share, ink, track, fill }: { day: number; share: number; ink: string; track: string; fill: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.cellInner}>
      <Svg width={36} height={36} style={[StyleSheet.absoluteFill, styles.ring]}>
        <Circle cx={18} cy={18} r={r} stroke={track} strokeWidth={3} fill="none" />
        {share > 0 && (
          <Circle
            cx={18}
            cy={18}
            r={r}
            stroke={fill}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - share)}
          />
        )}
      </Svg>
      <Text style={[styles.dayText, { color: ink }]}>{day}</Text>
    </View>
  );
}

/** Full-screen calendar of cleared days: your streak, your best run, and how each day went. */
export function StreakCalendar({ onClose }: { onClose: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { settings, today, streak, tasks } = useStore();
  const [cursor, setCursor] = useState(() => {
    const d = dateOf(today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [picked, setPicked] = useState<string>(today);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    if (Platform.OS !== 'web') return () => sub.remove();
    const target = globalThis as unknown as KeyTarget;
    const onKey = (e: { key: string }) => e.key === 'Escape' && onClose();
    target.addEventListener('keydown', onKey);
    return () => {
      sub.remove();
      target.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const cleared = useMemo(() => new Set(settings.clearedDays), [settings.clearedDays]);
  const history = settings.history ?? {};
  const best = useMemo(() => Math.max(bestRun(settings.clearedDays), streak), [settings.clearedDays, streak]);
  const record = (d: string): DayRecord | undefined => history[d];

  const cells = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const monthKey = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`;
  const monthDays = Object.entries(history).filter(([d]) => d.startsWith(monthKey));
  const monthCleared = settings.clearedDays.filter((d) => d.startsWith(monthKey)).length;
  const monthDone = monthDays.reduce((n, [, r]) => n + r.done, 0);
  const monthFocus = monthDays.reduce((n, [, r]) => n + r.focus, 0);
  const isThisMonth = monthKey === today.slice(0, 7);

  const shown = useTween(streak, 1100);
  const shift = (n: number) => {
    haptic.tap();
    setCursor((c) => {
      const d = new Date(c.y, c.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const pickedRec = record(picked);
  const pickedOpen = picked >= today ? tasks.filter((x) => x.date === picked && !x.done).length : 0;

  return (
    <Animated.View
      entering={reduceMotion ? FadeIn.duration(200) : SlideInDown.springify().damping(22).stiffness(180)}
      exiting={reduceMotion ? undefined : SlideOutDown.duration(240)}
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: t.bg }]}
      accessibilityViewIsModal
    >
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero: the streak, glowing. */}
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <LinearGradient colors={['#1A1250', '#4A2C8C', '#E0606A', '#FFB168']} locations={[0, 0.45, 0.85, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.column}>
            <View style={styles.topRow}>
              <Text style={styles.kicker}>Your streak</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityLabel="Close calendar" accessibilityRole="button">
                <Icon name="x" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.streakRow}>
              <View style={styles.bigSun}>
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    loop(reduceMotion, { from: { transform: [{ scale: 0.9 }], opacity: 0.7 }, to: { transform: [{ scale: 1.12 }], opacity: 1 } }, 2400, {
                      alternate: true,
                    }),
                  ]}
                >
                  <Svg width={120} height={120}>
                    <Defs>
                      <RadialGradient id="bigSunGlow" cx="50%" cy="50%" r="50%">
                        <Stop offset="0.35" stopColor="#FFD65A" stopOpacity={0.7} />
                        <Stop offset="1" stopColor="#FFD65A" stopOpacity={0} />
                      </RadialGradient>
                    </Defs>
                    <Circle cx={60} cy={60} r={60} fill="url(#bigSunGlow)" />
                  </Svg>
                </Animated.View>
                <View style={styles.bigCore}>
                  <Text style={styles.bigNum} accessibilityLabel={`${streak} day streak`}>
                    {Math.round(shown)}
                  </Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.streakTitle}>
                  {streak === 0 ? 'Start a streak today' : streak === 1 ? 'day clear' : 'days clear in a row'}
                </Text>
                <Text style={styles.streakSub}>
                  {streak === 0
                    ? 'Finish everything you plan for a day and it lights up here.'
                    : best > streak
                      ? `Your best is ${best}. ${best - streak} more to beat it.`
                      : 'This is your best run yet.'}
                </Text>
              </View>
            </View>

            <View style={styles.stats}>
              {[
                { label: 'Best streak', value: `${best}`, icon: 'flame' as const },
                { label: isThisMonth ? 'This month' : `In ${MONTHS[cursor.m].slice(0, 3)}`, value: `${monthCleared}`, icon: 'sun' as const },
                { label: 'Focused', value: monthFocus >= 60 ? `${Math.round(monthFocus / 6) / 10}h` : `${monthFocus}m`, icon: 'focus' as const },
              ].map((s, i) => (
                <Animated.View key={s.label} entering={reduceMotion ? undefined : FadeInDown.delay(150 + i * 80).springify().damping(18)} style={styles.stat}>
                  <Icon name={s.icon} size={16} color="#FFD65A" strokeWidth={2.2} />
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                    {s.value}
                  </Text>
                  <Text style={styles.statLabel} numberOfLines={1}>
                    {s.label}
                  </Text>
                </Animated.View>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.column, { marginTop: -22 }]}>
          <View style={[styles.card, t.raised, { backgroundColor: t.card }]}>
            <View style={styles.monthRow}>
              <PressableScale onPress={() => shift(-1)} style={[styles.navBtn, { backgroundColor: t.bg }]} accessibilityLabel="Previous month">
                <Icon name="chevronLeft" size={18} color={t.ink} />
              </PressableScale>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.month, { color: t.ink }]}>
                  {MONTHS[cursor.m]} {cursor.y}
                </Text>
                <Text style={[styles.monthSub, { color: t.muted }]}>
                  {monthDone} {monthDone === 1 ? 'task' : 'tasks'} finished
                </Text>
              </View>
              <PressableScale
                onPress={() => shift(1)}
                disabled={isThisMonth}
                style={[styles.navBtn, { backgroundColor: t.bg, opacity: isThisMonth ? 0.35 : 1 }]}
                accessibilityLabel="Next month"
              >
                <Icon name="chevronRight" size={18} color={t.ink} />
              </PressableScale>
            </View>

            <View style={styles.weekRow}>
              {WEEK.map((w, i) => (
                <Text key={i} style={[styles.weekday, { color: t.faint }]}>
                  {w}
                </Text>
              ))}
            </View>

            <Animated.View key={monthKey} entering={FadeIn.duration(220)} style={styles.grid}>
              {cells.map((d, i) => {
                if (!d) return <View key={`b${i}`} style={styles.cell} />;
                const day = dateOf(d).getDate();
                const col = i % 7;
                const isClear = cleared.has(d);
                const prevClear = col > 0 && cleared.has(addDays(d, -1));
                const nextClear = col < 6 && cleared.has(addDays(d, 1));
                const rec = record(d);
                const future = d > today;
                const share = rec && rec.planned ? rec.done / rec.planned : 0;
                const isPicked = d === picked;
                return (
                  <Pressable
                    key={d}
                    onPress={() => {
                      haptic.tap();
                      setPicked(d);
                    }}
                    style={styles.cell}
                    accessibilityRole="button"
                    accessibilityLabel={`${dayLabel(d, today)}${isClear ? ', all done' : rec?.planned ? `, ${rec.done} of ${rec.planned} done` : ''}`}
                  >
                    {/* Consecutive cleared days join into one band. */}
                    {isClear && (prevClear || nextClear) && (
                      <View
                        style={[
                          styles.chain,
                          { backgroundColor: t.isDark ? 'rgba(255,194,26,0.18)' : 'rgba(255,194,26,0.28)' },
                          { left: prevClear ? 0 : '50%', right: nextClear ? 0 : '50%' },
                        ]}
                      />
                    )}
                    {isPicked && <View style={[styles.picked, { borderColor: t.iris }]} />}
                    {isClear ? (
                      <Animated.View entering={reduceMotion ? undefined : ZoomIn.delay(Math.min(i, 30) * 14).springify().damping(13)}>
                        <SunCell day={day} glow={d === today || !nextClear} />
                      </Animated.View>
                    ) : rec?.planned && !future ? (
                      <PartialCell day={day} share={share} ink={t.ink} track={t.line} fill={t.iris} />
                    ) : (
                      <View style={styles.cellInner}>
                        <Text style={[styles.dayText, { color: future ? t.faint : d === today ? t.iris : t.muted }]}>{day}</Text>
                        {d === today && <View style={[styles.todayDot, { backgroundColor: t.iris }]} />}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </Animated.View>

            <View style={[styles.legend, { borderTopColor: t.line }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSun]} />
                <Text style={[styles.legendText, { color: t.muted }]}>All done</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendRing, { borderColor: t.iris }]} />
                <Text style={[styles.legendText, { color: t.muted }]}>Some done</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBand]} />
                <Text style={[styles.legendText, { color: t.muted }]}>Streak</Text>
              </View>
            </View>
          </View>

          <Animated.View key={picked} entering={FadeInDown.springify().damping(18)} style={[styles.card, styles.detail, t.raised, { backgroundColor: t.card }]}>
            <Text style={[styles.detailTitle, { color: t.ink }]}>{dayLabel(picked, today)}</Text>
            <Text style={[styles.detailBody, { color: t.muted }]}>
              {cleared.has(picked)
                ? `Cleared: all ${pickedRec?.planned ?? ''} planned ${pickedRec?.planned === 1 ? 'task' : 'tasks'} done.`
                : pickedRec?.planned
                  ? `${pickedRec.done} of ${pickedRec.planned} planned tasks done.`
                  : picked > today
                    ? pickedOpen
                      ? `${pickedOpen} ${pickedOpen === 1 ? 'task' : 'tasks'} planned.`
                      : 'Nothing planned yet.'
                    : 'Nothing was planned.'}
              {pickedRec?.focus ? ` ${duration(pickedRec.focus)} of focus.` : ''}
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 40 },
  hero: { paddingBottom: 46, overflow: 'hidden' },
  column: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  kicker: { fontFamily: F.semi, fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12, paddingHorizontal: 2 },
  bigSun: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  bigCore: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFD34D',
    borderWidth: 3,
    borderColor: '#FFF4C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigNum: { fontFamily: F.display, fontSize: 34, letterSpacing: -1, color: '#17143A', fontVariant: ['tabular-nums'] },
  streakTitle: { fontFamily: F.display, fontSize: 26, lineHeight: 29, letterSpacing: -0.6, color: '#FFFFFF' },
  streakSub: { fontFamily: F.medium, fontSize: 14, lineHeight: 19, color: 'rgba(255,255,255,0.82)', marginTop: 4 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stat: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    gap: 2,
  },
  statValue: { fontFamily: F.display, fontSize: 22, color: '#FFFFFF', marginTop: 4, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: F.semi, fontSize: 12, color: 'rgba(255,255,255,0.78)' },
  card: { borderRadius: 26, padding: 16 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  month: { fontFamily: F.displayBold, fontSize: 19, letterSpacing: -0.3 },
  monthSub: { fontFamily: F.medium, fontSize: 12.5, marginTop: 1 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', fontFamily: F.bold, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: CELL + 4, alignItems: 'center', justifyContent: 'center' },
  cellInner: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  cellGlow: { position: 'absolute', left: -(CELL + 10 - 36) / 2, top: -(CELL + 10 - 36) / 2 },
  ring: { transform: [{ rotate: '-90deg' }] },
  chain: { position: 'absolute', top: (CELL + 4 - 30) / 2, height: 30 },
  picked: { position: 'absolute', width: 42, height: 42, borderRadius: 21, borderWidth: 2 },
  sun: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFC21A',
    borderWidth: 2,
    borderColor: '#FFF1BF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunText: { fontFamily: F.bold, fontSize: 13.5, color: '#17143A', fontVariant: ['tabular-nums'] },
  dayText: { fontFamily: F.semi, fontSize: 13.5, fontVariant: ['tabular-nums'] },
  todayDot: { position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSun: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFC21A' },
  legendRing: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  legendBand: { width: 18, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,194,26,0.4)' },
  legendText: { fontFamily: F.semi, fontSize: 12 },
  detail: { marginTop: 12, gap: 4 },
  detailTitle: { fontFamily: F.displayBold, fontSize: 17 },
  detailBody: { fontFamily: F.medium, fontSize: 14.5, lineHeight: 20 },
});
