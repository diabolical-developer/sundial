import { addDays, dayLabel, formatTime, keyOf, toTime } from './time';
import type { Priority } from './types';

export interface ParsedToken {
  kind: 'date' | 'time' | 'priority';
  label: string;
}

export interface Parsed {
  title: string;
  /** undefined = not mentioned; null = "someday" */
  date?: string | null;
  time?: string;
  priority?: Priority;
  tokens: ParsedToken[];
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_ABBR: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6,
};

/** Turns "12" + "pm" into minutes after midnight. Bare hours 1–7 read as afternoon/evening. */
function toMinutes(hour: number, minute: number, meridiem?: string, bare = false): number | null {
  if (minute > 59) return null;
  let h = hour;
  const mer = meridiem?.replace(/\./g, '').toLowerCase();
  if (mer === 'am' || mer === 'pm') {
    if (h < 1 || h > 12) return null;
    if (mer === 'am') h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
  } else {
    if (h > 23) return null;
    if (bare && h >= 1 && h <= 7) h += 12;
  }
  return h * 60 + minute;
}

/**
 * Reads dates, times and priority out of a quick-add sentence:
 * "Call mom tomorrow at 6pm !" → title "Call mom", tomorrow, 18:00, high priority.
 */
export function parseQuickAdd(input: string, now = new Date()): Parsed {
  const today = keyOf(now);
  let text = ` ${input} `;
  const result: Parsed = { title: '', tokens: [] };

  const take = (re: RegExp, fn: (m: RegExpMatchArray) => boolean) => {
    const m = text.match(re);
    if (!m || m.index === undefined) return false;
    if (!fn(m)) return false;
    text = `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}`;
    return true;
  };

  // Priority
  take(/\s(!{1,3}|!high|!low|urgent|important)(?=\s)/i, (m) => {
    const p: Priority = m[1].toLowerCase() === '!low' ? 'low' : 'high';
    result.priority = p;
    result.tokens.push({ kind: 'priority', label: p === 'high' ? 'High priority' : 'Low priority' });
    return true;
  });

  // Dates
  let tonight = false;
  const setDate = (key: string | null) => {
    result.date = key;
    result.tokens.push({ kind: 'date', label: key ? dayLabel(key, today) : 'Someday' });
    return true;
  };
  const dateFound =
    take(/\b(?:on\s+)?day after tomorrow\b/i, () => setDate(addDays(today, 2))) ||
    take(/\b(today|tonight|tomorrow|tmrw|tmr)\b/i, (m) => {
      const w = m[1].toLowerCase();
      if (w === 'tonight') tonight = true;
      return setDate(w === 'today' || w === 'tonight' ? today : addDays(today, 1));
    }) ||
    take(/\bnext week\b/i, () => setDate(addDays(today, 7))) ||
    take(/\bin (\d{1,2}) days?\b/i, (m) => setDate(addDays(today, Number(m[1])))) ||
    take(/\b(?:this\s+|on\s+the\s+)?weekend\b/i, () => {
      const dow = now.getDay();
      return setDate(addDays(today, dow === 6 ? 0 : dow === 0 ? 0 : 6 - dow));
    }) ||
    take(new RegExp(`\\b(?:(?:on|next|this)\\s+)?(${DAY_NAMES.join('|')})\\b`, 'i'), (m) => {
      const target = DAY_NAMES.indexOf(m[1].toLowerCase());
      const delta = (target - now.getDay() + 7) % 7 || 7;
      return setDate(addDays(today, delta));
    }) ||
    take(/\b(?:on|next|this)\s+(sun|mon|tues|tue|wed|thurs|thur|thu|fri|sat)\b/i, (m) => {
      const target = DAY_ABBR[m[1].toLowerCase()];
      const delta = (target - now.getDay() + 7) % 7 || 7;
      return setDate(addDays(today, delta));
    }) ||
    take(/\b(someday|sometime)\b/i, () => setDate(null));
  void dateFound;

  // Times
  const setTime = (minutes: number | null) => {
    if (minutes === null) return false;
    result.time = toTime(minutes);
    result.tokens.push({ kind: 'time', label: formatTime(result.time) });
    return true;
  };
  const timeFound =
    take(/\bin (\d{1,3}) ?(?:min|mins|minutes)\b/i, (m) => {
      const t = Math.ceil((now.getHours() * 60 + now.getMinutes() + Number(m[1])) / 5) * 5;
      if (t >= 1440) return false;
      if (result.date === undefined) setDate(today);
      return setTime(t);
    }) ||
    take(/\bin (\d{1,2}) ?(?:h|hr|hrs|hour|hours)\b/i, (m) => {
      const t = Math.ceil((now.getHours() * 60 + now.getMinutes() + Number(m[1]) * 60) / 5) * 5;
      if (t >= 1440) return false;
      if (result.date === undefined) setDate(today);
      return setTime(t);
    }) ||
    take(/(?:\bat\s+|@\s*|\b)(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?(?=\s|[,.!?])/i, (m) =>
      setTime(toMinutes(Number(m[1]), Number(m[2]), m[3], !m[3] && !m[1].startsWith('0'))),
    ) ||
    take(/(?:\bat\s+|@\s*|\b)(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)(?=\s|[,.!?])/i, (m) =>
      setTime(toMinutes(Number(m[1]), 0, m[2])),
    ) ||
    take(/(?:\bat|@)\s*(\d{1,2})(?=\s|[,.!?])(?!\s*(?:min|mins|minutes|h|hr|hrs|hours?|days?|%))/i, (m) =>
      setTime(toMinutes(Number(m[1]), 0, undefined, true)),
    ) ||
    take(/\b(?:at\s+)?(noon|midday)\b/i, () => setTime(12 * 60)) ||
    take(/\b(?:in the |this )?(morning|afternoon|evening)\b/i, (m) =>
      setTime({ morning: 9, afternoon: 14, evening: 18 }[m[1].toLowerCase() as 'morning'] * 60),
    );
  if (!timeFound && tonight) setTime(20 * 60);

  result.title = text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:(?:at|on|by|for|due|,|-)\s+)+/i, '')
    .replace(/(?:\s+(?:at|on|by|for|due|,|-))+$/i, '')
    .replace(/[\s,-]+$/, '')
    .trim();

  // Keep tokens in a predictable reading order.
  const order = { date: 0, time: 1, priority: 2 } as const;
  result.tokens.sort((a, b) => order[a.kind] - order[b.kind]);
  return result;
}
