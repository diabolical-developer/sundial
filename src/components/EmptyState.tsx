import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { F, useTheme } from '../theme';

/** A quiet horizon with a half-risen sun, and a line that says what to do. */
export function EmptyState({ title, body }: { title: string; body: string }) {
  const t = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.card, { backgroundColor: t.card }]}>
      <View style={styles.scene}>
        <View style={[styles.sun, { backgroundColor: t.sol }]} />
        <View style={[styles.ground, { backgroundColor: t.card }]} />
        <View style={[styles.line, { backgroundColor: t.line }]} />
      </View>
      <Text style={[styles.title, { color: t.ink }]}>{title}</Text>
      <Text style={[styles.body, { color: t.muted }]}>{body}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center' },
  scene: { width: 120, height: 40, alignItems: 'center', marginBottom: 14, overflow: 'hidden' },
  sun: { position: 'absolute', top: 12, width: 52, height: 52, borderRadius: 26 },
  ground: { position: 'absolute', top: 38, left: 0, right: 0, height: 10 },
  line: { position: 'absolute', top: 37, left: 0, right: 0, height: 2, borderRadius: 1 },
  title: { fontFamily: F.displayBold, fontSize: 18, letterSpacing: -0.3, textAlign: 'center' },
  body: { fontFamily: F.medium, fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginTop: 6, maxWidth: 320 },
});
