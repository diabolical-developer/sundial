import { useColorScheme } from 'react-native';

import type { Priority } from './types';

/** Bricolage Grotesque for display, Figtree for reading. */
export const F = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semi: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
} as const;

const light = {
  isDark: false,
  bg: '#ECEEF7', // haze
  card: '#FFFFFF',
  ink: '#17143A', // midnight
  muted: '#646089',
  faint: '#A3A0C2',
  line: '#E0E1EE',
  iris: '#5B45F5',
  irisSoft: '#E8E4FF',
  sol: '#FFC21A',
  solInk: '#17143A',
  amber: '#D99500',
  leaf: '#1C9A63',
  leafSoft: '#DCF4E8',
  ember: '#E5432E',
  emberSoft: '#FDE2DD',
  panel: '#17143A', // the "up next" card
  panelInk: '#FFFFFF',
  panelMuted: '#B4B0E2',
  backdrop: 'rgba(14, 11, 46, 0.42)',
};

const dark: typeof light = {
  isDark: true,
  bg: '#0E0C26',
  card: '#1A1740',
  ink: '#F1EFFF',
  muted: '#A19DC9',
  faint: '#6A6696',
  line: '#2A2756',
  iris: '#9886FF',
  irisSoft: '#2A2363',
  sol: '#FFC94A',
  solInk: '#17143A',
  amber: '#FFC94A',
  leaf: '#3CCB8B',
  leafSoft: '#163A2E',
  ember: '#FF6A55',
  emberSoft: '#40202A',
  panel: '#2A2470',
  panelInk: '#FFFFFF',
  panelMuted: '#C2BDF0',
  backdrop: 'rgba(3, 2, 16, 0.6)',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Ring colour of a task's check circle. */
export const priorityRing = (t: Theme, p: Priority) =>
  p === 'high' ? t.amber : p === 'low' ? t.faint : t.isDark ? '#5E5A92' : '#B9B6D6';

export type Phase = 'dawn' | 'day' | 'dusk' | 'night';

type Sky = {
  colors: readonly [string, string, string, string];
  locations: readonly [number, number, number, number];
  /** Colour of the sun's path and horizon, chosen for the lower sky. */
  arc: string;
};

export const SKY: Record<Phase, Sky> = {
  dawn: {
    colors: ['#2E2B6E', '#7A4E9C', '#F08F8A', '#FFD9B0'],
    locations: [0, 0.38, 0.78, 1],
    arc: '#3A2D75',
  },
  day: {
    colors: ['#1C4FD8', '#3A78F0', '#8CC2FF', '#DCEDFF'],
    locations: [0, 0.4, 0.8, 1],
    arc: '#123A9A',
  },
  dusk: {
    colors: ['#241752', '#6B347F', '#E0606A', '#FFB168'],
    locations: [0, 0.4, 0.8, 1],
    arc: '#2A1757',
  },
  night: {
    colors: ['#060A22', '#0F1640', '#1D2463', '#33378A'],
    locations: [0, 0.4, 0.8, 1],
    arc: '#C9CCFF',
  },
};

export function phaseAt(d: Date): Phase {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 8.5) return 'dawn';
  if (h >= 8.5 && h < 16.5) return 'day';
  if (h >= 16.5 && h < 20.5) return 'dusk';
  return 'night';
}

export const CONFETTI = ['#FFC21A', '#5B45F5', '#1C9A63', '#E5432E', '#5FA8FF', '#FF8FB1'];
