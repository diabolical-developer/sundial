import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AddTask } from './src/components/AddTask';
import { FilterTabs } from './src/components/FilterTabs';
import { TaskItem } from './src/components/TaskItem';
import { headerDate } from './src/dates';
import { useTheme } from './src/theme';
import type { Filter, Task } from './src/types';
import { useTasks } from './src/useTasks';

const EMPTY: Record<Filter, { title: string; hint: string }> = {
  today: { title: 'Nothing due today', hint: 'Add a task above to plan your day.' },
  upcoming: { title: 'No upcoming tasks', hint: 'Tasks due tomorrow or later show up here.' },
  all: { title: 'All clear', hint: 'Every open task lives here.' },
  done: { title: 'No completed tasks yet', hint: 'Tick a task to mark it done.' },
};

function Home() {
  const theme = useTheme();
  const { loaded, lists, progress, overdue, addTask, toggleTask, deleteTask, clearDone } = useTasks();
  const [filter, setFilter] = useState<Filter>('today');

  const counts = useMemo(
    () => ({
      today: lists.today.filter((t) => !t.done).length,
      upcoming: lists.upcoming.length,
      all: lists.all.length,
      done: lists.done.length,
    }),
    [lists],
  );

  const renderItem = useCallback(
    ({ item }: { item: Task }) => (
      <TaskItem task={item} theme={theme} onToggle={toggleTask} onDelete={deleteTask} />
    ),
    [theme, toggleTask, deleteTask],
  );

  const pct = progress.total ? progress.done / progress.total : 0;
  const data = lists[filter];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.date, { color: theme.muted }]}>{headerDate()}</Text>
          <Text style={[styles.h1, { color: theme.text }]}>My tasks</Text>
          <View style={styles.progressRow}>
            <View style={[styles.track, { backgroundColor: theme.border }]}>
              <View style={[styles.fill, { backgroundColor: theme.success, width: `${Math.round(pct * 100)}%` }]} />
            </View>
            <Text style={[styles.progressText, { color: theme.muted }]}>
              {progress.total ? `${progress.done}/${progress.total} today` : 'No tasks due today'}
            </Text>
          </View>
          {overdue > 0 && (
            <Text style={[styles.overdue, { color: theme.danger }]}>
              {overdue} overdue {overdue === 1 ? 'task' : 'tasks'}
            </Text>
          )}
        </View>

        <AddTask theme={theme} defaultDue="today" onAdd={addTask} />
        <FilterTabs theme={theme} value={filter} counts={counts} onChange={setFilter} />

        {!loaded ? (
          <ActivityIndicator style={styles.loading} color={theme.accent} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(t) => t.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.gap} />}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>{EMPTY[filter].title}</Text>
                <Text style={[styles.emptyHint, { color: theme.muted }]}>{EMPTY[filter].hint}</Text>
              </View>
            }
            ListFooterComponent={
              filter === 'done' && data.length > 0 ? (
                <Pressable onPress={clearDone} accessibilityRole="button" style={styles.clear}>
                  <Text style={[styles.clearText, { color: theme.danger }]}>Clear completed</Text>
                </Pressable>
              ) : null
            }
          />
        )}
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Home />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // maxWidth keeps the layout comfortable on tablets and desktop browsers.
  container: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  header: { gap: 4, marginBottom: 4 },
  date: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  h1: { fontSize: 30, fontWeight: '800' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '600' },
  overdue: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  loading: { marginTop: 40 },
  list: { paddingTop: 4, paddingBottom: 40 },
  gap: { height: 8 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyHint: { fontSize: 14 },
  clear: { alignSelf: 'center', padding: 16 },
  clearText: { fontWeight: '700' },
});
