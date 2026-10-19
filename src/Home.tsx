import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddButton } from './components/AddButton';
import { Composer } from './components/Composer';
import { Confetti } from './components/Confetti';
import { EmptyState } from './components/EmptyState';
import { FocusMode } from './components/FocusMode';
import { NextUp } from './components/NextUp';
import { ProgressRing } from './components/ProgressRing';
import { Section } from './components/Section';
import { SkyHero } from './components/SkyHero';
import { TaskSheet } from './components/TaskSheet';
import { Tabs } from './components/Tabs';
import { Toast } from './components/Toast';
import { doneView, nextUp, todayView, upcomingView } from './select';
import { useStore } from './store';
import { F, phaseAt, SKY, useTheme } from './theme';
import { addDays, bucketOf, DAY_END, DAY_START, dayLabel, nowMinutes, toTime } from './time';
import type { Tab } from './types';
import { UIContext, type UI } from './ui/UIContext';
import { useNow } from './useNow';

export function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { tasks, today, settings, streak, celebration, bringToToday, clearDone } = useStore();
  const now = useNow(30_000);
  const nowMin = nowMinutes(now);

  const [tab, setTab] = useState<Tab>('today');
  const [composer, setComposer] = useState<{ open: boolean; date?: string | null }>({ open: false });
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const ui = useMemo<UI>(
    () => ({
      compose: (date) => setComposer({ open: true, date }),
      openTask: (id) => setOpenId(id),
      focus: (id) => {
        setOpenId(null);
        setFocusId(id);
      },
    }),
    [],
  );

  const day = useMemo(() => todayView(tasks, today), [tasks, today]);
  const todays = useMemo(() => tasks.filter((x) => x.date === today), [tasks, today]);
  const next = useMemo(() => nextUp(tasks, today), [tasks, today]);
  const upcoming = useMemo(() => upcomingView(tasks, today), [tasks, today]);
  const done = useMemo(() => doneView(tasks), [tasks]);
  const counts: Record<Tab, number> = {
    today: day.open.length + day.slipped.length,
    upcoming: [...upcoming.dated.values()].reduce((n, l) => n + l.length, 0) + upcoming.someday.length,
    done: tasks.filter((x) => x.done).length,
  };

  // Scroll-linked header: the sky folds into a slim bar as you scroll.
  const scrollY = useSharedValue(0);
  const heroH = useSharedValue(400);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const compact = useAnimatedStyle(() => {
    const p = interpolate(scrollY.value, [heroH.value - 170, heroH.value - 110], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ translateY: (1 - p) * -12 }] };
  });

  const currentBucket = nowMin >= DAY_START && nowMin < DAY_END ? bucketOf(toTime(nowMin)) : null;
  const sky = SKY[phaseAt(now)];
  const doneToday = todays.filter((x) => x.done).length;
  const leftToday = day.open.length;

  const onAdd = useCallback(() => ui.compose(tab === 'upcoming' ? addDays(today, 1) : today), [ui, tab, today]);

  return (
    <UIContext.Provider value={ui}>
      <View style={[styles.root, { backgroundColor: t.bg }]}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 132 }}
        >
          <View onLayout={(e) => (heroH.value = e.nativeEvent.layout.height)}>
            <SkyHero now={now} today={today} todays={todays} streak={streak} name={settings.name} scrollY={scrollY} />
          </View>

          <View style={[styles.sheet, { backgroundColor: t.bg }]}>
            <View style={styles.column}>
              <NextUp task={next} today={today} nowMin={nowMin} todayTotal={day.total} />
              <Tabs value={tab} counts={counts} onChange={setTab} />

              {tab === 'today' && (
                <View style={styles.list} key="today">
                  {day.slipped.length > 0 && (
                    <Section
                      title="Slipped"
                      hint="From earlier days"
                      tone="late"
                      action={{ label: 'Move all to today', onPress: () => bringToToday(day.slipped.map((x) => x.id)) }}
                      tasks={day.slipped}
                      today={today}
                      nowMin={nowMin}
                      showDate
                    />
                  )}
                  {day.buckets.map((b) => (
                    <Section
                      key={b.key}
                      title={b.title}
                      hint={b.hint}
                      current={b.bucket === currentBucket}
                      tasks={b.tasks}
                      today={today}
                      nowMin={nowMin}
                    />
                  ))}
                  {day.finished.length > 0 && (
                    <Section title="Finished" tone="quiet" tasks={day.finished} today={today} nowMin={nowMin} />
                  )}
                  {day.total === 0 && day.slipped.length === 0 && (
                    <EmptyState
                      title="Nothing planned for today"
                      body="Tasks you add for today land here, sorted into morning, afternoon and evening."
                    />
                  )}
                </View>
              )}

              {tab === 'upcoming' && (
                <View style={styles.list} key="upcoming">
                  {[...upcoming.dated.entries()].map(([date, list]) => (
                    <Section key={date} title={dayLabel(date, today)} tasks={list} today={today} nowMin={nowMin} />
                  ))}
                  {upcoming.someday.length > 0 && (
                    <Section title="Someday" hint="No day yet" tone="quiet" tasks={upcoming.someday} today={today} nowMin={nowMin} />
                  )}
                  {upcoming.dated.size === 0 && upcoming.someday.length === 0 && (
                    <EmptyState
                      title="Nothing on the horizon"
                      body="Add a task and pick a day, or just type it, like “Dentist next week” or “Call Sam friday 5pm”."
                    />
                  )}
                </View>
              )}

              {tab === 'done' && (
                <View style={styles.list} key="done">
                  {[...done.entries()].map(([date, list]) => (
                    <Section key={date} title={dayLabel(date, today)} tone="quiet" tasks={list} today={today} nowMin={nowMin} />
                  ))}
                  {done.size > 0 ? (
                    <Pressable onPress={clearDone} style={styles.clear} accessibilityRole="button">
                      <Text style={[styles.clearText, { color: t.ember }]}>Clear finished tasks</Text>
                    </Pressable>
                  ) : (
                    <EmptyState title="No finished tasks yet" body="Tick a task off and it moves here, so you can see what you got done." />
                  )}
                </View>
              )}
            </View>
          </View>
        </Animated.ScrollView>

        <Animated.View pointerEvents="none" style={[styles.compact, { paddingTop: insets.top }, compact]}>
          <LinearGradient colors={[sky.colors[0], sky.colors[1]]} style={StyleSheet.absoluteFill} />
          <View style={styles.compactRow}>
            <Text style={styles.compactTitle}>Today</Text>
            <View style={styles.compactRight}>
              <Text style={styles.compactMeta}>
                {leftToday === 0 ? (doneToday > 0 ? 'All done' : 'Nothing planned') : `${leftToday} left`}
              </Text>
              <ProgressRing size={22} stroke={3} progress={todays.length ? doneToday / todays.length : 0} color={t.sol} track="rgba(255,255,255,0.25)" />
            </View>
          </View>
        </Animated.View>

        <LinearGradient
          pointerEvents="none"
          colors={[`${t.bg}00`, `${t.bg}E6`, t.bg]}
          locations={[0, 0.55, 1]}
          style={[styles.scrim, { height: insets.bottom + 110 }]}
        />
        <AddButton onPress={onAdd} />
        <Toast />
        <Composer visible={composer.open} defaultDate={composer.date} onClose={() => setComposer((c) => ({ ...c, open: false }))} />
        <TaskSheet taskId={openId} onClose={() => setOpenId(null)} />
        <FocusMode taskId={focusId} onClose={() => setFocusId(null)} />
        <Confetti trigger={celebration} />
        <StatusBar style="light" />
      </View>
    </UIContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sheet: { marginTop: -30, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 18 },
  column: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 16, gap: 18 },
  list: { gap: 22, marginTop: 2 },
  clear: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  clearText: { fontFamily: F.bold, fontSize: 14.5 },
  compact: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  compactRow: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    height: 50,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactTitle: { fontFamily: F.displayBold, fontSize: 18, color: '#FFFFFF' },
  compactRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compactMeta: { fontFamily: F.semi, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
});
