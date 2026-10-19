import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { describeDue } from '../dates';
import { priorityColor, type Theme } from '../theme';
import type { Task } from '../types';

interface Props {
  task: Task;
  theme: Theme;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function TaskItemBase({ task, theme, onToggle, onDelete }: Props) {
  const due = describeDue(task.due);
  const dueColor =
    task.done ? theme.muted : due.tone === 'overdue' ? theme.danger : due.tone === 'today' ? theme.accent : theme.muted;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        onPress={() => onToggle(task.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
        accessibilityLabel={task.title}
        hitSlop={8}
        style={styles.main}
      >
        <View
          style={[
            styles.check,
            { borderColor: task.done ? theme.success : theme.border, backgroundColor: task.done ? theme.success : 'transparent' },
          ]}
        >
          {task.done && <Text style={styles.tick}>✓</Text>}
        </View>
        <View style={styles.body}>
          <Text
            style={[
              styles.title,
              { color: task.done ? theme.muted : theme.text },
              task.done && styles.struck,
            ]}
          >
            {task.title}
          </Text>
          <View style={styles.meta}>
            <View style={[styles.dot, { backgroundColor: priorityColor(theme, task.priority) }]} />
            <Text style={[styles.metaText, { color: dueColor }]}>{due.label}</Text>
          </View>
        </View>
      </Pressable>
      <Pressable
        onPress={() => onDelete(task.id)}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${task.title}`}
        hitSlop={10}
        style={styles.delete}
      >
        <Text style={[styles.deleteText, { color: theme.muted }]}>✕</Text>
      </Pressable>
    </View>
  );
}

export const TaskItem = memo(TaskItemBase);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 6,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tick: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', lineHeight: 16 },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '500' },
  struck: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  metaText: { fontSize: 12, fontWeight: '600' },
  delete: { padding: 8 },
  deleteText: { fontSize: 15 },
});
