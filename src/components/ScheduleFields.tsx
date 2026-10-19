import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptic } from '../haptics';
import { remindersSupported } from '../reminders';
import { F, useTheme, type Theme } from '../theme';
import { addDays, dateOf, dayLabel, formatTime, minutesOf, toTime, weekdayShort } from '../time';
import { REPEAT_LABEL } from '../repeat';
import type { Priority, Repeat, Schedule } from '../types';
import { Icon } from '../ui/Icon';
import { SPRING } from '../ui/motion';

const TIMES: { label: string; value: string | null }[] = [
  { label: 'Any time', value: null },
  { label: 'Morning', value: '09:00' },
  { label: 'Midday', value: '12:00' },
  { label: 'Afternoon', value: '15:00' },
  { label: 'Evening', value: '18:00' },
  { label: 'Night', value: '21:00' },
  { label: 'Late night', value: '23:30' },
];

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'low', label: 'Low' },
  { key: 'normal', label: 'Normal' },
  { key: 'high', label: 'High' },
];

const REPEATS: { key: Repeat | null; label: string }[] = [
  { key: null, label: 'Never' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekdays', label: 'Weekdays' },
  { key: 'weekly', label: 'Weekly' },
];

interface Props {
  value: Schedule;
  onChange: (patch: Partial<Schedule>) => void;
  today: string;
}

function Label({ t, text, value }: { t: Theme; text: string; value?: string }) {
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color: t.muted }]}>{text}</Text>
      {value ? <Text style={[styles.labelValue, { color: t.ink }]}>{value}</Text> : null}
    </View>
  );
}

