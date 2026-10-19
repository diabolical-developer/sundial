export type Priority = 'low' | 'normal' | 'high';

export type Tab = 'today' | 'upcoming' | 'done';

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
  createdAt: number;
  completedAt: number | null;
}

export interface Settings {
  name: string;
  onboarded: boolean;
  /** Days on which every task planned for that day was finished. */
  clearedDays: string[];
}

export interface Schedule {
  date: string | null;
  time: string | null;
  priority: Priority;
  reminder: boolean;
}
