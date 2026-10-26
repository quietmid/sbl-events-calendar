import { useState } from 'react';
import styles from './event-calendar.module.css';

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  location: string;
  description: string;
};

const LOCALE = 'en-US';
const now = new Date();
const SAMPLE_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: 'Breaking Jam',
    date: new Date(now.getFullYear(), now.getMonth(), 10, 18, 0),
    location: 'Helsinki',
    description: 'Open jam for all levels.',
  },
  {
    id: '2',
    title: 'Beginner Workshop',
    date: new Date(now.getFullYear(), now.getMonth(), 10, 20, 0),
    location: 'Vantaa',
    description: 'Basic toprock and footwork.',
  },
  {
    id: '3',
    title: 'Battle Qualifiers',
    date: new Date(now.getFullYear(), now.getMonth(), 24, 12, 0),
    location: 'Tampere',
    description: 'Qualifier round for the national battle.',
  },
];

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}

function EventCalendarView() {
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const title = viewDate.toLocaleDateString(LOCALE, {
    month: 'long',
    year: 'numeric',
  });
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Date(2024, 0, 1 + index).toLocaleDateString(LOCALE, { weekday: 'short' })
  );
  const eventsByDay = SAMPLE_EVENTS.reduce<Record<string, CalendarEvent[]>>(
    (grouped, event) => {
      const key = dayKey(event.date);
      (grouped[key] ??= []).push(event);
      return grouped;
    },
    {}
  );

  const selectedEvent = SAMPLE_EVENTS.find((event) => event.id === selectedId);

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

        <div className={styles.grid}>
          {weekdays.map((weekday) => (
            <div className={styles.weekday} key={weekday}>
              {weekday}
            </div>
          ))}

          {Array.from({ length: totalCells }, (_, index) => {
            const date = new Date(year, month, 1 - offset + index);
            const dateEvents = [...(eventsByDay[dayKey(date)] ?? [])].sort(
              (a, b) => a.date.getTime() - b.date.getTime()
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
                    <span className={styles.chipTime}>{formatTime(event.date)}</span>
                    <span>{event.title}</span>
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
            <h3>{selectedEvent.title}</h3>
            <p className={styles.meta}>
              {selectedEvent.date.toLocaleDateString(LOCALE, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              {' '}{formatTime(selectedEvent.date)}
              <br />
              {selectedEvent.location}
            </p>
            <p>{selectedEvent.description}</p>
          </section>
        )}
      </section>
    </div>
  );
}

export default EventCalendarView;
