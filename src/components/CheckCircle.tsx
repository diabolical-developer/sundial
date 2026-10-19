import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Icon } from '../ui/Icon';
import { EASE_OUT, SPRING_POP } from '../ui/motion';

interface Props {
  checked: boolean;
  ring: string;
  fill: string;
  onPress: () => void;
  label: string;
  size?: number;
}

const SPARKS = 8;

function Spark({ burst, i, size, color }: { burst: SharedValue<number>; i: number; size: number; color: string }) {
  const angle = (i / SPARKS) * Math.PI * 2 - Math.PI / 2;
  const style = useAnimatedStyle(() => {
    const k = burst.value;
    const d = size * (0.55 + 0.6 * k);
    return {
      opacity: k === 0 || k === 1 ? 0 : 1 - k,
      transform: [{ translateX: Math.cos(angle) * d }, { translateY: Math.sin(angle) * d }, { scale: 1 - k * 0.7 }],
    };
  });
  const dot = i % 2 ? 4 : 5;
  return <Animated.View style={[styles.spark, { width: dot, height: dot, borderRadius: dot, backgroundColor: color }, style]} />;
}

/** Round checkbox: the fill blooms from the centre, the tick springs in, and a ring of sparks flies out. */
export function CheckCircle({ checked, ring, fill, onPress, label, size = 26 }: Props) {
  const reduceMotion = useReducedMotion();
  const v = useSharedValue(checked ? 1 : 0);
  const pop = useSharedValue(1);
  const burst = useSharedValue(0);
  const mounted = useRef(false);

  useEffect(() => {
    v.value = withTiming(checked ? 1 : 0, { duration: checked ? 280 : 180, easing: EASE_OUT });
    if (checked && mounted.current) {
      pop.value = withSequence(withTiming(0.78, { duration: 90 }), withSpring(1, SPRING_POP));
      if (!reduceMotion) {
        burst.value = 0;
        burst.value = withTiming(1, { duration: 560, easing: EASE_OUT });
      }
    }
    mounted.current = true;
  }, [checked, v, pop, burst, reduceMotion]);

  const outer = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const bloom = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.2 + 0.8 * v.value }] }));
  const tick = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scale: 0.4 + 0.6 * v.value }, { rotate: `${-35 + 35 * v.value}deg` }],
  }));
  const shock = useAnimatedStyle(() => ({
    opacity: burst.value === 0 || burst.value === 1 ? 0 : 0.55 * (1 - burst.value),
    transform: [{ scale: 1 + burst.value * 0.9 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View style={{ width: size, height: size }}>
        <View pointerEvents="none" style={styles.center}>
          <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: fill }, shock]} />
          {Array.from({ length: SPARKS }, (_, i) => (
            <Spark key={i} burst={burst} i={i} size={size} color={i % 2 ? '#FFC21A' : fill} />
          ))}
        </View>
        <Animated.View style={[{ width: size, height: size }, outer]}>
          <View style={[styles.ring, { borderRadius: size / 2, borderColor: ring }]} />
          <Animated.View style={[styles.fill, { borderRadius: size / 2, backgroundColor: fill }, bloom]} />
          <Animated.View style={[styles.center, tick]}>
            <Icon name="check" size={size * 0.62} color="#FFFFFF" strokeWidth={3} />
          </Animated.View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: { ...StyleSheet.absoluteFill, borderWidth: 2 },
  fill: { ...StyleSheet.absoluteFill },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute' },
});
