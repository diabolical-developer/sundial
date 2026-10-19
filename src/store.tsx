import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { haptic } from './haptics';
import { cancelReminder, remindersSupported, scheduleReminder } from './reminders';
import { addDays, keyOf } from './time';
import type { Priority, Settings, Task } from './types';
import { useNow } from './useNow';

const KEY = 'sundial/v2';
const LEGACY_KEY = 'todo-app/tasks/v1';

export interface NewTask {
  title: string;
  date: string | null;
  time: string | null;
  priority: Priority;
  reminder: boolean;
  notes?: string;
}

interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

interface Store {
  loaded: boolean;
  tasks: Task[];
  settings: Settings;
  today: string;
  streak: number;
  toast: Toast | null;
  /** Increments each time the whole day gets finished. */
  celebration: number;
  addTask: (input: NewTask) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  setDone: (id: string, done: boolean, opts?: { toast?: boolean }) => void;
  deleteTask: (id: string) => void;
  bringToToday: (ids: string[]) => void;
  clearDone: () => void;
  logFocus: (id: string, minutes: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  showToast: (message: string, undo?: () => void) => void;
  dismissToast: () => void;
}

const DEFAULT_SETTINGS: Settings = { name: '', onboarded: false, clearedDays: [] };

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}

/** Brings tasks saved by the first version of the app forward. */
function fromLegacy(raw: unknown): Task[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t) => t && typeof t.title === 'string')
    .map((t) => ({
      id: String(t.id ?? newId()),
      title: t.title,
      notes: '',
      done: !!t.done,
      priority: t.priority === 'high' ? 'high' : t.priority === 'low' ? 'low' : 'normal',
      date: typeof t.due === 'string' ? t.due : null,
      time: null,
      reminder: false,
      notificationId: null,
      focusMinutes: 0,
      createdAt: Number(t.createdAt) || Date.now(),
      completedAt: t.done ? Number(t.completedAt) || Date.now() : null,
    }));
}

