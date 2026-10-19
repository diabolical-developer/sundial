import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { F, useTheme } from '../theme';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';

/** The always-there way to capture a task. */
export function AddButton({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 20 }]}>
      <PressableScale
        onPress={onPress}
        scaleTo={0.94}
        style={[styles.button, { backgroundColor: t.sol, shadowColor: t.isDark ? '#000' : '#B88500' }]}
        accessibilityRole="button"
        accessibilityLabel="Add a task"
      >
        <View style={[styles.plus, { backgroundColor: t.solInk }]}>
          <Icon name="plus" size={18} color={t.sol} strokeWidth={3} />
        </View>
        <Text style={[styles.text, { color: t.solInk }]}>Add a task</Text>
      </PressableScale>
    </View>
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
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  plus: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: F.bold, fontSize: 16.5 },
});
