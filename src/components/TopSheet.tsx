import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}

type KeyTarget = {
  addEventListener: (type: 'keydown', fn: (e: { key: string }) => void) => void;
  removeEventListener: (type: 'keydown', fn: (e: { key: string }) => void) => void;
};

/**
 * A sheet that drops down from the sky. Inputs sit at the top of the screen,
 * so the on-screen keyboard never covers what you're typing.
 * Close by tapping outside, dragging the handle up, or pressing Escape on the web.
 */
export function TopSheet({ visible, onClose, children, label }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const p = useSharedValue(0);
  const drag = useSharedValue(0);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      drag.value = 0;
      p.value = withSpring(1, { damping: 26, stiffness: 260, mass: 0.9 });
    } else {
      p.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      });
    }
  }, [visible, mounted, p, drag]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const target = globalThis as unknown as KeyTarget;
    const onKey = (e: { key: string }) => {
      if (e.key === 'Escape') onClose();
    };
    target.addEventListener('keydown', onKey);
    return () => target.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  // Android back button closes the sheet.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      drag.value = e.translationY < 0 ? e.translationY : e.translationY * 0.15;
    })
    .onEnd((e) => {
      if (e.translationY < -60 || e.velocityY < -700) scheduleOnRN(onClose);
      else drag.value = withSpring(0, { damping: 20, stiffness: 260 });
    });

  const backdrop = useAnimatedStyle(() => ({ opacity: p.value }));
  const sheet = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(p.value, [0, 1], [-height, 0]) + drag.value }],
  }));

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.backdrop }, backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { backgroundColor: t.card, paddingTop: insets.top + 8, maxHeight: height * 0.94 }, sheet]}
        accessibilityViewIsModal
        accessibilityLabel={label}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
        <GestureDetector gesture={pan}>
          <View style={styles.handleArea} accessibilityLabel="Drag up to close">
            <View style={[styles.handle, { backgroundColor: t.line }]} />
          </View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#0A0828',
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 24,
  },
  scroll: { flexGrow: 0 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 6, gap: 18 },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 12 },
  handle: { width: 44, height: 5, borderRadius: 3 },
});
