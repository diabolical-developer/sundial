import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { F, useTheme } from '../theme';
import type { Task } from '../types';
import { TaskRow } from './TaskRow';

interface Props {
  title: string;
  hint?: string;
  /** Highlights the section the current time falls in. */
  current?: boolean;
  tone?: 'default' | 'late' | 'quiet';
  action?: { label: string; onPress: () => void };
  tasks: Task[];
  today: string;
  nowMin: number;
  showDate?: boolean;
  footer?: ReactNode;
}

export function Section({ title, hint, current, tone = 'default', action, tasks, today, nowMin, showDate, footer }: Props) {
  const t = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(220)} layout={LinearTransition.springify().damping(22).stiffness(200)} style={styles.section}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: tone === 'late' ? t.ember : tone === 'quiet' ? t.muted : t.ink }]} accessibilityRole="header">
          {title}
        </Text>
        {current && (
          <View style={[styles.now, { backgroundColor: t.sol }]}>
            <Text style={[styles.nowText, { color: t.solInk }]}>Now</Text>
          </View>
        )}
        {hint ? <Text style={[styles.hint, { color: t.muted }]}>{hint}</Text> : null}
        <View style={{ flex: 1 }} />
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.action, { color: t.iris }]}>{action.label}</Text>
          </Pressable>
        )}
      </View>
      <Animated.View
        layout={LinearTransition.springify().damping(22).stiffness(200)}
        style={[styles.card, { backgroundColor: t.card, opacity: tone === 'quiet' ? 0.92 : 1 }]}
      >
        {tasks.map((task, i) => (
          <TaskRow key={task.id} task={task} today={today} nowMin={nowMin} showDate={showDate} last={i === tasks.length - 1} />
        ))}
      </Animated.View>
      {footer}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  title: { fontFamily: F.displayBold, fontSize: 18, letterSpacing: -0.3 },
  hint: { fontFamily: F.medium, fontSize: 13 },
  now: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  nowText: { fontFamily: F.bold, fontSize: 11 },
  action: { fontFamily: F.bold, fontSize: 13.5 },
  card: { borderRadius: 22, overflow: 'hidden' },
});
