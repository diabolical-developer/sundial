import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { daysFromToday } from '../dates';
import { priorityColor, type Theme } from '../theme';
import type { Priority } from '../types';

type DueChoice = 'none' | 'today' | 'tomorrow' | 'week';

const DUE_OPTIONS: { key: DueChoice; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'Next week' },
  { key: 'none', label: 'No date' },
];

const dueFor = (c: DueChoice) =>
  c === 'today' ? daysFromToday(0) : c === 'tomorrow' ? daysFromToday(1) : c === 'week' ? daysFromToday(7) : null;

const NEXT_PRIORITY: Record<Priority, Priority> = { low: 'medium', medium: 'high', high: 'low' };

interface Props {
  theme: Theme;
  defaultDue: DueChoice;
  onAdd: (title: string, due: string | null, priority: Priority) => void;
}

export function AddTask({ theme, defaultDue, onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState<DueChoice>(defaultDue);
  const [priority, setPriority] = useState<Priority>('medium');

  const submit = () => {
    if (!title.trim()) return;
    onAdd(title, dueFor(due), priority);
    setTitle('');
  };

  const canAdd = title.trim().length > 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.row}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={submit}
          placeholder="Add a task…"
          placeholderTextColor={theme.muted}
          returnKeyType="done"
          submitBehavior="submit"
          accessibilityLabel="New task title"
          style={[styles.input, { color: theme.text }]}
        />
        <Pressable
          onPress={submit}
          disabled={!canAdd}
          accessibilityRole="button"
          accessibilityLabel="Add task"
          style={[styles.addButton, { backgroundColor: theme.accent, opacity: canAdd ? 1 : 0.4 }]}
        >
          <Text style={[styles.addText, { color: theme.onAccent }]}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.chips}>
        {DUE_OPTIONS.map((o) => {
          const active = o.key === due;
          return (
            <Pressable
              key={o.key}
              onPress={() => setDue(o.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                { borderColor: active ? theme.accent : theme.border, backgroundColor: active ? theme.accentSoft : 'transparent' },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? theme.accent : theme.muted }]}>{o.label}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setPriority(NEXT_PRIORITY[priority])}
          accessibilityRole="button"
          accessibilityLabel={`Priority ${priority}. Tap to change.`}
          style={[styles.chip, { borderColor: theme.border }]}
        >
          <View style={[styles.dot, { backgroundColor: priorityColor(theme, priority) }]} />
          <Text style={[styles.chipText, { color: theme.muted }]}>
            {priority[0].toUpperCase() + priority.slice(1)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, fontSize: 16, paddingVertical: 8, paddingHorizontal: 4 },
  addButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addText: { fontWeight: '700', fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
