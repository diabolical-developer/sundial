import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { CONFETTI } from '../theme';

const COUNT = 46;

interface Piece {
  vx: number;
  vy: number;
  spin: number;
  flutter: number;
  w: number;
  h: number;
  color: string;
  round: boolean;
}

function Bit({ p, piece, gravity }: { p: SharedValue<number>; piece: Piece; gravity: number }) {
  const style = useAnimatedStyle(() => {
    const k = p.value;
    return {
      opacity: k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25,
      transform: [
        { translateX: piece.vx * k },
        { translateY: piece.vy * k + gravity * k * k },
        { rotate: `${piece.spin * k}deg` },
        { scaleY: Math.cos(k * piece.flutter) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: piece.w, height: piece.h, backgroundColor: piece.color, borderRadius: piece.round ? piece.w : 2 },
        style,
      ]}
    />
  );
}

/** One burst of confetti from the top of the screen when the whole day is done. */
export function Confetti({ trigger }: { trigger: number }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(0);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        vx: (Math.random() - 0.5) * width * 1.3,
        vy: -(height * 0.25 + Math.random() * height * 0.35),
        spin: (Math.random() - 0.5) * 900,
        flutter: 6 + Math.random() * 14,
        w: 7 + Math.random() * 5,
        h: 10 + Math.random() * 8,
        color: CONFETTI[i % CONFETTI.length],
        round: Math.random() < 0.3,
      })),
    // New pieces for every burst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trigger, width, height],
  );

  useEffect(() => {
    if (!trigger || reduceMotion) return;
    p.value = 0;
    p.value = withTiming(1, { duration: 2200, easing: Easing.linear });
  }, [trigger, reduceMotion, p]);

  if (!trigger || reduceMotion) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', left: width / 2, top: height * 0.42 }}>
        {pieces.map((piece, i) => (
          <Bit key={`${trigger}-${i}`} p={p} piece={piece} gravity={height * 1.25} />
        ))}
      </View>
    </View>
  );
}
