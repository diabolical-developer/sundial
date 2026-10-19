import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { F, useTheme } from '../theme';
import { Icon } from '../ui/Icon';
import { loop } from '../ui/motion';
import { PressableScale } from '../ui/PressableScale';

/** The always-there way to capture a task. Every so often a band of light passes across it. */
export function AddButton({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(450).springify().damping(14).stiffness(160)}
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + 20 }]}
    >
      <PressableScale
        onPress={onPress}
        scaleTo={0.94}
        style={[styles.button, { backgroundColor: t.sol, shadowColor: t.isDark ? '#000' : '#B88500' }]}
        accessibilityRole="button"
        accessibilityLabel="Add a task"
      >
        <View style={styles.face}>
          <LinearGradient
            colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.6 }}
            style={StyleSheet.absoluteFill}
          />
          {!reduceMotion && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sheen,
                loop(
                  false,
                  {
                    '0%': { transform: [{ translateX: -80 }, { skewX: '-20deg' }] },
                    '22%': { transform: [{ translateX: 260 }, { skewX: '-20deg' }] },
                    '100%': { transform: [{ translateX: 260 }, { skewX: '-20deg' }] },
                  },
                  6500,
                  { delayMs: 1600 },
                ),
              ]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}
        </View>
        <View style={[styles.plus, { backgroundColor: t.solInk }]}>
          <Icon name="plus" size={18} color={t.sol} strokeWidth={3} />
        </View>
        <Text style={[styles.text, { color: t.solInk }]}>Add a task</Text>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 58,
    paddingLeft: 10,
    paddingRight: 24,
    borderRadius: 29,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  face: { ...StyleSheet.absoluteFill, borderRadius: 29, overflow: 'hidden' },
  sheen: { position: 'absolute', top: -10, bottom: -10, width: 46 },
  plus: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: F.bold, fontSize: 16.5 },
});
