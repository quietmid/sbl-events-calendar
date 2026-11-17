import { DateTime } from 'luxon';
import type { PublicEvent } from './events';

const HELSINKI = 'Europe/Helsinki';
const MAX_WEEKS = 54;

export function weeklyOccurrences(event: PublicEvent, repeatUntil: unknown, cancelledDates: unknown, range: { from: Date; to: Date }): PublicEvent[] {
  if (repeatUntil == null || repeatUntil === '') return [event];
  const until = DateTime.fromJSDate(new Date(String(repeatUntil)), { zone: HELSINKI });
  const first = DateTime.fromISO(event.startDate, { zone: HELSINKI });
  const firstEnd = event.endDate ? DateTime.fromISO(event.endDate, { zone: HELSINKI }) : null;
  if (!until.isValid || !first.isValid || (firstEnd && !firstEnd.isValid) ||
      until < first || until > first.plus({ weeks: MAX_WEEKS }) ||
      (firstEnd && (firstEnd < first || firstEnd > first.plus({ days: 7 })))) {
    throw new Error(`Invalid recurrence for event ${event.id}`);
  }
  const cancelled = new Set(typeof cancelledDates === 'string'
    ? cancelledDates.split(',').map((date) => date.trim())
    : []);
  const occurrences: PublicEvent[] = [];
  for (let week = 0; week < MAX_WEEKS; week += 1) {
    const start = first.plus({ weeks: week });
    if (start > until || start.toMillis() >= range.to.getTime()) break;
    const end = firstEnd?.plus({ weeks: week });
    if ((end ?? start).toMillis() < range.from.getTime() || cancelled.has(start.toISODate() ?? '')) continue;
    const startDate = start.toUTC().toISO();
    const endDate = end?.toUTC().toISO() ?? null;
    if (!startDate) throw new Error(`Invalid occurrence for event ${event.id}`);
    occurrences.push({ ...event, id: `${event.id}:${startDate}`, startDate, endDate });
  }
  return occurrences;
}
