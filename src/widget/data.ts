import { reconcileSeries } from '../repeat';
import { byTime, streakOf } from '../select';
import { readSnapshot, writeSnapshot } from '../snapshot';
import { phaseAt, type Phase } from '../theme';
import { dateOf, dayKeyOf, dayProgress, formatTime, isNight, longDate, nightProgress, nowMinutes, taskMinutes } from '../time';
import type { Priority, Task } from '../types';
import type { ArtMarker } from './skyArt';

export interface WidgetRow {
  id: string;
  title: string;
  time: string | null;
  priority: Priority;
  late: boolean;
  done: boolean;
}

export interface WidgetState {
  date: string;
  phase: Phase;
  night: boolean;
  at: number;
  markers: ArtMarker[];
  done: number;
  total: number;
  streak: number;
  /** Today's tasks: open ones first (soonest first), then a few just finished. */
  rows: WidgetRow[];
  onboarded: boolean;
}

/** Everything the widgets show, worked out from what the app saved. */
export async function loadWidgetState(now = new Date()): Promise<WidgetState> {
  const snap = await readSnapshot();
  const tasks = snap?.tasks ?? [];
  const today = dayKeyOf(now);
  const nowMin = nowMinutes(now);
  const night = isNight(nowMin);
  const along = night ? nightProgress : dayProgress;

  const todays = tasks.filter((t) => t.date === today);
  const done = todays.filter((t) => t.done).length;
  const cleared = todays.length > 0 && done === todays.length;
  const days = (snap?.settings.clearedDays ?? []).filter((d) => d !== today);
  const streak = streakOf(cleared ? [...days, today] : days, today);

  const isLate = (t: Task) => !!t.time && taskMinutes(t.time) < nowMin - 1;
  const open = todays.filter((t) => !t.done).sort(byTime);
  const finished = todays.filter((t) => t.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const rows = [...open, ...finished].map((t) => ({
    id: t.id,
    title: t.title,
    time: t.time ? formatTime(t.time) : null,
    priority: t.priority,
    late: !t.done && isLate(t),
    done: t.done,
  }));

  const markers: ArtMarker[] = todays
    .filter((t) => t.time && isNight(taskMinutes(t.time)) === night)
    .map((t) => ({ at: along(taskMinutes(t.time!)), state: t.done ? 'done' : isLate(t) ? 'late' : 'open' }));

  return {
    date: longDate(dateOf(today)),
    phase: phaseAt(now),
    night,
    at: along(nowMin),
    markers,
    done,
    total: todays.length,
    streak,
    rows,
    onboarded: snap?.settings.onboarded ?? false,
  };
}

/** Tick a task off (or back on) from the widget, and tell the app when it next opens. */
export async function toggleFromWidget(id: string) {
  const snap = await readSnapshot();
  if (!snap) return;
  const now = new Date();
  let tasks = snap.tasks.map((t) => (t.id === id ? { ...t, done: !t.done, completedAt: t.done ? null : now.getTime() } : t));
  // A finished repeating task brings its next occurrence, same as in the app.
  tasks = reconcileSeries(tasks, dayKeyOf(now), () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`) ?? tasks;
  await writeSnapshot({ tasks, settings: snap.settings, by: 'widget' });
}
