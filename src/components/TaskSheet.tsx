import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { haptic } from '../haptics';
import { useStore } from '../store';
import { F, useTheme } from '../theme';
import { addDays, dayLabel, duration, dayKeyOf } from '../time';
import type { Task } from '../types';
import { Icon, type IconName } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { useUI } from '../ui/UIContext';
import { ScheduleFields } from './ScheduleFields';
import { TopSheet } from './TopSheet';

interface Props {
  taskId: string | null;
  onClose: () => void;
}

export function TaskSheet({ taskId, onClose }: Props) {
  const t = useTheme();
  const ui = useUI();
  const { tasks, today, updateTask, setDone, deleteTask } = useStore();
  const live = taskId ? tasks.find((x) => x.id === taskId) : undefined;

  // Keep showing the last task while the sheet animates away.
  const last = useRef<Task | null>(null);
  if (live) last.current = live;
  const task = live ?? last.current;

  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [titleH, setTitleH] = useState(36);
  useEffect(() => {
    if (live) {
      setTitle(live.title);
      setNotes(live.notes);
    }
    // Only when a different task opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  if (!task) return null;
  const visible = !!live;

  const tomorrow = addDays(today, 1);
  const move = task.date === today ? { label: 'Tomorrow', date: tomorrow, icon: 'calendar' as IconName } : { label: 'Today', date: today, icon: 'sun' as IconName };

  const actions: { label: string; icon: IconName; onPress: () => void; tone?: 'danger' }[] = [
    ...(!task.done
      ? [
          {
            label: 'Focus',
            icon: 'play' as IconName,
            onPress: () => {
              onClose();
              ui.focus(task.id);
            },
          },
          {
            label: move.label,
            icon: move.icon,
            onPress: () => {
              haptic.tap();
              updateTask(task.id, { date: move.date });
            },
          },
        ]
      : []),
    {
      label: 'Delete',
      icon: 'trash',
      tone: 'danger',
      onPress: () => {
        onClose();
        deleteTask(task.id);
      },
    },
  ];

  return (
    <TopSheet visible={visible} onClose={onClose} label="Task details">
      <View style={styles.header}>
        <View style={[styles.status, { backgroundColor: task.done ? t.leafSoft : t.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: task.done ? t.leaf : task.priority === 'high' ? t.amber : t.iris }]} />
          <Text style={[styles.statusText, { color: task.done ? t.leaf : t.muted }]}>
            {task.done ? 'Done' : task.date ? dayLabel(task.date, today) : 'Someday'}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10} style={[styles.close, { backgroundColor: t.bg }]} accessibilityLabel="Close">
          <Icon name="x" size={18} color={t.ink} />
        </Pressable>
      </View>

      <TextInput
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          if (v.trim()) updateTask(task.id, { title: v.trim() });
        }}
        multiline
        onContentSizeChange={(e) => setTitleH(Math.max(36, e.nativeEvent.contentSize.height))}
        placeholder="Task name"
        placeholderTextColor={t.faint}
        style={[styles.title, { color: t.ink, height: titleH }]}
        accessibilityLabel="Task name"
      />
      <TextInput
        value={notes}
        onChangeText={(v) => {
          setNotes(v);
          updateTask(task.id, { notes: v });
        }}
        multiline
        placeholder="Add a note"
        placeholderTextColor={t.faint}
        style={[styles.notes, { color: t.ink, backgroundColor: t.bg }]}
        accessibilityLabel="Note"
      />

      <ScheduleFields
        value={{ date: task.date, time: task.time, priority: task.priority, reminder: task.reminder, repeat: task.repeat ?? null }}
        onChange={(p) => updateTask(task.id, p)}
        today={today}
      />

      <View style={styles.actions}>
        {actions.map((a) => (
          <PressableScale
            key={a.label}
            onPress={a.onPress}
            style={[styles.action, { backgroundColor: a.tone === 'danger' ? t.emberSoft : t.bg }]}
            accessibilityRole="button"
            accessibilityLabel={a.label === 'Tomorrow' || a.label === 'Today' ? `Move to ${a.label.toLowerCase()}` : a.label}
          >
            <Icon name={a.icon} size={18} color={a.tone === 'danger' ? t.ember : t.ink} />
            <Text style={[styles.actionText, { color: a.tone === 'danger' ? t.ember : t.ink }]}>
              {a.label}
            </Text>
          </PressableScale>
        ))}
      </View>

      <PressableScale
        onPress={() => {
          setDone(task.id, !task.done);
          if (!task.done) haptic.success();
          onClose();
        }}
        style={[styles.primary, task.done ? { borderWidth: 1.5, borderColor: t.line } : { backgroundColor: t.leaf }]}
        accessibilityRole="button"
      >
        <Icon name={task.done ? 'undo' : 'check'} size={20} color={task.done ? t.ink : '#FFFFFF'} strokeWidth={2.6} />
        <Text style={[styles.primaryText, { color: task.done ? t.ink : '#FFFFFF' }]}>
          {task.done ? 'Mark as not done' : 'Mark as done'}
        </Text>
      </PressableScale>

      <Text style={[styles.footer, { color: t.faint }]}>
        Added {dayLabel(dayKeyOf(new Date(task.createdAt)), today).replace(/^(Today|Yesterday|Tomorrow)$/, (m) => m.toLowerCase())}
        {task.focusMinutes > 0 ? `. ${duration(task.focusMinutes)} of focus so far.` : '.'}
      </Text>
    </TopSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: F.bold, fontSize: 13 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.displayBold, fontSize: 26, lineHeight: 31, letterSpacing: -0.5, paddingVertical: 2 },
  notes: { fontFamily: F.body, fontSize: 15, lineHeight: 21, borderRadius: 16, padding: 14, minHeight: 52 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2 },
  actionText: { fontFamily: F.bold, fontSize: 12.5 },
  primary: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { fontFamily: F.bold, fontSize: 16.5 },
  footer: { fontFamily: F.medium, fontSize: 12.5, textAlign: 'center', marginBottom: 4 },
});
