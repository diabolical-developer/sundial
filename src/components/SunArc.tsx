import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { F, type Phase, SKY } from '../theme';
import { dayProgress, formatTime, isNight, nightProgress, nowMinutes, taskMinutes, toTime } from '../time';
import type { Task } from '../types';
import { Icon } from '../ui/Icon';
import { EASE_IN_OUT, loop } from '../ui/motion';
import { useUI } from '../ui/UIContext';

const H = 112; // height of the arc box
const PAD = 12;
const SUN = 84;
const DAY_TICKS = [9, 12, 15, 18, 21].map((h) => dayProgress(h * 60));
const NIGHT_TICKS = [24, 26, 28].map((h) => nightProgress(h * 60));

export interface Marker {
  task: Task;
  state: 'open' | 'done' | 'late';
  /** The task shown in "Up next". */
  next?: boolean;
}

interface Props {
  phase: Phase;
  now: Date;
  markers: Marker[];
  leaf: string;
  ember: string;
}

/**
 * A sun as a camera sees it: a white-hot disc, a wide bloom tinted by the time of day (warmer when
 * it's low), soft light streaks that turn slowly, and a faint horizontal flare.
 * Drawn on an 84-unit grid and scaled to `size`.
 */
export function Sun({ reduceMotion, size = SUN, glow = '#FFD98A' }: { reduceMotion: boolean; size?: number; glow?: string }) {
  const c = SUN / 2;
  const box = { width: size, height: size, viewBox: `0 0 ${SUN} ${SUN}` };
  return (
    <>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          loop(
            reduceMotion,
            { from: { transform: [{ scale: 0.92 }], opacity: 0.85 }, to: { transform: [{ scale: 1.06 }], opacity: 1 } },
            3200,
            { alternate: true },
          ),
        ]}
      >
        <Svg {...box}>
          <Defs>
            <RadialGradient id={`bloom-${glow}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="0.12" stopColor="#FFF7E2" stopOpacity={0.95} />
              <Stop offset="0.24" stopColor={glow} stopOpacity={0.55} />
              <Stop offset="0.5" stopColor={glow} stopOpacity={0.16} />
              <Stop offset="1" stopColor={glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={c} cy={c} r={c} fill={`url(#bloom-${glow})`} />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          loop(reduceMotion, { from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } }, 90000, {
            linear: true,
          }),
        ]}
      >
        <Svg {...box}>
          <Defs>
            <RadialGradient id="streak" cx="50%" cy="50%" r="50%">
              <Stop offset="0.1" stopColor="#FFFFFF" stopOpacity={0.55} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {/* Thin tapering streaks of light, of uneven lengths. */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i / 8) * Math.PI * 2 + 0.2;
            const len = i % 2 ? c * 0.7 : c * 0.95;
            const w = 1.4;
            const ex = c + Math.cos(a) * len;
            const ey = c + Math.sin(a) * len;
            const nx = -Math.sin(a) * w;
            const ny = Math.cos(a) * w;
            return <Path key={i} d={`M${c + nx} ${c + ny} L${ex} ${ey} L${c - nx} ${c - ny} Z`} fill="url(#streak)" />;
          })}
        </Svg>
      </Animated.View>
      <Svg {...box} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="flare" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="disc" cx="46%" cy="44%" r="55%">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.6" stopColor="#FFF9E6" />
            <Stop offset="1" stopColor="#FFE6A3" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={c} cy={c} rx={c * 0.95} ry={1.6} fill="url(#flare)" />
        <Circle cx={c} cy={c} r={9.5} fill="url(#disc)" />
      </Svg>
    </>
  );
}

