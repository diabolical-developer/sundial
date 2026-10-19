import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { haptic } from '../haptics';
import { useStore } from '../store';
import { F } from '../theme';
import { formatTime, toTime } from '../time';
import type { Task } from '../types';
import { Icon } from '../ui/Icon';
import { EASE_IN_OUT } from '../ui/motion';
import { PressableScale } from '../ui/PressableScale';

const LENGTHS = [15, 25, 45, 60];
const SOL = '#FFC21A';

interface Props {
  taskId: string | null;
  onClose: () => void;
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** A full-screen timer for one task. The light behind the ring breathes slowly while it runs. */
export function FocusMode({ taskId, onClose }: Props) {
  const { tasks, setDone, logFocus } = useStore();
  const live = taskId ? tasks.find((x) => x.id === taskId) : undefined;
  const last = useRef<Task | null>(null);
  if (live) last.current = live;
  const task = live ?? last.current;
  const visible = !!taskId && !!task;

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [length, setLength] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60_000);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const loggedMs = useRef(0); // focus time already credited to the task in this visit
  const running = endAt !== null;
  const total = length * 60_000;

  // Fresh timer each time focus opens.
  useEffect(() => {
    if (!taskId) return;
    setLength(25);
    setRemaining(25 * 60_000);
    setEndAt(null);
    setFinished(false);
    loggedMs.current = 0;
  }, [taskId]);

  const credit = useCallback(
    (elapsedMs: number) => {
      const id = last.current?.id;
      const minutes = Math.floor((elapsedMs - loggedMs.current) / 60_000);
      if (id && minutes > 0) {
        logFocus(id, minutes);
        loggedMs.current += minutes * 60_000;
      }
    },
    [logFocus],
  );

  useEffect(() => {
    if (endAt === null) return;
    const id = setInterval(() => {
      const r = endAt - Date.now();
      if (r <= 0) {
        setRemaining(0);
        setEndAt(null);
        setFinished(true);
        haptic.success();
        credit(total);
      } else setRemaining(r);
    }, 250);
    return () => clearInterval(id);
  }, [endAt, total, credit]);

  // Keep the screen on while the timer runs (where the platform allows it).
  useEffect(() => {
    if (!running) return;
    activateKeepAwakeAsync('focus').catch(() => {});
    return () => {
      Promise.resolve()
        .then(() => deactivateKeepAwake('focus'))
        .catch(() => {});
    };
  }, [running]);

