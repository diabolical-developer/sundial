import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';

import { F, type Phase, SKY } from '../theme';
import { DAY_END, DAY_START, dayProgress, formatTime, minutesOf, nowMinutes, toTime } from '../time';
import type { Task } from '../types';
import { EASE_IN_OUT } from '../ui/motion';
import { useUI } from '../ui/UIContext';

const H = 112; // height of the arc box
const PAD = 12;
const SUN = 54;

export interface Marker {
  task: Task;
  state: 'open' | 'done' | 'late';
}

interface Props {
  phase: Phase;
  now: Date;
  markers: Marker[];
  leaf: string;
  ember: string;
}

/**
 * The sun's path across your planning day (6 am → 10 pm).
 * The sun sits at the current time; today's timed tasks sit on the path where they're due.
 */
export function SunArc({ phase, now, markers, leaf, ember }: Props) {
  const ui = useUI();
  const reduceMotion = useReducedMotion();
  const sky = SKY[phase];
  const [w, setW] = useState(0);
  const nowMin = nowMinutes(now);
  const night = nowMin < DAY_START || nowMin >= DAY_END;
  const tNow = dayProgress(nowMin);

  const width = useSharedValue(0);
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
  const clipStyle = useAnimatedStyle(() => {
    const r = (width.value - PAD * 2) / 2;
    return { width: width.value / 2 + r * Math.cos(Math.PI * (1 - t.value)) };
  });

  const fullArc = w ? `M ${PAD} ${baseY} A ${rx} ${ry} 0 0 1 ${w - PAD} ${baseY}` : '';
  const nowLabel = night ? (nowMin >= DAY_END ? 'Day done' : 'Before sunrise') : formatTime(toTime(nowMin));

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        const lw = e.nativeEvent.layout.width;
        width.value = lw;
        setW(lw);
      }}
      accessible
      accessibilityLabel={`Sun path. It is ${formatTime(toTime(nowMin))}. ${markers.length} timed tasks today.`}
    >
      {w > 0 && (
        <>
          {/* Whole path: dashed. Time already passed: solid, revealed as the sun travels. */}
          <Svg width={w} height={H} style={StyleSheet.absoluteFill}>
            <Path d={fullArc} stroke={sky.arc} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="3 6" fill="none" />
            <Line x1={0} y1={baseY} x2={w} y2={baseY} stroke={sky.arc} strokeOpacity={0.35} strokeWidth={1} />
          </Svg>
          <Animated.View style={[styles.clip, clipStyle]}>
            <Svg width={w} height={H}>
              <Path d={fullArc} stroke={sky.arc} strokeOpacity={0.9} strokeWidth={2.5} strokeLinecap="round" fill="none" />
            </Svg>
          </Animated.View>

          {markers.map((m, i) => {
            const p = point(dayProgress(minutesOf(m.task.time!)));
            const fill = m.state === 'done' ? leaf : m.state === 'late' ? ember : '#FFFFFF';
            return (
              <Animated.View
                key={m.task.id}
                entering={reduceMotion ? undefined : ZoomIn.delay(500 + i * 70).springify().damping(12)}
                style={[styles.markerHit, { left: p.x - 14, top: p.y - 14 }]}
              >
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
                      { backgroundColor: fill, borderColor: m.state === 'open' ? sky.arc : '#FFFFFF' },
                    ]}
                  />
                </Pressable>
              </Animated.View>
            );
          })}

          <Animated.View pointerEvents="none" style={[styles.sun, sunStyle]}>
            {night ? (
              <View style={styles.moon}>
                <View style={[styles.moonShade, { backgroundColor: sky.colors[2] }]} />
              </View>
            ) : (
              <>
                <View style={[styles.glow, { width: SUN, height: SUN, borderRadius: SUN / 2, opacity: 0.28 }]} />
                <View style={[styles.glow, { width: 36, height: 36, borderRadius: 18, opacity: 0.5 }]} />
                <View style={styles.core} />
              </>
            )}
            <View style={styles.nowWrap}>
              <View style={styles.nowPill}>
                <Text style={styles.nowText} numberOfLines={1}>
                  {nowLabel}
                </Text>
              </View>
            </View>
          </Animated.View>
        </>
      )}
      <View style={styles.labels}>
        <Text style={[styles.label, { color: sky.arc }]}>6 am</Text>
        <Text style={[styles.label, { color: sky.arc }]}>10 pm</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: H + 22, marginTop: 24 },
  clip: { position: 'absolute', left: 0, top: 0, height: H, overflow: 'hidden' },
  markerHit: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  marker: { width: 13, height: 13, borderRadius: 7, borderWidth: 2 },
  sun: { position: 'absolute', left: 0, top: 0, width: SUN, height: SUN, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', backgroundColor: '#FFD65A' },
  core: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFD34D', borderWidth: 2, borderColor: '#FFF4C8' },
  moon: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F2F0FF', overflow: 'hidden' },
  moonShade: { position: 'absolute', width: 20, height: 20, borderRadius: 10, left: 7, top: -4 },
  nowWrap: { position: 'absolute', top: -12, left: -50, right: -50, alignItems: 'center' },
  nowPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  nowText: { fontFamily: F.semi, fontSize: 11, color: '#17143A', fontVariant: ['tabular-nums'] },
  labels: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  label: { fontFamily: F.semi, fontSize: 11.5, opacity: 0.85 },
});
