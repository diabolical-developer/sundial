import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '../store';
import { F } from '../theme';
import { Icon } from '../ui/Icon';

/** Short confirmation above the add button, with Undo when the action can be reversed. */
export function Toast() {
  const { toast, dismissToast } = useStore();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 96 }]}>
      {toast && (
      <Animated.View
        key={toast.id}
        entering={FadeInDown.springify().damping(18)}
        exiting={FadeOutDown.duration(180)}
        style={styles.toast}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <Text style={styles.text}>{toast.message}</Text>
        {toast.undo && (
          <Pressable
            onPress={() => {
              toast.undo?.();
              dismissToast();
            }}
            hitSlop={10}
            style={styles.undo}
            accessibilityRole="button"
          >
            <Icon name="undo" size={16} color="#FFD65A" strokeWidth={2.4} />
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        )}
      </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 20 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    maxWidth: 520,
    backgroundColor: '#17143A',
    borderRadius: 18,
    paddingLeft: 18,
    paddingRight: 14,
    paddingVertical: 13,
    shadowColor: '#0A0828',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  text: { fontFamily: F.semi, fontSize: 14.5, color: '#FFFFFF', flexShrink: 1 },
  undo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  undoText: { fontFamily: F.bold, fontSize: 14.5, color: '#FFD65A' },
});
