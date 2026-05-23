import { format, parseISO, differenceInCalendarDays } from 'date-fns';

/**
 * Get the user's local IANA timezone if available; falls back to 'UTC'.
 */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * The current calendar date in YYYY-MM-DD form for a given IANA timezone.
 * Uses Intl to compute the wall-clock date in that zone.
 */
export function todayInTimezone(timeZone: string = detectTimezone()): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(now).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isSameLocalDay(a: string, b: string): boolean {
  return a === b;
}

export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a));
}

export function prettyDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEE, MMM d');
}
