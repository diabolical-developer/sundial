import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Theme } from '../theme';
import type { Filter } from '../types';

const TABS: { key: Filter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'all', label: 'All' },
  { key: 'done', label: 'Done' },
];

interface Props {
  theme: Theme;
  value: Filter;
  counts: Record<Filter, number>;
  onChange: (f: Filter) => void;
}

export function FilterTabs({ theme, value, counts, onChange }: Props) {
  return (
    <View style={[styles.bar, { backgroundColor: theme.card, borderColor: theme.border }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active && { backgroundColor: theme.accent }]}
          >
            <Text style={[styles.label, { color: active ? theme.onAccent : theme.muted }]} numberOfLines={1}>
              {t.label}
              {counts[t.key] > 0 ? ` ${counts[t.key]}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4, gap: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  label: { fontSize: 13, fontWeight: '700' },
});
