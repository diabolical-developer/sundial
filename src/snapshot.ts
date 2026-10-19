import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Settings, Task } from './types';

/** Where the app keeps everything. The home-screen widget reads and writes the same place. */
export const STORAGE_KEY = 'sundial/v2';

export interface Snapshot {
  v: 2;
  tasks: Task[];
  settings: Settings;
  /** When it was written, and by whom, so the app can pick up ticks made on the widget. */
  savedAt?: number;
  by?: 'app' | 'widget';
}

export async function readSnapshot(): Promise<Snapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

export function writeSnapshot(data: Omit<Snapshot, 'v' | 'savedAt'>) {
  const savedAt = Date.now();
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 2, ...data, savedAt })).then(() => savedAt);
}
