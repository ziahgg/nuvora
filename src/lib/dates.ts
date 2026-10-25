import { differenceInCalendarDays, format, isSameDay } from 'date-fns';

/** "Thu 22 Oct" */
export const fmtDay = (d: Date | string) => format(new Date(d), 'EEE d MMM');
/** "22 Oct" */
export const fmtShort = (d: Date | string) => format(new Date(d), 'd MMM');
/** "10:42" */
export const fmtTime = (d: Date | string) => format(new Date(d), 'HH:mm');
/** "Wed 21 Oct, 16:20" */
export const fmtDayTime = (d: Date | string) => format(new Date(d), 'EEE d MMM, HH:mm');
/** "Thu 22 Oct 2026, 10:42" */
export const fmtFull = (d: Date | string) => format(new Date(d), 'EEE d MMM yyyy, HH:mm');
/** "October 2026" */
export const fmtMonth = (d: Date | string) => format(new Date(d), 'MMMM yyyy');
/** "Mar 2025" */
export const fmtMonthShort = (d: Date | string) => format(new Date(d), 'MMM yyyy');

/** "Today", "Yesterday", "Tomorrow" or "Thu 22 Oct". */
export function relativeDay(d: Date | string, now = new Date()): string {
  const diff = differenceInCalendarDays(new Date(d), now);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return fmtDay(d);
}

/** "today", "Fri 23 Oct" — used inside sentences. */
export function relativeDayLower(d: Date | string, now = new Date()): string {
  const r = relativeDay(d, now);
  return r === 'Today' || r === 'Yesterday' || r === 'Tomorrow' ? r.toLowerCase() : r;
}

/** "Today, 10:42" or "18 Oct, 17:30" */
export function relativeDayTime(d: Date | string, now = new Date()): string {
  const r = relativeDay(d, now);
  return r === 'Today' || r === 'Yesterday' ? `${r}, ${fmtTime(d)}` : `${fmtShort(d)}, ${fmtTime(d)}`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning!';
  if (h < 18) return 'Good afternoon!';
  return 'Good evening!';
}

export { isSameDay, differenceInCalendarDays };

/** Combine a calendar day with an "HH:mm" time. */
export function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}
