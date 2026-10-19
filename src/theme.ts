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
  /** Second stop of the "up next" card's gradient. */
  panelEdge: '#3A2E9E',
  /** Lifts cards off the page: a soft shadow in light mode, a faint rim in dark mode. */
  raised: {
    shadowColor: '#2A2370',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 0,
    borderColor: 'transparent',
  },
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
  panelEdge: '#4A3CB8',
  raised: {
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
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
  /** Far range, middle hills, near treeline: far ones fade toward the sky (atmospheric perspective). */
  land: readonly [string, string, string];
  /** Light pooling on the horizon behind the mountains. */
  glow: string;
  /** Text and lines drawn over the mountains. */
  onHills: string;
  /** How many of the stars show (0 to 1). */
  stars: number;
  /** Lit tops and shaded undersides of clouds, or null for a clear sky. */
  clouds: readonly [string, string] | null;
  /** The sun low in the sky is warmer: its bloom colour. */
  sunGlow: string;
};

export const SKY: Record<Phase, Sky> = {
  dawn: {
    colors: ['#1C2556', '#5B4C8F', '#E0898C', '#FFD2A1'],
    locations: [0, 0.42, 0.8, 1],
    arc: '#3A2D75',
    land: ['#A57A9C', '#634A7A', '#2C2346'],
    glow: '#FFD9A8',
    onHills: 'rgba(255,255,255,0.88)',
    stars: 0.35,
    clouds: ['#FFE6D6', '#B47C98'],
    sunGlow: '#FFB46A',
  },
  day: {
    colors: ['#1F5FD0', '#4A8FEA', '#97C6F7', '#DCEEFF'],
    locations: [0, 0.4, 0.8, 1],
    arc: '#123A9A',
    land: ['#9CB8DC', '#5E87AA', '#284F55'],
    glow: '#FFFFFF',
    onHills: 'rgba(255,255,255,0.94)',
    stars: 0,
    clouds: ['#FFFFFF', '#A9C2E2'],
    sunGlow: '#FFE9A8',
  },
  dusk: {
    colors: ['#1B1340', '#55306F', '#C9587A', '#FFA868'],
    locations: [0, 0.42, 0.8, 1],
    arc: '#2A1757',
    land: ['#A65C7E', '#5C2F60', '#261434'],
    glow: '#FFC07A',
    onHills: 'rgba(255,255,255,0.88)',
    stars: 0.25,
    clouds: ['#FFC9A6', '#8E4A78'],
    sunGlow: '#FF9A50',
  },
  night: {
    colors: ['#03071C', '#0A1236', '#18245E', '#2B3678'],
    locations: [0, 0.4, 0.8, 1],
    arc: '#C9CCFF',
    land: ['#222E68', '#151D4A', '#0A0F2E'],
    glow: '#5F6BE0',
    onHills: 'rgba(214,216,255,0.8)',
    stars: 1,
    clouds: null,
    sunGlow: '#C9CCFF',
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