  const breath = useSharedValue(1);
  useEffect(() => {
    if (running && !reduceMotion) {
      breath.value = withRepeat(
        withSequence(withTiming(1.14, { duration: 4000, easing: EASE_IN_OUT }), withTiming(1, { duration: 4000, easing: EASE_IN_OUT })),
        -1,
      );
    } else {
      cancelAnimation(breath);
      breath.value = withTiming(1, { duration: 600 });
    }
  }, [running, reduceMotion, breath]);
  const glow = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }], opacity: 0.7 + (breath.value - 1) * 2.1 }));

  // Android back button leaves focus (same as the close button).
  const closeRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current();
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  if (!task || !visible) return null;

  const start = () => {
    haptic.soft();
    if (finished) {
      setFinished(false);
      setRemaining(total);
      loggedMs.current = 0;
      setEndAt(Date.now() + total);
    } else setEndAt(Date.now() + remaining);
  };
  const pause = () => {
    haptic.tap();
    if (endAt) setRemaining(endAt - Date.now());
    setEndAt(null);
  };
  const reset = () => {
    haptic.tap();
    if (running || remaining < total) credit(total - (endAt ? endAt - Date.now() : remaining));
    setEndAt(null);
    setFinished(false);
    setRemaining(total);
    loggedMs.current = 0;
  };
  const close = () => {
    if (!finished) credit(total - (endAt ? endAt - Date.now() : remaining));
    setEndAt(null);
    onClose();
  };
  closeRef.current = close;
  const complete = () => {
    if (!finished) credit(total - (endAt ? endAt - Date.now() : remaining));
    setEndAt(null);
    setDone(task.id, true);
    haptic.success();
    onClose();
  };
  const pick = (m: number) => {
    haptic.tap();
    setLength(m);
    setRemaining(m * 60_000);
    setFinished(false);
    loggedMs.current = 0;
  };

  const size = Math.min(300, width - 72, height * 0.38);
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = finished ? 1 : 1 - remaining / total;
  const ends = endAt ? formatTime(toTime(new Date(endAt).getHours() * 60 + new Date(endAt).getMinutes())) : null;

  return (
    <Animated.View
      entering={FadeIn.duration(320)}
      exiting={FadeOut.duration(220)}
      style={[StyleSheet.absoluteFill, styles.root]}
      accessibilityViewIsModal
    >
      <LinearGradient colors={['#090726', '#191458', '#352682']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.kicker}>Focus</Text>
        <Pressable onPress={close} hitSlop={10} style={styles.iconBtn} accessibilityLabel="Leave focus">
          <Icon name="x" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={3}>
          {task.title}
        </Text>

        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', marginTop: 28 }}>
          <Animated.View pointerEvents="none" style={[styles.glowWrap, { width: size * 1.5, height: size * 1.5 }, styles.glowSoft, glow]}>
            {[1.5, 1.28, 1.1].map((k, i) => (
              <View
                key={k}
                style={{ position: 'absolute', width: size * k, height: size * k, borderRadius: size, backgroundColor: SOL, opacity: [0.06, 0.1, 0.16][i] }}
              />
            ))}
          </Animated.View>
          <View style={[styles.disc, { width: size - stroke * 2, height: size - stroke * 2, borderRadius: size }]} />
          <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
            {progress > 0.0005 && (
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={SOL}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${c} ${c}`}
                strokeDashoffset={c * (1 - progress)}
              />
            )}
          </Svg>
          <Text style={styles.clock} accessibilityRole="timer" accessibilityLabel={`${mmss(remaining)} remaining`}>
            {finished ? 'Done' : mmss(remaining)}
          </Text>
          <Text style={styles.under}>
            {finished ? `${length} minutes of focus` : running ? `Ends at ${ends}` : `${length} minute session`}
          </Text>
        </View>

        <View style={[styles.lengths, { opacity: running ? 0 : 1 }]} pointerEvents={running ? 'none' : 'auto'}>
          {LENGTHS.map((m) => {
            const active = m === length;
            return (
              <Pressable
                key={m}
                onPress={() => pick(m)}
                style={[styles.len, active && styles.lenActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${m} minutes`}
              >
                <Text style={[styles.lenText, active && { color: '#17143A' }]}>{m}m</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 28 }]}>
        {finished ? (
          <>
            <PressableScale onPress={start} style={styles.wideGhost} accessibilityRole="button">
              <Icon name="reset" size={18} color="#FFFFFF" />
              <Text style={styles.wideGhostText}>Go again</Text>
            </PressableScale>
            <PressableScale onPress={complete} style={styles.wideSol} accessibilityRole="button">
              <Icon name="check" size={20} color="#17143A" strokeWidth={2.6} />
              <Text style={styles.wideSolText}>Mark task done</Text>
            </PressableScale>
          </>
        ) : (
          <>
            <PressableScale onPress={reset} style={styles.round} accessibilityLabel="Reset timer" accessibilityRole="button">
              <Icon name="reset" size={22} color="#FFFFFF" />
            </PressableScale>
            <PressableScale
              onPress={running ? pause : start}
              style={styles.play}
              scaleTo={0.92}
              accessibilityLabel={running ? 'Pause' : 'Start'}
              accessibilityRole="button"
            >
              <Icon name={running ? 'pause' : 'play'} size={30} color="#17143A" />
            </PressableScale>
            <PressableScale onPress={complete} style={styles.round} accessibilityLabel="Mark task done" accessibilityRole="button">
              <Icon name="check" size={24} color="#FFFFFF" strokeWidth={2.6} />
            </PressableScale>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 50 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 },
  kicker: { fontFamily: F.semi, fontSize: 15, color: 'rgba(255,255,255,0.7)' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  title: { fontFamily: F.displayBold, fontSize: 28, lineHeight: 33, letterSpacing: -0.6, color: '#FFFFFF', textAlign: 'center', maxWidth: 480 },
  glowWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  glowSoft: (Platform.OS === 'web' ? { filter: 'blur(28px)' } : {}) as object,
  disc: { position: 'absolute', backgroundColor: '#120E43' },
  clock: { fontFamily: F.display, fontSize: 64, letterSpacing: -2, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  under: { fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  lengths: { flexDirection: 'row', gap: 8, marginTop: 30 },
  len: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)' },
  lenActive: { backgroundColor: SOL },
  lenText: { fontFamily: F.bold, fontSize: 14, color: '#FFFFFF' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 22 },
  round: { width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  play: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: SOL,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SOL,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  wideGhost: { flex: 1, height: 56, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  wideGhostText: { fontFamily: F.bold, fontSize: 16, color: '#FFFFFF' },
  wideSol: { flex: 1.4, height: 56, borderRadius: 18, backgroundColor: SOL, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  wideSolText: { fontFamily: F.bold, fontSize: 16, color: '#17143A' },
});
