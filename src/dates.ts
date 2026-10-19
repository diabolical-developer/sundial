const pad = (n: number) => String(n).padStart(2, '0');

/** Local-date key `YYYY-MM-DD`. Keys sort correctly as plain strings. */
export const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const daysFromToday = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toKey(d);
};

export const todayKey = () => daysFromToday(0);

const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const short = (key: string) =>
  fromKey(key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export type DueTone = 'overdue' | 'today' | 'soon' | 'none';

export function describeDue(due: string | null): { label: string; tone: DueTone } {
  if (!due) return { label: 'No date', tone: 'none' };
  const today = todayKey();
  if (due < today) {
    return { label: due === daysFromToday(-1) ? 'Overdue · yesterday' : `Overdue · ${short(due)}`, tone: 'overdue' };
  }
  if (due === today) return { label: 'Today', tone: 'today' };
  if (due === daysFromToday(1)) return { label: 'Tomorrow', tone: 'soon' };
  return { label: short(due), tone: 'soon' };
}

export const headerDate = () =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
