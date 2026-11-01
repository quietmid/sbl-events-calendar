import { useState } from 'react';
import type { PublicEvent } from '../../../../lib/events';
import styles from './event-calendar.module.css';
import { useEvents } from './useEvents';

const LOCALE = 'en-US';

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}

function EventCalendarView({ baseApiUrl }: { baseApiUrl: string }) {
  const [viewDate, setViewDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const visibleStart = new Date(year, month, 1 - offset);
  const visibleEndExclusive = new Date(visibleStart);
  visibleEndExclusive.setDate(visibleEndExclusive.getDate() + totalCells);
  const { events, loading, error } = useEvents({
    baseApiUrl,
    from: visibleStart,
    to: visibleEndExclusive,
    categories: [],
    countries: [],
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const title = viewDate.toLocaleDateString(LOCALE, {
    month: 'long',
    year: 'numeric',
  });
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Date(2024, 0, 1 + index).toLocaleDateString(LOCALE, { weekday: 'short' })
  );
  const eventsByDay = events.reduce<Record<string, PublicEvent[]>>(
    (grouped, event) => {
      const start = new Date(event.startDate);
      const end = event.endDate ? new Date(event.endDate) : start;
      const currentDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

      while (currentDay <= lastDay) {
        const key = dayKey(currentDay);
        (grouped[key] ??= []).push(event);
        currentDay.setDate(currentDay.getDate() + 1);
      }

      return grouped;
    },
    {}
  );

  const selectedEvent = events.find((event) => event.id === selectedId);

  function changeMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
    setSelectedId(null);
  }

  return (
    <div className={styles.root}>
      <section className={styles.calendar} aria-label="Event calendar">
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <nav className={styles.nav} aria-label="Calendar navigation">
            <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>
              &lsaquo;
            </button>
            <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}>
              &rsaquo;
            </button>
          </nav>
        </header>

        {loading && <p role="status">Loading events...</p>}
        {error && <p role="alert">{error}</p>}

        <div className={styles.grid}>
          {weekdays.map((weekday) => (
            <div className={styles.weekday} key={weekday}>
              {weekday}
            </div>
          ))}

          {Array.from({ length: totalCells }, (_, index) => {
            const date = new Date(year, month, 1 - offset + index);
            const dateEvents = [...(eventsByDay[dayKey(date)] ?? [])].sort(
              (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
            );
            const moreEvent = dateEvents[2];
            const classes = [
              styles.day,
              date.getMonth() !== month ? styles.otherMonth : '',
              date < today ? styles.past : '',
              date.getTime() === today.getTime() ? styles.today : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div className={classes} key={dayKey(date)}>
                <span className={styles.num}>{date.getDate()}</span>
                {dateEvents.slice(0, 2).map((event) => (
                  <button
                    className={styles.chip}
                    data-event-id={event.id}
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedId(event.id)}
                  >
                    <span className={styles.chipTime}>{formatTime(new Date(event.startDate))}</span>
                    <span>{event.name}</span>
                  </button>
                ))}
                {moreEvent && dateEvents.length > 2 && (
                  <button
                    className={styles.more}
                    data-event-id={moreEvent.id}
                    type="button"
                    onClick={() => setSelectedId(moreEvent.id)}
                  >
                    +{dateEvents.length - 2}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {selectedEvent && (
          <section className={styles.details} aria-label="Event details">
            <button
              className={styles.close}
              type="button"
              aria-label="Close event details"
              onClick={() => setSelectedId(null)}
            >
              &times;
            </button>
            <h3>{selectedEvent.name}</h3>
            <p className={styles.meta}>
              {new Date(selectedEvent.startDate).toLocaleDateString(LOCALE, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              {' '}{formatTime(new Date(selectedEvent.startDate))}
              <br />
              {selectedEvent.category} · {selectedEvent.country}
            </p>
            <p>{selectedEvent.description}</p>
          </section>
        )}
      </section>
    </div>
  );
}

export default EventCalendarView;