/** The moon: limb-darkened, with soft dark seas and a few craters, inside a cool halo. */
export function Moon({ reduceMotion }: { reduceMotion: boolean }) {
  const c = SUN / 2;
  const box = { width: SUN, height: SUN, viewBox: `0 0 ${SUN} ${SUN}` };
  const r = 10.5;
  return (
    <>
      <Animated.View
        style={[StyleSheet.absoluteFill, loop(reduceMotion, { from: { opacity: 0.6 }, to: { opacity: 1 } }, 4200, { alternate: true })]}
      >
        <Svg {...box}>
          <Defs>
            <RadialGradient id="moonHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0.2" stopColor="#DDE2FF" stopOpacity={0.5} />
              <Stop offset="0.45" stopColor="#AEB6F5" stopOpacity={0.16} />
              <Stop offset="1" stopColor="#AEB6F5" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={c} cy={c} r={c} fill="url(#moonHalo)" />
        </Svg>
      </Animated.View>
      <Svg {...box} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="moonFace" cx="44%" cy="42%" r="62%">
            <Stop offset="0" stopColor="#FBFAF4" />
            <Stop offset="0.7" stopColor="#E9E7DD" />
            <Stop offset="1" stopColor="#C4C2BA" />
          </RadialGradient>
          <RadialGradient id="mare" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#8E8C88" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#8E8C88" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="moonShadow" cx="78%" cy="80%" r="70%">
            <Stop offset="0" stopColor="#141A44" stopOpacity={0.28} />
            <Stop offset="1" stopColor="#141A44" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={r} fill="url(#moonFace)" />
        <Ellipse cx={c - 3} cy={c - 2.5} rx={4.2} ry={3.4} fill="url(#mare)" />
        <Ellipse cx={c + 3.4} cy={c - 3.6} rx={2.8} ry={2.2} fill="url(#mare)" />
        <Ellipse cx={c + 1.5} cy={c + 2.4} rx={3.6} ry={2.6} fill="url(#mare)" />
        <Circle cx={c - 4.2} cy={c + 4.6} r={1.1} fill="none" stroke="#B5B2AA" strokeWidth={0.5} strokeOpacity={0.8} />
        <Circle cx={c + 5.6} cy={c + 1.2} r={0.8} fill="none" stroke="#B5B2AA" strokeWidth={0.45} strokeOpacity={0.7} />
        <Circle cx={c} cy={c} r={r} fill="url(#moonShadow)" />
      </Svg>
    </>
  );
}

/**
 * The sun's path across your planning day (6 am → 10 pm), or after dark the moon's (10 pm → 6 am).
 * The sun or moon sits at the current time; today's timed tasks sit on the path where they're due.
 * By day, a small moon tag counts what's still planned for after 10 pm.
 */
