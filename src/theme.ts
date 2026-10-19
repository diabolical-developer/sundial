import { useColorScheme } from 'react-native';

import type { Priority } from './types';

const light = {
  bg: '#F6F6FA',
  card: '#FFFFFF',
  text: '#15151F',
  muted: '#6B6B80',
  border: '#E4E4EE',
  accent: '#4F46E5',
  accentSoft: '#EEEDFD',
  onAccent: '#FFFFFF',
  danger: '#D93D3D',
  warning: '#C77700',
  success: '#1E9E5A',
};

const dark: typeof light = {
  bg: '#0E0E14',
  card: '#1A1A24',
  text: '#F1F1F6',
  muted: '#9A9AB0',
  border: '#2A2A38',
  accent: '#8B85FF',
  accentSoft: '#25234A',
  onAccent: '#0E0E14',
  danger: '#FF6B6B',
  warning: '#FFB547',
  success: '#4BD48A',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const priorityColor = (theme: Theme, p: Priority) =>
  p === 'high' ? theme.danger : p === 'medium' ? theme.warning : theme.success;
