/** Your planning day, drawn as the sun's path in the sky. */
export const DAY_START = 6 * 60;
export const DAY_END = 22 * 60;
/**
 * The calendar day turns over at 4 am, not midnight, so a night owl's 1 am task still belongs to
 * "tonight": it shows under today, sorts after 11 pm, and isn't late at 12:05.
 */
export const ROLLOVER = 4 * 60;
/** Length of the night, drawn as the moon's path (10 pm → 6 am). */
export const NIGHT_LENGTH = 24 * 60 - (DAY_END - DAY_START);

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');

export const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The planning day a moment belongs to: before 4 am still counts as the day before. */
export const dayKeyOf = (d: Date) => keyOf(new Date(d.getTime() - ROLLOVER * 60_000));

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

/** Minutes into the planning day: 4 am is 240, 11 pm is 1380, 1 am is 1500. */
export const dayMinutes = (minutes: number) => (minutes < ROLLOVER ? minutes + 24 * 60 : minutes);

/** A task's time on the planning-day clock, comparable with `nowMinutes`. */
export const taskMinutes = (time: string) => dayMinutes(minutesOf(time));

export const nowMinutes = (d: Date) => dayMinutes(d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60);

/** True between 10 pm and 6 am (on the planning-day clock). */
export const isNight = (dayMin: number) => dayMin >= DAY_END || dayMin < DAY_START;

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

/** "Good morning, Sid". After 9 pm it's a night greeting (two of them, alternating by day). */
export function greeting(d: Date, name = '') {
  const h = d.getHours();
  const you = name ? `, ${name}` : '';
  if (h >= 21 || h < 4) {
    return d.getDate() % 2 === 0 ? (name ? `Night owl mode${you}` : 'Hello, night owl') : `Still up${you}?`;
  }
  if (h < 6) return name ? `Up early${you}` : 'Up before the sun';
  if (h < 12) return `Good morning${you}`;
  if (h < 17) return `Good afternoon${you}`;
  return `Good evening${you}`;
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

export type Bucket = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';

export function bucketOf(time: string | null): Bucket {
  if (!time) return 'anytime';
  const m = taskMinutes(time);
  if (m < 12 * 60) return 'morning';
  if (m < 17 * 60) return 'afternoon';
  if (m < DAY_END) return 'evening';
  return 'night';
}

export const BUCKETS: { key: Bucket; title: string; range: string }[] = [
  { key: 'morning', title: 'Morning', range: 'Before noon' },
  { key: 'afternoon', title: 'Afternoon', range: 'Noon to 5 pm' },
  { key: 'evening', title: 'Evening', range: '5 to 10 pm' },
  { key: 'night', title: 'Late night', range: 'After 10 pm' },
  { key: 'anytime', title: 'Any time', range: 'No set time' },
];

/** Position of a time of day along the sun's path, 0 (sunrise) to 1 (sunset). */
export const dayProgress = (minutes: number) =>
  Math.min(1, Math.max(0, (minutes - DAY_START) / (DAY_END - DAY_START)));

/** Position of a time of night along the moon's path, 0 (10 pm) to 1 (6 am). Takes planning-day minutes. */
export const nightProgress = (minutes: number) =>
  Math.min(1, Math.max(0, (((minutes - DAY_END) % 1440) + 1440) % 1440 / NIGHT_LENGTH));