export function SunArc({ phase, now, markers, leaf, ember }: Props) {
  const ui = useUI();
  const reduceMotion = useReducedMotion();
  const sky = SKY[phase];
  const [w, setW] = useState(0);
  const nowMin = nowMinutes(now);
  const night = isNight(nowMin);
  const along = night ? nightProgress : dayProgress;
  const tNow = along(nowMin);
  const onPath = markers.filter((m) => isNight(taskMinutes(m.task.time!)) === night);
  const tonight = night ? [] : markers.filter((m) => m.state !== 'done' && isNight(taskMinutes(m.task.time!)));

  const width = useSharedValue(0);
  const pillW = useSharedValue(0);
  const t = useSharedValue(0);
  const firstRun = useRef(true);

  useEffect(() => {
    if (w === 0) return;
    if (firstRun.current) {
      firstRun.current = false;
      // The one choreographed moment: the sun travels from sunrise to now.
      t.value = reduceMotion ? tNow : withTiming(tNow, { duration: 1800, easing: EASE_IN_OUT });
    } else {
      t.value = withTiming(tNow, { duration: 900 });
    }
  }, [tNow, w, t, reduceMotion]);

  const baseY = H - 6;
  const rx = Math.max(0, (w - PAD * 2) / 2);
  const ry = H - 30;
  const cx = w / 2;
  const point = (p: number) => {
    const th = Math.PI * (1 - p);
    return { x: cx + rx * Math.cos(th), y: baseY - ry * Math.sin(th) };
  };

  const sunStyle = useAnimatedStyle(() => {
    const r = (width.value - PAD * 2) / 2;
    const th = Math.PI * (1 - t.value);
    const x = width.value / 2 + r * Math.cos(th);
    const y = baseY - ry * Math.sin(th);
    return { transform: [{ translateX: x - SUN / 2 }, { translateY: y - SUN / 2 }] };
  });
  // The time label rides above the sun but never leaves the screen.
  const pillStyle = useAnimatedStyle(() => {
    const r = (width.value - PAD * 2) / 2;
    const th = Math.PI * (1 - t.value);
    const x = width.value / 2 + r * Math.cos(th);
    const y = baseY - ry * Math.sin(th);
    const left = Math.min(Math.max(x - pillW.value / 2, -4), width.value - pillW.value + 4);
    return { opacity: pillW.value ? 1 : 0, transform: [{ translateX: left }, { translateY: y - 36 }] };
  });
  const clipStyle = useAnimatedStyle(() => {
    const r = (width.value - PAD * 2) / 2;
    return { width: width.value / 2 + r * Math.cos(Math.PI * (1 - t.value)) };
  });

  const fullArc = w ? `M ${PAD} ${baseY} A ${rx} ${ry} 0 0 1 ${w - PAD} ${baseY}` : '';
  const nowLabel = formatTime(toTime(nowMin));
  const trail = phase === 'night' ? '#E4E5FF' : '#FFFFFF';

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        const lw = e.nativeEvent.layout.width;
        width.value = lw;
        setW(lw);
      }}
      accessible
      accessibilityLabel={`${night ? 'Moon' : 'Sun'} path. It is ${formatTime(toTime(nowMin))}. ${onPath.length} timed tasks on it.`}
    >
      {w > 0 && (
        <>
          {/* Whole path: dashed, with a dot every three hours. Time already passed: solid, revealed as the sun travels. */}
          <Svg width={w} height={H} style={StyleSheet.absoluteFill}>
            <Path
              d={fullArc}
              stroke={sky.arc}
              strokeOpacity={0.5}
              strokeWidth={1.5}
              strokeDasharray="2 6"
              strokeLinecap="round"
              fill="none"
            />
            {(night ? NIGHT_TICKS : DAY_TICKS).map((p) => {
              const q = point(p);
              return <Circle key={p} cx={q.x} cy={q.y} r={2} fill={sky.arc} fillOpacity={0.55} />;
            })}
          </Svg>
          <Animated.View style={[styles.clip, clipStyle]}>
            <Svg width={w} height={H}>
              <Path d={fullArc} stroke={trail} strokeOpacity={0.22} strokeWidth={7} strokeLinecap="round" fill="none" />
              <Path d={fullArc} stroke={trail} strokeOpacity={0.95} strokeWidth={2.5} strokeLinecap="round" fill="none" />
            </Svg>
          </Animated.View>

          {onPath.map((m, i) => {
            const p = point(along(taskMinutes(m.task.time!)));
            const fill = m.state === 'done' ? leaf : m.state === 'late' ? ember : '#FFFFFF';
            return (
              <Animated.View
                key={m.task.id}
                entering={reduceMotion ? undefined : ZoomIn.delay(600 + i * 80).springify().damping(12)}
                style={[styles.markerHit, { left: p.x - 16, top: p.y - 16 }]}
              >
                {m.next && m.state !== 'done' && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.halo,
                      { borderColor: m.state === 'late' ? ember : '#FFFFFF' },
                      loop(
                        reduceMotion,
                        { from: { transform: [{ scale: 0.6 }], opacity: 0.9 }, to: { transform: [{ scale: 1.9 }], opacity: 0 } },
                        1800,
                        { linear: true },
                      ),
                    ]}
                  />
                )}
                <Pressable
                  onPress={() => ui.openTask(m.task.id)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.task.title}, ${formatTime(m.task.time!)}${m.state === 'done' ? ', done' : m.state === 'late' ? ', late' : ''}`}
                  style={styles.markerHit}
                >
                  <View
                    style={[
                      styles.marker,
                      m.state === 'done' && styles.markerDone,
                      { backgroundColor: fill, borderColor: m.state === 'open' ? sky.arc : '#FFFFFF' },
                    ]}
                  >
                    {m.state === 'done' && <Icon name="check" size={10} color="#FFFFFF" strokeWidth={3.4} />}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}

          <Animated.View pointerEvents="none" style={[styles.sun, sunStyle]}>
            {night ? <Moon reduceMotion={reduceMotion} /> : <Sun reduceMotion={reduceMotion} glow={sky.sunGlow} />}
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]} onLayout={(e) => (pillW.value = e.nativeEvent.layout.width)}>
            <Text style={styles.nowText} numberOfLines={1}>
              {nowLabel}
            </Text>
          </Animated.View>
        </>
      )}
      {tonight.length > 0 && (
        <Pressable
          onPress={() => ui.openTask(tonight[0].task.id)}
          style={styles.tonight}
          accessibilityRole="button"
          accessibilityLabel={`${tonight.length} ${tonight.length === 1 ? 'task' : 'tasks'} after 10 pm`}
        >
          <Icon name="moon" size={11} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={styles.tonightText}>+{tonight.length}</Text>
        </Pressable>
      )}
      <View style={styles.labels} pointerEvents="none">
        <Text style={[styles.label, { color: sky.onHills }]}>{night ? '10 pm' : '6 am'}</Text>
        <Text style={[styles.label, { color: sky.onHills }]}>{night ? '6 am' : '10 pm'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: H + 22, marginTop: 22 },
  clip: { position: 'absolute', left: 0, top: 0, height: H, overflow: 'hidden' },
  markerHit: { position: 'absolute', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  marker: { width: 13, height: 13, borderRadius: 7, borderWidth: 2 },
  markerDone: { width: 17, height: 17, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sun: { position: 'absolute', left: 0, top: 0, width: SUN, height: SUN },
  pill: {
    position: 'absolute',
    left: 0,
    top: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#0A0828',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  nowText: { fontFamily: F.bold, fontSize: 11, color: '#17143A', fontVariant: ['tabular-nums'] },
  tonight: {
    position: 'absolute',
    right: -6,
    top: H - 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(23,20,58,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  tonightText: { fontFamily: F.bold, fontSize: 11, color: '#FFFFFF' },
  labels: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  label: {
    fontFamily: F.bold,
    fontSize: 11.5,
    textShadowColor: 'rgba(10, 8, 40, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
