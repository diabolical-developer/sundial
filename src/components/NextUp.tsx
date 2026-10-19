import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { useStore } from '../store';
import { F, useTheme } from '../theme';
import { addDays, dayLabel, formatTime, minutesOf, relative } from '../time';
import type { Task } from '../types';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { useUI } from '../ui/UIContext';

interface Props {
  task: Task | null;
  today: string;
  nowMin: number;
  /** Tasks planned for today, done or not. */
  todayTotal: number;
}

/** The one thing to do now, with the two actions that move it forward. */
export function NextUp({ task, today, nowMin, todayTotal }: Props) {
  const t = useTheme();
  const ui = useUI();
  const { setDone } = useStore();

  if (!task) {
    const cleared = todayTotal > 0;
    return (
      <Animated.View
        key={cleared ? 'clear' : 'empty'}
        entering={FadeInDown.springify().damping(18)}
        exiting={FadeOutUp.duration(160)}
        style={[styles.card, { backgroundColor: t.panel }]}
      >
        <Text style={[styles.eyebrow, { color: t.panelMuted }]}>{cleared ? 'Today is clear' : 'Start here'}</Text>
        <Text style={[styles.title, { color: t.panelInk }]}>
          {cleared ? 'You finished everything you planned.' : 'What’s one thing you want done today?'}
        </Text>
        <View style={styles.actions}>
          <PressableScale
            onPress={() => ui.compose(cleared ? addDays(today, 1) : today)}
            style={[styles.primary, { backgroundColor: t.sol }]}
            accessibilityRole="button"
          >
            <Icon name={cleared ? 'calendar' : 'plus'} size={18} color={t.solInk} strokeWidth={2.4} />
            <Text style={[styles.primaryText, { color: t.solInk }]}>{cleared ? 'Plan tomorrow' : 'Add a task'}</Text>
          </PressableScale>
        </View>
      </Animated.View>
    );
  }

  const slipped = task.date !== null && task.date < today;
  let when: { text: string; tone: 'late' | 'now' | 'soon' | 'calm' };
  if (slipped) when = { text: `From ${dayLabel(task.date!, today).toLowerCase()}`, tone: 'late' };
  else if (task.time) {
    const diff = minutesOf(task.time) - nowMin;
    const text = relative(diff);
    when = { text: text === 'now' ? 'Starts now' : text, tone: text === 'now' ? 'now' : diff < 0 ? 'late' : 'soon' };
  } else when = { text: 'Any time today', tone: 'calm' };

  const pillBg = when.tone === 'late' ? t.ember : when.tone === 'now' ? t.sol : 'rgba(255,255,255,0.14)';
  const pillInk = when.tone === 'now' ? t.solInk : '#FFFFFF';

  return (
    <Animated.View
      key={task.id}
      entering={FadeInDown.springify().damping(18)}
      exiting={FadeOutUp.duration(160)}
      style={[styles.card, { backgroundColor: t.panel }]}
    >
      <View style={styles.head}>
        <View style={styles.sunDot} />
        <Text style={[styles.eyebrow, { color: t.panelMuted, flex: 1 }]}>Up next</Text>
        <View style={[styles.pill, { backgroundColor: pillBg }]}>
          <Text style={[styles.pillText, { color: pillInk }]}>{when.text}</Text>
        </View>
      </View>

      <Pressable onPress={() => ui.openTask(task.id)} accessibilityRole="button" accessibilityHint="Opens task details">
        <Text style={[styles.title, { color: t.panelInk }]} numberOfLines={3}>
          {task.title}
        </Text>
        {task.time && !slipped && (
          <Text style={[styles.sub, { color: t.panelMuted }]}>
            {formatTime(task.time)}
            {task.priority === 'high' ? ', high priority' : ''}
          </Text>
        )}
      </Pressable>

      <View style={styles.actions}>
        <PressableScale
          onPress={() => ui.focus(task.id)}
          style={[styles.primary, { backgroundColor: t.sol }]}
          accessibilityRole="button"
          accessibilityLabel={`Start a focus session on ${task.title}`}
        >
          <Icon name="play" size={16} color={t.solInk} />
          <Text style={[styles.primaryText, { color: t.solInk }]}>Start focus</Text>
        </PressableScale>
        <PressableScale
          onPress={() => setDone(task.id, true, { toast: true })}
          style={styles.secondary}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${task.title} as done`}
        >
          <Icon name="check" size={18} color="#FFFFFF" strokeWidth={2.6} />
          <Text style={styles.secondaryText}>Done</Text>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, padding: 20, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sunDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFC21A' },
  eyebrow: { fontFamily: F.semi, fontSize: 13.5 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontFamily: F.bold, fontSize: 12.5 },
  title: { fontFamily: F.displayBold, fontSize: 26, lineHeight: 30, letterSpacing: -0.6 },
  sub: { fontFamily: F.medium, fontSize: 14, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primary: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { fontFamily: F.bold, fontSize: 15.5 },
  secondary: {
    height: 50,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  secondaryText: { fontFamily: F.bold, fontSize: 15.5, color: '#FFFFFF' },
});
