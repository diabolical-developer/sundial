import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Task } from './types';

// AsyncStorage uses device storage on Android and localStorage on the web.
const KEY = 'todo-app/tasks/v1';

export async function loadTasks(): Promise<Task[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(tasks));
  } catch {
    // Storage can be unavailable (e.g. private browsing). The app keeps working in memory.
  }
}
