import { addDays, dateOf } from './time';
import type { Repeat, Task } from './types';

export const REPEAT_LABEL: Record<Repeat, string> = {
  daily: 'Every day',
  weekdays: 'Weekdays',
  weekly: 'Every week',
};

/** First date on or after `from` that the rule lands on. Weekly tasks keep the weekday of `anchor`. */
export function nextDue(rule: Repeat, anchor: string, from: string): string {
  let d = from;
  for (let i = 0; i < 8; i++) {
    const wd = dateOf(d).getDay();
    if (rule === 'daily') return d;
    if (rule === 'weekdays' && wd >= 1 && wd <= 5) return d;
    if (rule === 'weekly' && wd === dateOf(anchor).getDay()) return d;
    d = addDays(d, 1);
  }
  return from;
}

/**
 * Keeps every repeating series down to exactly one open occurrence:
 * - finished the last one? the next one appears on its next due day;
 * - missed one? it rolls forward to the next due day instead of piling up as "slipped";
 * - un-ticked one after the next was made? the extra open copy goes away.
 * Returns the new list, or null when nothing needed to change.
 */
export function reconcileSeries(tasks: Task[], today: string, newId: () => string): Task[] | null {
  const series = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.seriesId) continue;
    series.set(t.seriesId, [...(series.get(t.seriesId) ?? []), t]);
  }
  if (series.size === 0) return null;

  let list = tasks;
  let changed = false;
  for (const items of series.values()) {
    const byDate = [...items].sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? -1 : 1));
    const latest = byDate[byDate.length - 1];
    const rule = latest.repeat;
    if (!rule || !latest.date) continue; // the series was stopped

    const open = byDate.filter((t) => !t.done);
    if (open.length > 1) {
      const extra = new Set(open.slice(1).map((t) => t.id));
      list = list.filter((t) => !extra.has(t.id));
      changed = true;
    }
    const keep = open[0];
    if (keep) {
      if (keep.date && keep.date < today) {
        const date = nextDue(rule, keep.date, today);
        list = list.map((t) => (t.id === keep.id ? { ...t, date } : t));
        changed = true;
      }
      continue;
    }
    const from = addDays(latest.date, 1) > today ? addDays(latest.date, 1) : today;
    const next: Task = {
      ...latest,
      id: newId(),
      done: false,
      date: nextDue(rule, latest.date, from),
      notificationId: null,
      focusMinutes: 0,
      createdAt: Date.now(),
      completedAt: null,
    };
    list = [next, ...list];
    changed = true;
  }
  return changed ? list : null;
}
