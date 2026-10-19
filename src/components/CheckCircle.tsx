import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
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

/** Round checkbox: the fill blooms from the centre and the tick springs in. */
export function CheckCircle({ checked, ring, fill, onPress, label, size = 26 }: Props) {
  const v = useSharedValue(checked ? 1 : 0);
  const pop = useSharedValue(1);

  useEffect(() => {
    v.value = withTiming(checked ? 1 : 0, { duration: checked ? 280 : 180, easing: EASE_OUT });
    if (checked) pop.value = withSequence(withTiming(0.8, { duration: 90 }), withSpring(1, SPRING_POP));
  }, [checked, v, pop]);

  const outer = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const bloom = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.2 + 0.8 * v.value }] }));
  const tick = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scale: 0.4 + 0.6 * v.value }, { rotate: `${-35 + 35 * v.value}deg` }],
  }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <Animated.View style={[{ width: size, height: size }, outer]}>
        <View style={[styles.ring, { borderRadius: size / 2, borderColor: ring }]} />
        <Animated.View style={[styles.fill, { borderRadius: size / 2, backgroundColor: fill }, bloom]} />
        <Animated.View style={[styles.center, tick]}>
          <Icon name="check" size={size * 0.62} color="#FFFFFF" strokeWidth={3} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: { ...StyleSheet.absoluteFill, borderWidth: 2 },
  fill: { ...StyleSheet.absoluteFill },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
