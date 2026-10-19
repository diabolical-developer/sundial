import { addDays, BUCKETS, bucketOf, dayKeyOf, taskMinutes, type Bucket } from './time';
import type { Task } from './types';

const RANK = { high: 0, normal: 1, low: 2 } as const;

/** Earliest time first (no time last), then priority, then oldest. */
export function byTime(a: Task, b: Task) {
  if (a.time !== b.time) {
    if (a.time === null) return 1;
    if (b.time === null) return -1;
    return taskMinutes(a.time) - taskMinutes(b.time);
  }
  return RANK[a.priority] - RANK[b.priority] || a.createdAt - b.createdAt;
}

const byDateThenTime = (a: Task, b: Task) =>
  a.date !== b.date ? ((a.date ?? '9999') < (b.date ?? '9999') ? -1 : 1) : byTime(a, b);

export interface Section {
  key: string;
  title: string;
  hint?: string;
  tasks: Task[];
  bucket?: Bucket;
}

export function todayView(tasks: Task[], today: string) {
  const slipped = tasks.filter((t) => !t.done && t.date !== null && t.date < today).sort(byDateThenTime);
  const open = tasks.filter((t) => !t.done && t.date === today).sort(byTime);
  const finished = tasks
    .filter((t) => t.done && t.date === today)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const buckets: Section[] = BUCKETS.map((b) => ({
    key: b.key,
    title: b.title,
    hint: b.range,
    bucket: b.key,
    tasks: open.filter((t) => bucketOf(t.time) === b.key),
  })).filter((s) => s.tasks.length > 0);
  return { slipped, open, buckets, finished, total: open.length + finished.length };
}

export function upcomingView(tasks: Task[], today: string): { dated: Map<string, Task[]>; someday: Task[] } {
  const open = tasks.filter((t) => !t.done && (t.date === null || t.date > today)).sort(byDateThenTime);
  const dated = new Map<string, Task[]>();
  const someday: Task[] = [];
  for (const t of open) {
    if (t.date === null) someday.push(t);
    else dated.set(t.date, [...(dated.get(t.date) ?? []), t]);
  }
  return { dated, someday };
}

export function doneView(tasks: Task[]): Map<string, Task[]> {
  const done = tasks.filter((t) => t.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const groups = new Map<string, Task[]>();
  for (const t of done) {
    const day = dayKeyOf(new Date(t.completedAt ?? t.createdAt));
    groups.set(day, [...(groups.get(day) ?? []), t]);
  }
  return groups;
}

/** The single task to do next: today's earliest open task, else anything that slipped. */
export function nextUp(tasks: Task[], today: string): Task | null {
  const { open, slipped } = todayView(tasks, today);
  return open[0] ?? slipped[0] ?? null;
}

/** Consecutive cleared days ending today (or yesterday, if today isn't cleared yet). */
export function streakOf(clearedDays: string[], today: string) {
  const days = new Set(clearedDays);
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}
