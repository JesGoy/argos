import { DEFAULT_LOCALE } from '@/config/money';

/**
 * Organization-aware date/time formatting. Pass the org's IANA `timezone`
 * (e.g. 'America/Santiago') so a timestamp renders on the business's clock
 * rather than the server's UTC — a sale at 23:00 local should not show as the
 * next day. Falls back to the runtime's zone when `timezone` is undefined.
 */
export function formatDate(
  date: Date | string,
  timezone?: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(
  date: Date | string,
  timezone?: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatTime(
  date: Date | string,
  timezone?: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
