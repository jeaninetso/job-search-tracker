import { formatISO } from 'date-fns';

export const todayKey = (): string => formatISO(new Date(), { representation: 'date' });

/** Normalizes a Date or ISO timestamp string down to its YYYY-MM-DD date key. */
export const dateKey = (d: Date | string): string =>
  typeof d === 'string' ? d.slice(0, 10) : formatISO(d, { representation: 'date' });
