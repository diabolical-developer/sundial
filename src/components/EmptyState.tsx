import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { F, type Phase, SKY, useTheme } from '../theme';
import { loop, seeded } from '../ui/motion';
import { Cloud, Landscape } from './SkyScene';
import { Moon, Sun } from './SunArc';

export type Scene = 'sunrise' | 'horizon' | 'night';

const W = 220;
const H = 124;
const PHASE: Record<Scene, Phase> = { sunrise: 'dawn', horizon: 'day', night: 'night' };

/** A small window onto the same sky as the header, dissolving into the card at the bottom. */
function Postcard({ scene, ground }: { scene: Scene; ground: string }) {
  const reduceMotion = useReducedMotion();
  const phase = PHASE[scene];
  const sky = SKY[phase];
  const night = scene === 'night';
  return (
    <View style={styles.postcard}>
      <LinearGradient colors={sky.colors} locations={sky.locations} style={StyleSheet.absoluteFill} />

      {night &&
        Array.from({ length: 22 }, (_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              { left: seeded(i, 11) * W, top: seeded(i, 12) * 70, opacity: 0.4 + seeded(i, 13) * 0.6 },
              loop(reduceMotion, { from: { opacity: 1 }, to: { opacity: 0.2 } }, 1800 + seeded(i, 14) * 2400, {
                alternate: true,
                delayMs: seeded(i, 15) * 2000,
              }),
            ]}
          />
        ))}

      {sky.clouds && (
        <Animated.View
          style={[
            styles.cloud,
            loop(reduceMotion, { from: { transform: [{ translateX: 0 }] }, to: { transform: [{ translateX: 16 }] } }, 7000, {
              alternate: true,
            }),
          ]}
        >
          <Cloud id={`es-${scene}`} w={78} lit={sky.clouds[0]} shade={sky.clouds[1]} />
        </Animated.View>
      )}

      {/* The sun (or moon) floats gently above the ridge. */}
      <Animated.View
        style={[
          styles.orb,
          night ? { left: 128, top: 6 } : { left: W / 2 - 42, top: scene === 'sunrise' ? 34 : 4 },
          loop(reduceMotion, { from: { transform: [{ translateY: 0 }] }, to: { transform: [{ translateY: -5 }] } }, 2800, {
            alternate: true,
          }),
        ]}
      >
        {night ? <Moon reduceMotion={reduceMotion} /> : <Sun reduceMotion={reduceMotion} glow={sky.sunGlow} />}
      </Animated.View>

      <Landscape phase={phase} ground={ground} height={62} />
    </View>
  );
}

/** A small illustrated scene, and a line that says what to do. */
export function EmptyState({ title, body, scene = 'sunrise' }: { title: string; body: string; scene?: Scene }) {
  const t = useTheme();
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.card, t.raised, { backgroundColor: t.card }]}>
      <Postcard scene={scene} ground={t.card} />
      <Text style={[styles.title, { color: t.ink }]}>{title}</Text>
      <Text style={[styles.body, { color: t.muted }]}>{body}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, paddingTop: 18, paddingBottom: 26, paddingHorizontal: 24, alignItems: 'center' },
  postcard: { width: W, height: H, borderRadius: 20, overflow: 'hidden', marginBottom: 10 },
  star: { position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: '#FFFFFF' },
  orb: { position: 'absolute', width: 84, height: 84 },
  cloud: { position: 'absolute', left: 14, top: 14 },
  title: { fontFamily: F.displayBold, fontSize: 18, letterSpacing: -0.3, textAlign: 'center' },
  body: { fontFamily: F.medium, fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginTop: 6, maxWidth: 320 },
});