async function load(): Promise<{ tasks: Task[]; settings: Settings }> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
      };
    }
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    return { tasks: legacy ? fromLegacy(JSON.parse(legacy)) : [], settings: DEFAULT_SETTINGS };
  } catch {
    return { tasks: [], settings: DEFAULT_SETTINGS };
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState<Toast | null>(null);
  const [celebration, setCelebration] = useState(0);
  const now = useNow(60_000);
  const today = keyOf(now);

  // Actions read and write through refs so they stay stable and side effects run once.
  const tasksRef = useRef(tasks);
  const settingsRef = useRef(settings);
  const commit = useCallback((next: Task[]) => {
    tasksRef.current = next;
    setTasks(next);
  }, []);
  const todayRef = useRef(today);
  todayRef.current = today;

  useEffect(() => {
    load().then(({ tasks: t, settings: s }) => {
      tasksRef.current = t;
      settingsRef.current = s;
      setTasks(t);
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  // Save (debounced).
  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => {
      AsyncStorage.setItem(KEY, JSON.stringify({ v: 2, tasks, settings })).catch(() => {});
    }, 250);
    return () => clearTimeout(id);
  }, [tasks, settings, loaded]);

  // Keep "cleared days" in step with today's list (for the streak).
  useEffect(() => {
    if (!loaded) return;
    const todays = tasks.filter((t) => t.date === today);
    const cleared = todays.length > 0 && todays.every((t) => t.done);
    const has = settings.clearedDays.includes(today);
    if (cleared !== has) {
      const days = cleared
        ? [...settings.clearedDays, today].slice(-400)
        : settings.clearedDays.filter((d) => d !== today);
      settingsRef.current = { ...settingsRef.current, clearedDays: days };
      setSettings(settingsRef.current);
    }
  }, [tasks, today, loaded, settings.clearedDays]);

  // Schedule / cancel reminders whenever a task's timing changes.
  const reminderMeta = useRef(new Map<string, { sig: string; nid: string | null }>());
  useEffect(() => {
    if (!loaded || !remindersSupported) return;
    const meta = reminderMeta.current;
    const seen = new Set<string>();
    for (const t of tasks) {
      seen.add(t.id);
      const sig = `${t.date}|${t.time}|${t.reminder}|${t.done}`;
      const prev = meta.get(t.id);
      if (prev && prev.sig === sig) {
        prev.nid = t.notificationId;
        continue;
      }
      meta.set(t.id, { sig, nid: t.notificationId });
      if (!prev && (t.notificationId || !t.reminder || t.done)) continue; // already in sync after load
      (async () => {
        await cancelReminder(t.notificationId);
        const nid = await scheduleReminder(t);
        if (nid !== t.notificationId) {
          commit(tasksRef.current.map((x) => (x.id === t.id ? { ...x, notificationId: nid } : x)));
        }
      })();
    }
    for (const [id, m] of meta) {
      if (!seen.has(id)) {
        cancelReminder(m.nid);
        meta.delete(id);
      }
    }
  }, [tasks, loaded, commit]);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);
  const showToast = useCallback((message: string, undo?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, undo });
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const addTask = useCallback(
    (input: NewTask) => {
      const task: Task = {
        id: newId(),
        title: input.title.trim(),
        notes: input.notes ?? '',
        done: false,
        priority: input.priority,
        date: input.date,
        time: input.time,
        reminder: input.reminder,
        notificationId: null,
        focusMinutes: 0,
        createdAt: Date.now(),
        completedAt: null,
      };
      commit([task, ...tasksRef.current]);
      return task;
    },
    [commit],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      commit(tasksRef.current.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [commit],
  );

  const setDone = useCallback(
    (id: string, done: boolean, opts?: { toast?: boolean }) => {
      const prev = tasksRef.current;
      const target = prev.find((t) => t.id === id);
      if (!target || target.done === done) return;
      const next = prev.map((t) => (t.id === id ? { ...t, done, completedAt: done ? Date.now() : null } : t));
      commit(next);
      if (!done) return;

      const day = todayRef.current;
      const wasCleared = prev.filter((t) => t.date === day).every((t) => t.done);
      const todays = next.filter((t) => t.date === day);
      const isCleared = todays.length > 0 && todays.every((t) => t.done);
      if (target.date === day && isCleared && !wasCleared) {
        haptic.success();
        setCelebration((c) => c + 1);
        showToast('Everything planned for today is done.');
      } else if (opts?.toast) {
        showToast('Marked as done', () => setDoneRef.current(id, false));
      }
    },
    [commit, showToast],
  );
  const setDoneRef = useRef(setDone);
  setDoneRef.current = setDone;

  const deleteTask = useCallback(
    (id: string) => {
      const prev = tasksRef.current;
      const index = prev.findIndex((t) => t.id === id);
      if (index < 0) return;
      const removed = prev[index];
      commit(prev.filter((t) => t.id !== id));
      showToast('Task deleted', () => {
        const list = [...tasksRef.current];
        list.splice(Math.min(index, list.length), 0, { ...removed, notificationId: null });
        commit(list);
      });
    },
    [commit, showToast],
  );

  const bringToToday = useCallback(
    (ids: string[]) => {
      const set = new Set(ids);
      commit(tasksRef.current.map((t) => (set.has(t.id) ? { ...t, date: todayRef.current } : t)));
      showToast(ids.length === 1 ? 'Moved to today' : `${ids.length} tasks moved to today`);
    },
    [commit, showToast],
  );

  const clearDone = useCallback(() => {
    const prev = tasksRef.current;
    const removed = prev.filter((t) => t.done);
    if (!removed.length) return;
    commit(prev.filter((t) => !t.done));
    showToast(`Cleared ${removed.length} finished ${removed.length === 1 ? 'task' : 'tasks'}`, () =>
      commit([...tasksRef.current, ...removed]),
    );
  }, [commit, showToast]);

  const logFocus = useCallback(
    (id: string, minutes: number) => {
      commit(tasksRef.current.map((t) => (t.id === id ? { ...t, focusMinutes: t.focusMinutes + minutes } : t)));
    },
    [commit],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    settingsRef.current = { ...settingsRef.current, ...patch };
    setSettings(settingsRef.current);
  }, []);

  const streak = useMemo(() => {
    const days = new Set(settings.clearedDays);
    let d = days.has(today) ? today : addDays(today, -1);
    let n = 0;
    while (days.has(d)) {
      n += 1;
      d = addDays(d, -1);
    }
    return n;
  }, [settings.clearedDays, today]);

  const value = useMemo<Store>(
    () => ({
      loaded,
      tasks,
      settings,
      today,
      streak,
      toast,
      celebration,
      addTask,
      updateTask,
      setDone,
      deleteTask,
      bringToToday,
      clearDone,
      logFocus,
      updateSettings,
      showToast,
      dismissToast,
    }),
    [loaded, tasks, settings, today, streak, toast, celebration, addTask, updateTask, setDone, deleteTask, bringToToday, clearDone, logFocus, updateSettings, showToast, dismissToast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
