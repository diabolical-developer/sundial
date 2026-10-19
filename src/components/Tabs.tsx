import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptic } from '../haptics';
import { F, useTheme } from '../theme';
import type { Tab } from '../types';
import { SPRING } from '../ui/motion';

const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'done', label: 'Done' },
];

interface Props {
  value: Tab;
  counts: Record<Tab, number>;
  onChange: (tab: Tab) => void;
}

/** Segmented control with a pill that slides to the selected tab. */
export function Tabs({ value, counts, onChange }: Props) {
  const t = useTheme();
  const [layouts, setLayouts] = useState<Record<string, { x: number; w: number }>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);

  useEffect(() => {
    const l = layouts[value];
    if (!l) return;
    if (w.value === 0) {
      x.value = l.x;
      w.value = l.w;
    } else {
      x.value = withSpring(l.x, SPRING);
      w.value = withSpring(l.w, SPRING);
    }
  }, [value, layouts, x, w]);

  const pill = useAnimatedStyle(() => ({ width: w.value, transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.bar, { backgroundColor: t.isDark ? t.card : '#DFE1EE' }]} accessibilityRole="tablist">
      <Animated.View style={[styles.pill, { backgroundColor: t.isDark ? t.irisSoft : t.card }, pill]} />
      {TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onLayout={(e) => {
              const { x: lx, width } = e.nativeEvent.layout;
              setLayouts((prev) => ({ ...prev, [tab.key]: { x: lx, w: width } }));
            }}
            onPress={() => {
              if (!active) haptic.tap();
              onChange(tab.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.tab}
          >
            <Text style={[styles.label, { color: active ? t.ink : t.muted }]}>{tab.label}</Text>
            {counts[tab.key] > 0 && (
              <Text style={[styles.count, { color: active ? t.iris : t.faint }]}>{counts[tab.key]}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderRadius: 18, padding: 4 },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: 14,
    shadowColor: '#17143A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40 },
  label: { fontFamily: F.bold, fontSize: 14.5 },
  count: { fontFamily: F.bold, fontSize: 13, fontVariant: ['tabular-nums'] },
});