/** Day, time, priority and reminder — shared by "add" and "edit". */
export function ScheduleFields({ value, onChange, today }: Props) {
  const t = useTheme();
  const days: (string | null)[] = [...Array.from({ length: 14 }, (_, i) => addDays(today, i)), null];
  const set = (patch: Partial<Schedule>) => {
    haptic.tap();
    onChange(patch);
  };
  const presetHit = TIMES.some((x) => x.value === value.time);

  return (
    <View style={styles.wrap}>
      <View style={styles.group}>
        <Label t={t} text="Day" value={value.date ? dayLabel(value.date, today) : 'Someday'} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {days.map((d) => {
            const active = d === value.date;
            const isToday = d === today;
            return (
              <Pressable
                key={d ?? 'someday'}
                onPress={() => set({ date: d })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={d ? dayLabel(d, today) : 'Someday'}
                style={[styles.day, { backgroundColor: active ? t.iris : t.bg }, !d && styles.someday]}
              >
                {d ? (
                  <>
                    <Text style={[styles.dayName, { color: active ? 'rgba(255,255,255,0.8)' : t.muted }]}>
                      {isToday ? 'Today' : weekdayShort(d)}
                    </Text>
                    <Text style={[styles.dayNum, { color: active ? '#FFFFFF' : t.ink }]}>{dateOf(d).getDate()}</Text>
                  </>
                ) : (
                  <>
                    <Icon name="moon" size={18} color={active ? '#FFFFFF' : t.muted} />
                    <Text style={[styles.dayName, { color: active ? '#FFFFFF' : t.muted, marginTop: 4 }]}>Someday</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.group}>
        <Label t={t} text="Time" value={value.time ? formatTime(value.time) : 'Any time'} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {TIMES.map((opt) => {
            const active = opt.value === value.time || (opt.value === null && value.time === null);
            return (
              <Pressable
                key={opt.label}
                onPress={() => set({ time: opt.value })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.chip, { backgroundColor: active ? t.iris : t.bg }]}
              >
                <Text style={[styles.chipText, { color: active ? '#FFFFFF' : t.ink }]}>{opt.label}</Text>
                {opt.value && (
                  <Text style={[styles.chipSub, { color: active ? 'rgba(255,255,255,0.75)' : t.muted }]}>
                    {formatTime(opt.value)}
                  </Text>
                )}
              </Pressable>
            );
          })}
          {value.time && !presetHit && (
            <View style={[styles.chip, { backgroundColor: t.iris }]}>
              <Text style={[styles.chipText, { color: '#FFFFFF' }]}>Custom</Text>
              <Text style={[styles.chipSub, { color: 'rgba(255,255,255,0.75)' }]}>{formatTime(value.time)}</Text>
            </View>
          )}
        </ScrollView>
        {value.time && (
          <Animated.View entering={FadeIn.duration(200)} style={[styles.stepper, { backgroundColor: t.bg }]}>
            <Pressable
              onPress={() => set({ time: toTime(minutesOf(value.time!) - 15) })}
              style={styles.stepBtn}
              accessibilityLabel="15 minutes earlier"
              hitSlop={6}
            >
              <Icon name="minus" size={18} color={t.ink} />
            </Pressable>
            <Text style={[styles.stepValue, { color: t.ink }]}>{formatTime(value.time)}</Text>
            <Pressable
              onPress={() => set({ time: toTime(minutesOf(value.time!) + 15) })}
              style={styles.stepBtn}
              accessibilityLabel="15 minutes later"
              hitSlop={6}
            >
              <Icon name="plus" size={18} color={t.ink} />
            </Pressable>
          </Animated.View>
        )}
      </View>

      <View style={styles.group}>
        <Label t={t} text="Priority" />
        <View style={[styles.segment, { backgroundColor: t.bg }]}>
          {PRIORITIES.map((p) => {
            const active = p.key === value.priority;
            const dot = p.key === 'high' ? t.amber : p.key === 'low' ? t.faint : t.iris;
            return (
              <Pressable
                key={p.key}
                onPress={() => set({ priority: p.key })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.segBtn, active && { backgroundColor: t.card, borderColor: t.line }]}
              >
                <View style={[styles.dot, { backgroundColor: dot }]} />
                <Text style={[styles.segText, { color: active ? t.ink : t.muted }]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {value.date && (
        <View style={styles.group}>
          <Label
            t={t}
            text="Repeat"
            value={!value.repeat ? 'Never' : value.repeat === 'weekly' ? `Every ${weekdayShort(value.date)}` : REPEAT_LABEL[value.repeat]}
          />
          <View style={[styles.segment, { backgroundColor: t.bg }]}>
            {REPEATS.map((r) => {
              const active = (value.repeat ?? null) === r.key;
              return (
                <Pressable
                  key={r.label}
                  onPress={() => set({ repeat: r.key })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.segBtn, active && { backgroundColor: t.card, borderColor: t.line }]}
                >
                  {r.key && <Icon name="repeat" size={13} color={active ? t.iris : t.faint} strokeWidth={2.4} />}
                  <Text style={[styles.segText, { color: active ? t.ink : t.muted }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {remindersSupported && (
        <Pressable
          onPress={() => value.date && set({ reminder: !value.reminder })}
          style={[styles.remind, { backgroundColor: t.bg, opacity: value.date ? 1 : 0.55 }]}
          accessibilityRole="switch"
          accessibilityState={{ checked: value.reminder, disabled: !value.date }}
        >
          <Icon name="bell" size={20} color={t.ink} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.remindTitle, { color: t.ink }]}>Remind me</Text>
            <Text style={[styles.remindSub, { color: t.muted }]}>
              {!value.date
                ? 'Pick a day to get a reminder'
                : value.time
                  ? `At ${formatTime(value.time)}`
                  : 'At 9 am on the day'}
            </Text>
          </View>
          <Toggle on={value.reminder && !!value.date} t={t} />
        </Pressable>
      )}
    </View>
  );
}

function Toggle({ on, t }: { on: boolean; t: Theme }) {
  const x = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    x.value = withSpring(on ? 1 : 0, SPRING);
  }, [on, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 18 }] }));
  return (
    <View style={[styles.track, { backgroundColor: on ? t.leaf : t.line }]}>
      <Animated.View style={[styles.knob, knob]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  group: { gap: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontFamily: F.semi, fontSize: 13.5 },
  labelValue: { fontFamily: F.bold, fontSize: 13.5 },
  strip: { gap: 8, paddingRight: 8 },
  day: { width: 54, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  someday: { width: 76 },
  dayName: { fontFamily: F.semi, fontSize: 11.5 },
  dayNum: { fontFamily: F.displayBold, fontSize: 21, marginTop: 1 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, minWidth: 78 },
  chipText: { fontFamily: F.bold, fontSize: 13.5 },
  chipSub: { fontFamily: F.medium, fontSize: 12, marginTop: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 6,
    height: 48,
  },
  stepBtn: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontFamily: F.displayBold, fontSize: 19, fontVariant: ['tabular-nums'] },
  segment: { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4 },
  segBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  segText: { fontFamily: F.bold, fontSize: 13 },
  remind: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14 },
  remindTitle: { fontFamily: F.bold, fontSize: 15 },
  remindSub: { fontFamily: F.medium, fontSize: 13, marginTop: 1 },
  track: { width: 46, height: 28, borderRadius: 14, padding: 3 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
});
