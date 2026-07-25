import { formatISO, parseISO } from 'date-fns';

export const todayKey = (): string => formatISO(new Date(), { representation: 'date' });

/** Normalizes a Date or ISO timestamp string down to its YYYY-MM-DD date key. */
export const dateKey = (d: Date | string): string =>
  typeof d === 'string' ? d.slice(0, 10) : formatISO(d, { representation: 'date' });

/** 0=Sunday..6=Saturday for a YYYY-MM-DD date key, in local time (not UTC). */
export const weekdayOf = (dayKey: string): number => parseISO(dayKey).getDay();

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
