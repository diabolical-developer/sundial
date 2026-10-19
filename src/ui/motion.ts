import { Easing } from 'react-native-reanimated';

/** Shared motion language: quick, springy, never bouncy enough to feel toy-like. */
export const SPRING = { damping: 20, stiffness: 220, mass: 0.9 };
export const SPRING_SOFT = { damping: 24, stiffness: 160, mass: 1 };
export const SPRING_POP = { damping: 9, stiffness: 280, mass: 0.7 };
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

type Keyframes = Record<string, Record<string, unknown>>;

/**
 * An ambient, endlessly repeating CSS animation (Reanimated 4), for things like twinkling stars
 * and drifting clouds. Runs off the JS thread. Returns nothing when motion is reduced.
 */
export function loop(
  reduceMotion: boolean,
  keyframes: Keyframes,
  durationMs: number,
  opts: { delayMs?: number; alternate?: boolean; linear?: boolean } = {},
) {
  if (reduceMotion) return {};
  return {
    animationName: keyframes,
    animationDuration: `${durationMs}ms`,
    animationDelay: `${opts.delayMs ?? 0}ms`,
    animationIterationCount: 'infinite',
    animationDirection: opts.alternate ? 'alternate' : 'normal',
    animationTimingFunction: opts.linear ? 'linear' : 'ease-in-out',
  } as object;
}

/** Deterministic pseudo-random numbers, so decorative scatter stays put between renders. */
export const seeded = (i: number, n: number) => {
  const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
