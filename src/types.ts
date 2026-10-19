export type Priority = 'low' | 'normal' | 'high';

export type Tab = 'today' | 'upcoming' | 'done';

/** How a task comes back after it's done. */
export type Repeat = 'daily' | 'weekdays' | 'weekly';

export interface Task {
  id: string;
  title: string;
  notes: string;
  done: boolean;
  priority: Priority;
  /** Local date key `YYYY-MM-DD`, or null for "someday". */
  date: string | null;
  /** Local time `HH:MM` (24h), or null for "any time". */
  time: string | null;
  reminder: boolean;
  notificationId: string | null;
  focusMinutes: number;
  /** Repeating tasks: the rule, and the id shared by every occurrence. */
  repeat?: Repeat | null;
  seriesId?: string | null;
  createdAt: number;
  completedAt: number | null;
}

export interface Settings {
  name: string;
  onboarded: boolean;
  /** Days on which every task planned for that day was finished. */
  clearedDays: string[];
  /** What each day looked like, kept even after finished tasks are cleared (for the calendar). */
  history?: Record<string, DayRecord>;
}

export interface DayRecord {
  planned: number;
  done: number;
  focus: number;
}

export interface Schedule {
  date: string | null;
  time: string | null;
  priority: Priority;
  reminder: boolean;
  repeat?: Repeat | null;
}
