/** Your planning day, drawn as the sun's path in the sky. */
export const DAY_START = 6 * 60;
export const DAY_END = 22 * 60;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');

export const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const dateOf = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (key: string, n: number) => {
  const d = dateOf(key);
  d.setDate(d.getDate() + n);
  return keyOf(d);
};

export const minutesOf = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const toTime = (minutes: number) => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

export const nowMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

/** "9 am", "6:30 pm" */
export function formatTime(time: string) {
  const total = minutesOf(time);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${pad(m)} ${suffix}`;
}

export const weekdayShort = (key: string) => WEEKDAYS[dateOf(key).getDay()].slice(0, 3);

/** "Today", "Tomorrow", "Yesterday", or "Thu 22 Oct". */
export function dayLabel(key: string, today: string) {
  if (key === today) return 'Today';
  if (key === addDays(today, 1)) return 'Tomorrow';
  if (key === addDays(today, -1)) return 'Yesterday';
  const d = dateOf(key);
  return `${WEEKDAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** "Tuesday, 20 October" */
export const longDate = (d: Date) => `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

export function greeting(d: Date) {
  const h = d.getHours();
  if (h < 5) return 'Hello, night owl';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "2h 10m", "45m" */
export function duration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

/** Distance from now to a task's time: "in 25 min", "now", "40 min late". */
export function relative(diffMinutes: number) {
  const d = Math.round(diffMinutes);
  if (Math.abs(d) < 2) return 'now';
  const span = (n: number) => (n < 60 ? `${n} min` : duration(n));
  return d > 0 ? `in ${span(d)}` : `${span(-d)} late`;
}

export type Bucket = 'morning' | 'afternoon' | 'evening' | 'anytime';

export function bucketOf(time: string | null): Bucket {
  if (!time) return 'anytime';
  const m = minutesOf(time);
  if (m < 12 * 60) return 'morning';
  if (m < 17 * 60) return 'afternoon';
  return 'evening';
}

export const BUCKETS: { key: Bucket; title: string; range: string }[] = [
  { key: 'morning', title: 'Morning', range: 'Before noon' },
  { key: 'afternoon', title: 'Afternoon', range: 'Noon to 5 pm' },
  { key: 'evening', title: 'Evening', range: 'After 5 pm' },
  { key: 'anytime', title: 'Any time', range: 'No set time' },
];

/** Position of a time of day along the sun's path, 0 (sunrise) to 1 (sunset). */
export const dayProgress = (minutes: number) =>
  Math.min(1, Math.max(0, (minutes - DAY_START) / (DAY_END - DAY_START)));
