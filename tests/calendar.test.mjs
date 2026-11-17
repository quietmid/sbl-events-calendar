import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatEventDates,
  getMonthRange,
  getEventsForMonth,
  shiftMonth,
} from '../src/extensions/site/widgets/event-calendar/calendar.ts';

function localDate(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

function event(id, start, end = null) {
  return { id, startDate: new Date(start).toISOString(), endDate: end ? new Date(end).toISOString() : null };
}

test('month range and navigation follow local month and year boundaries', () => {
  const { start, end } = getMonthRange(new Date(2026, 11, 15));
  assert.deepEqual(localDate(start), [2026, 12, 1]);
  assert.deepEqual(localDate(end), [2027, 1, 1]);
  assert.deepEqual(localDate(shiftMonth(new Date(2026, 0, 31), 1)), [2026, 2, 1]);
  assert.deepEqual(localDate(shiftMonth(new Date(2027, 0, 1), -1)), [2026, 12, 1]);
});

test('overlapping events are sorted by start date and listed once', () => {
  const events = [
    event('second-week', '2026-12-07T10:00:00'),
    event('weekend', '2026-12-04T10:00:00', '2026-12-08T19:00:00'),
    event('first-day', '2026-12-01T10:00:00'),
    event('earlier-month', '2026-11-30T10:00:00', '2026-12-02T10:00:00'),
    event('outside', '2027-01-01T10:00:00'),
  ];
  const monthEvents = getEventsForMonth(new Date(2026, 11, 15), events);
  assert.deepEqual(monthEvents.map(({ id }) => id), ['earlier-month', 'first-day', 'weekend', 'second-week']);
});

test('events spanning months appear once in each overlapping month', () => {
  const longEvent = event('long', '2026-12-30T10:00:00', '2027-01-04T19:00:00');
  assert.deepEqual(getEventsForMonth(new Date(2026, 11, 1), [longEvent]), [longEvent]);
  assert.deepEqual(getEventsForMonth(new Date(2027, 0, 1), [longEvent]), [longEvent]);
});

test('date labels show single days and multi-day ranges', () => {
  assert.equal(formatEventDates('2026-12-01T10:00:00', null), '1.12.');
  assert.equal(formatEventDates('2026-12-04T10:00:00', '2026-12-06T19:00:00'), '4.–6.12.');
  assert.equal(formatEventDates('2026-12-30T10:00:00', '2027-01-02T19:00:00'), '30.12.2026–2.1.2027');
});
