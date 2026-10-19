import { Easing } from 'react-native-reanimated';

/** Shared motion language: quick, springy, never bouncy enough to feel toy-like. */
export const SPRING = { damping: 20, stiffness: 220, mass: 0.9 };
export const SPRING_SOFT = { damping: 24, stiffness: 160, mass: 1 };
export const SPRING_POP = { damping: 9, stiffness: 280, mass: 0.7 };
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
