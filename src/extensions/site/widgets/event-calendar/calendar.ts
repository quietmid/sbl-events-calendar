import type { PublicEvent } from '../../../../lib/events';

export function getMonthRange(date: Date) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
  };
}

export function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function getEventsForMonth(date: Date, events: PublicEvent[]) {
  const { start, end } = getMonthRange(date);
  return events.filter((event) => {
    const eventStart = new Date(event.startDate);
    const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
    return eventStart < end && eventEnd >= start;
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export function formatEventDates(startDate: string, endDate: string | null): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  const startLabel = `${start.getDate()}.${start.getMonth() + 1}.`;
  if (start.toDateString() === end.toDateString()) return startLabel;
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}.–${end.getDate()}.${end.getMonth() + 1}.`;
  }
  const endLabel = `${end.getDate()}.${end.getMonth() + 1}.`;
  return start.getFullYear() === end.getFullYear()
    ? `${startLabel}–${endLabel}`
    : `${startLabel}${start.getFullYear()}–${endLabel}${end.getFullYear()}`;
}
