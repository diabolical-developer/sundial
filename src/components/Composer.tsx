import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ZoomIn } from 'react-native-reanimated';

import { haptic } from '../haptics';
import { parseQuickAdd } from '../parse';
import { remindersSupported } from '../reminders';
import { useStore } from '../store';
import { F, useTheme } from '../theme';
import { dayLabel } from '../time';
import type { Schedule } from '../types';
import { Icon, type IconName } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { ScheduleFields } from './ScheduleFields';
import { TopSheet } from './TopSheet';

interface Props {
  visible: boolean;
  /** Day the new task starts on (undefined = today). */
  defaultDate?: string | null;
  onClose: () => void;
}

const TOKEN_ICON: Record<'date' | 'time' | 'priority', IconName> = { date: 'calendar', time: 'clock', priority: 'arrowUp' };

export function Composer({ visible, defaultDate, onClose }: Props) {
  const t = useTheme();
  const { addTask, today } = useStore();
  const [text, setText] = useState('');
  const [manual, setManual] = useState<Partial<Schedule>>({});
  const [added, setAdded] = useState(0);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setText('');
    setManual({});
    setAdded(0);
    const id = setTimeout(() => input.current?.focus(), 320);
    return () => clearTimeout(id);
  }, [visible]);

  useEffect(() => {
    if (!added) return;
    const id = setTimeout(() => setAdded(0), 1800);
    return () => clearTimeout(id);
  }, [added]);

  // Typed words fill in the schedule; anything picked by hand wins.
  const parsed = useMemo(() => parseQuickAdd(text), [text]);
  const time = manual.time !== undefined ? manual.time : (parsed.time ?? null);
  const schedule: Schedule = {
    date:
      manual.date !== undefined
        ? manual.date
        : parsed.date !== undefined
          ? parsed.date
          : defaultDate === undefined
            ? today
            : defaultDate,
    time,
    priority: manual.priority ?? parsed.priority ?? 'normal',
    reminder: manual.reminder ?? (remindersSupported && time !== null),
  };
  const title = parsed.title;
  const where = schedule.date ? dayLabel(schedule.date, today) : 'Someday';
  const whereText = /^\D/.test(where) && !where.includes(' ') ? where.toLowerCase() : where;

  const submit = (keepOpen: boolean) => {
    if (!title) return;
    addTask({ title, ...schedule, reminder: schedule.reminder && schedule.date !== null });
    haptic.success();
    setText('');
    setManual({});
    if (keepOpen) {
      setAdded((n) => n + 1);
      input.current?.focus();
    } else onClose();
  };

  return (
    <TopSheet visible={visible} onClose={onClose} label="New task">
      <View style={styles.header}>
        <Text style={[styles.heading, { color: t.ink }]}>New task</Text>
        <Pressable onPress={onClose} hitSlop={10} style={[styles.close, { backgroundColor: t.bg }]} accessibilityLabel="Close">
          <Icon name="x" size={18} color={t.ink} />
        </Pressable>
      </View>

      <View>
        <TextInput
          ref={input}
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => submit(true)}
          submitBehavior="submit"
          returnKeyType="done"
          placeholder="What do you want to get done?"
          placeholderTextColor={t.faint}
          style={[styles.input, { color: t.ink }]}
          accessibilityLabel="Task, with optional day and time"
        />
        <Animated.View layout={LinearTransition.duration(200)} style={styles.understood}>
          {added > 0 ? (
            <Animated.Text key={`added-${added}`} entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={[styles.hint, { color: t.leaf }]}>
              Added. Type the next one, or close when you’re done.
            </Animated.Text>
          ) : parsed.tokens.length === 0 ? (
            <Animated.Text key="hint" entering={FadeIn.duration(200)} style={[styles.hint, { color: t.muted }]}>
              Type a day or time and we’ll set it, like “Gym tomorrow 7am” or “Pay rent friday !”
            </Animated.Text>
          ) : (
            parsed.tokens.map((tok) => (
              <Animated.View
                key={`${tok.kind}-${tok.label}`}
                entering={ZoomIn.springify().damping(14)}
                exiting={FadeOut.duration(120)}
                style={[styles.token, { backgroundColor: t.irisSoft }]}
              >
                <Icon name={TOKEN_ICON[tok.kind]} size={14} color={t.iris} strokeWidth={2.4} />
                <Text style={[styles.tokenText, { color: t.iris }]}>{tok.label}</Text>
              </Animated.View>
            ))
          )}
        </Animated.View>
      </View>

      <ScheduleFields value={schedule} onChange={(p) => setManual((m) => ({ ...m, ...p }))} today={today} />

      <PressableScale
        onPress={() => submit(false)}
        disabled={!title}
        style={[styles.add, { backgroundColor: t.sol, opacity: title ? 1 : 0.45 }]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !title }}
      >
        <Icon name="plus" size={20} color={t.solInk} strokeWidth={2.6} />
        <Text style={[styles.addText, { color: t.solInk }]}>Add to {whereText}</Text>
      </PressableScale>
    </TopSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontFamily: F.displayBold, fontSize: 20, letterSpacing: -0.3 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  input: { fontFamily: F.displaySemi, fontSize: 25, lineHeight: 31, paddingVertical: 6, letterSpacing: -0.4 },
  understood: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 30, alignItems: 'center', marginTop: 4 },
  hint: { fontFamily: F.medium, fontSize: 13.5, lineHeight: 19 },
  token: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tokenText: { fontFamily: F.bold, fontSize: 13 },
  add: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addText: { fontFamily: F.bold, fontSize: 16.5 },
});
