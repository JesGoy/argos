/**
 * Calendar-month period helpers for billing.
 *
 * We avoid adding a date library: the billing period is always the calendar
 * month containing `now`, computed in UTC so that all organizations share an
 * unambiguous boundary regardless of their `Organization.timezone` (which is
 * a display preference, not a billing concern).
 */

export interface PeriodBounds {
  start: Date;
  end: Date;
}

export function calendarMonthBoundsUtc(now: Date): PeriodBounds {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  // End-of-month at 23:59:59.999 UTC of the last day of the same calendar month.
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - 1);
  return { start, end };
}
