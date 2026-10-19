import { useCallback, useEffect, useMemo, useState } from 'react';

import { todayKey } from './dates';
import { loadTasks, saveTasks } from './storage';
import type { Filter, Priority, Task } from './types';

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Open tasks: earliest due first (no date last), then priority, then oldest. */
const byUrgency = (a: Task, b: Task) => {
  if (a.due !== b.due) {
    if (a.due === null) return 1;
    if (b.due === null) return -1;
    return a.due < b.due ? -1 : 1;
  }
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdAt - b.createdAt;
};

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadTasks().then((t) => {
      setTasks(t);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveTasks(tasks);
  }, [tasks, loaded]);

  const addTask = useCallback((title: string, due: string | null, priority: Priority) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      { id: newId(), title: trimmed, done: false, priority, due, createdAt: Date.now(), completedAt: null },
      ...prev,
    ]);
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, done: !t.done, completedAt: t.done ? null : Date.now() } : t,
      ),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearDone = useCallback(() => {
    setTasks((prev) => prev.filter((t) => !t.done));
  }, []);

  const views = useMemo(() => {
    const today = todayKey();
    const open = tasks.filter((t) => !t.done).sort(byUrgency);
    const done = tasks
      .filter((t) => t.done)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

    const lists: Record<Filter, Task[]> = {
      // Due today or overdue and still open, plus what you finished from today's list.
      today: [
        ...open.filter((t) => t.due !== null && t.due <= today),
        ...done.filter((t) => t.due === today),
      ],
      upcoming: open.filter((t) => t.due !== null && t.due > today),
      all: open,
      done,
    };

    const dueToday = tasks.filter((t) => t.due === today);
    const overdue = open.filter((t) => t.due !== null && t.due < today).length;

    return {
      lists,
      progress: { done: dueToday.filter((t) => t.done).length, total: dueToday.length },
      overdue,
    };
  }, [tasks]);

  return { loaded, ...views, addTask, toggleTask, deleteTask, clearDone };
}
