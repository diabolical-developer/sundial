import { memo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type NativeSyntheticEvent, type TextLayoutEventData } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  FadeInDown,
  FadeOut,
  interpolate,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptic } from '../haptics';
import { useStore } from '../store';
import { F, priorityRing, useTheme } from '../theme';
import { dayLabel, duration, formatTime, taskMinutes } from '../time';
import type { Task } from '../types';
import { Icon } from '../ui/Icon';
import { EASE_OUT, SPRING } from '../ui/motion';
import { useUI } from '../ui/UIContext';
import { CheckCircle } from './CheckCircle';

const THRESHOLD = 84;

interface Props {
  task: Task;
  today: string;
  /** Minutes since midnight, for marking late tasks. */
  nowMin: number;
  showDate?: boolean;
  last?: boolean;
  /** Position in its section, for a staggered entrance. */
  index?: number;
}

function TaskRowBase({ task, today, nowMin, showDate, last, index = 0 }: Props) {
  const t = useTheme();
  const { setDone, deleteTask } = useStore();
  const ui = useUI();
  const [ticking, setTicking] = useState(false);
  const [lineWidth, setLineWidth] = useState(0);

  const checked = task.done || ticking;
  const late =
    !task.done &&
    task.date !== null &&
    (task.date < today || (task.date === today && task.time !== null && taskMinutes(task.time) < nowMin - 1));

  // --- tap the circle: tick, strike through, then hand over to the store
  const strike = useSharedValue(task.done ? 1 : 0);
  const onCheck = () => {
    if (task.done) {
      haptic.tap();
      strike.value = withTiming(0, { duration: 160 });
      setDone(task.id, false);
      return;
    }
    if (ticking) return;
    setTicking(true);
    haptic.soft();
    strike.value = withTiming(1, { duration: 340, easing: EASE_OUT });
    setTimeout(() => setDone(task.id, true), 520);
  };
  const strikeStyle = useAnimatedStyle(() => ({ width: strike.value * lineWidth, opacity: strike.value > 0 ? 1 : 0 }));
  const onTitleLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const w = e.nativeEvent.lines[0]?.width;
    if (w) setLineWidth(w);
  };

  // --- swipe: right finishes (or reopens), left deletes
  const x = useSharedValue(0);
  const width = useSharedValue(360);
  const armed = useSharedValue(0);
  const tick = haptic.tap;
  const complete = () => (task.done ? setDone(task.id, false) : setDone(task.id, true, { toast: true }));
  const remove = () => deleteTask(task.id);
  // A swipe that ends over the row must not also count as a tap (matters with a mouse on the web).
  const swipedAt = useRef(0);
  const markSwipe = () => {
    swipedAt.current = Date.now();
  };
  const open = () => {
    if (Date.now() - swipedAt.current < 500) return;
    ui.openTask(task.id);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onStart(() => {
      scheduleOnRN(markSwipe);
    })
    .onUpdate((e) => {
      x.value = e.translationX;
      const a = e.translationX > THRESHOLD ? 1 : e.translationX < -THRESHOLD ? -1 : 0;
      if (a !== armed.value) {
        armed.value = a;
        if (a !== 0) scheduleOnRN(tick);
      }
    })
    .onEnd(() => {
      scheduleOnRN(markSwipe);
      const a = armed.value;
      armed.value = 0;
      if (a === 0) {
        x.value = withSpring(0, SPRING);
        return;
      }
      x.value = withTiming(a * width.value, { duration: 200, easing: EASE_OUT }, (finished) => {
        if (!finished) return;
        if (a === 1) scheduleOnRN(complete);
        else scheduleOnRN(remove);
        // If the row is still on screen (e.g. the action was undone), bring it back.
        x.value = withDelay(600, withTiming(0, { duration: 0 }));
      });
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const leftReveal = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, 30], [0, 1], Extrapolation.CLAMP) }));
  const rightReveal = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-30, 0], [1, 0], Extrapolation.CLAMP) }));
  const leftIcon = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(x.value, [0, THRESHOLD, THRESHOLD + 20], [0.5, 1, 1.15], Extrapolation.CLAMP) }],
  }));
  const rightIcon = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(x.value, [-THRESHOLD - 20, -THRESHOLD, 0], [1.15, 1, 0.5], Extrapolation.CLAMP) }],
  }));

  const timeColor = task.done ? t.faint : late ? t.ember : t.ink;
  const meta: { key: string; node: ReactNode }[] = [];
  if (showDate && task.date) {
    meta.push({
      key: 'date',
      node: <Text style={[styles.meta, { color: late ? t.ember : t.muted }]}>{dayLabel(task.date, today)}</Text>,
    });
  }
  if (task.repeat) meta.push({ key: 'repeat', node: <Icon name="repeat" size={13} color={t.iris} /> });
  if (task.reminder && !task.done) meta.push({ key: 'bell', node: <Icon name="bell" size={13} color={t.muted} /> });
  if (task.notes) meta.push({ key: 'note', node: <Icon name="note" size={13} color={t.muted} /> });
  if (task.focusMinutes > 0) {
    meta.push({
      key: 'focus',
      node: <Text style={[styles.meta, { color: t.muted }]}>{duration(task.focusMinutes)} focused</Text>,
    });
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 45)
        .springify()
        .damping(20)
        .stiffness(180)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.springify().damping(22).stiffness(200)}
      onLayout={(e) => {
        width.value = e.nativeEvent.layout.width;
      }}
    >
      <View style={styles.clip}>
        <Animated.View style={[styles.reveal, styles.revealLeft, { backgroundColor: task.done ? t.iris : t.leaf }, leftReveal]}>
          <Animated.View style={leftIcon}>
            <Icon name={task.done ? 'undo' : 'check'} size={22} color="#FFFFFF" strokeWidth={2.6} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.reveal, styles.revealRight, { backgroundColor: t.ember }, rightReveal]}>
          <Animated.View style={rightIcon}>
            <Icon name="trash" size={21} color="#FFFFFF" strokeWidth={2.2} />
          </Animated.View>
        </Animated.View>

        <GestureDetector gesture={pan} touchAction="pan-y" userSelect="none">
          <Animated.View style={[styles.row, { backgroundColor: t.card }, rowStyle]}>
            <CheckCircle
              checked={checked}
              ring={priorityRing(t, task.priority)}
              fill={t.leaf}
              onPress={onCheck}
              label={`${task.done ? 'Mark not done' : 'Mark done'}: ${task.title}`}
            />
            <Pressable
              style={styles.body}
              onPress={open}
              accessibilityRole="button"
              accessibilityHint="Opens task details"
            >
              <View>
                <Text
                  onTextLayout={onTitleLayout}
                  style={[
                    styles.title,
                    { color: checked ? t.muted : t.ink },
                    task.done && { textDecorationLine: 'line-through' },
                  ]}
                >
                  {task.title}
                </Text>
                {!task.done && <Animated.View style={[styles.strike, { backgroundColor: t.muted }, strikeStyle]} />}
              </View>
              {meta.length > 0 && (
                <View style={styles.metaRow}>
                  {meta.map((m) => (
                    <View key={m.key}>{m.node}</View>
                  ))}
                </View>
              )}
            </Pressable>
            {task.time && (
              <Pressable onPress={open} hitSlop={6} accessibilityElementsHidden>
                <Text style={[styles.time, { color: timeColor }]}>{formatTime(task.time)}</Text>
                {late && <Text style={[styles.lateTag, { color: t.ember }]}>late</Text>}
              </Pressable>
            )}
          </Animated.View>
        </GestureDetector>
      </View>
      {!last && <View style={[styles.sep, { backgroundColor: t.line }]} />}
    </Animated.View>
  );
}

export const TaskRow = memo(TaskRowBase);

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  reveal: { ...StyleSheet.absoluteFill, justifyContent: 'center', paddingHorizontal: 26 },
  revealLeft: { alignItems: 'flex-start' },
  revealRight: { alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 62 },
  body: { flex: 1, gap: 4, justifyContent: 'center' },
  title: { fontFamily: F.medium, fontSize: 16, lineHeight: 22 },
  strike: { position: 'absolute', left: 0, top: 11, height: 1.6, borderRadius: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { fontFamily: F.medium, fontSize: 12.5 },
  time: { fontFamily: F.displaySemi, fontSize: 15, textAlign: 'right', fontVariant: ['tabular-nums'] },
  lateTag: { fontFamily: F.semi, fontSize: 11, textAlign: 'right', marginTop: 1 },
  sep: { height: StyleSheet.hairlineWidth * 1.5, marginLeft: 56 },
});
