export type Priority = 'low' | 'medium' | 'high';

export type Filter = 'today' | 'upcoming' | 'all' | 'done';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  /** Due date as a local `YYYY-MM-DD` key, or null for "no date". */
  due: string | null;
  createdAt: number;
  completedAt: number | null;
}
