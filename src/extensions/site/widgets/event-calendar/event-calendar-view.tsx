import { useEffect, useId, useRef, useState } from 'react';
import type { PublicEvent } from '../../../../lib/events';
import styles from './event-calendar.module.css';
import { formatEventDates, getEventsForMonth, getMonthRange, shiftMonth } from './calendar';
import { useEvents } from './useEvents';
import EventSubmission from './event-submission';

function DetailIcon({ type }: { type: 'date' | 'city' | 'organizer' | 'contact' }) {
  const icons = {
    date: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    city: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    organizer: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    contact: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  };

  return (
    <svg className={styles.detailIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {icons[type]}
    </svg>
  );
}

function useModalDialog(trigger: HTMLButtonElement | null) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [trigger]);
  return dialogRef;
}

export function EventDialog({ event, onDismiss, trigger }: {
  event: PublicEvent;
  onDismiss: () => void;
  trigger: HTMLButtonElement | null;
}) {
  const dialogRef = useModalDialog(trigger);
  const headingId = useId();

  const formatDateTime = (value: string) => new Date(value).toLocaleString('fi-FI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onDismiss();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
    >
      <div className={styles.dialogHeader}>
        <div className={styles.dialogHeading}>
          {event.picture && (
            <img
              className={styles.dialogFlyer}
              src={event.picture}
              alt={`Tapahtuman ${event.name} juliste`}
              decoding="async"
            />
          )}
          <h2 id={headingId}>{event.name}</h2>
        </div>
        <button type="button" onClick={onDismiss} autoFocus aria-label="Sulje tapahtuman tiedot">Sulje</button>
      </div>
      <section className={styles.infoPanel} aria-label="Tapahtuman perustiedot">
        <h3>Perustiedot</h3>
        <dl className={styles.detailList}>
          <div className={styles.detailRow}>
            <DetailIcon type="date" />
            <div>
              <dt>Aika</dt>
              <dd>{formatDateTime(event.startDate)}{event.endDate && ` – ${formatDateTime(event.endDate)}`}</dd>
            </div>
          </div>
          <div className={styles.detailRow}>
            <DetailIcon type="city" />
            <div>
              <dt>Kaupunki</dt>
              <dd>{event.city ?? 'Kaupunki puuttuu'}</dd>
            </div>
            {event.location && (
              <div className={styles.detailRow}>
                <DetailIcon type="city" />
                <div><dt>Tapahtumapaikka</dt><dd>{event.location}</dd></div>
              </div>
            )}
          </div>
          {event.organizer && (
            <div className={styles.detailRow}>
              <DetailIcon type="organizer" />
              <div><dt>Järjestäjä</dt><dd>{event.organizer}</dd></div>
            </div>
          )}
          {event.contactEmail && (
            <div className={styles.detailRow}>
              <DetailIcon type="contact" />
              <div><dt>Yhteystiedot</dt><dd>{event.contactEmail}</dd></div>
            </div>
          )}
        </dl>
      </section>
      {event.description && (
        <section className={styles.dialogDetails}>
          <h3>Tapahtuman tiedot</h3>
          <div className={styles.description} dangerouslySetInnerHTML={{ __html: event.description }} />
        </section>
      )}
      {event.link && (
        <a className={styles.dialogLink} href={event.link} target="_blank" rel="noopener noreferrer">
          Tapahtuman verkkosivu <span aria-hidden="true">↗</span>
        </a>
      )}
    </dialog>
  );
}

export function SubmissionDialog({ baseApiUrl, onDismiss, trigger }: {
  baseApiUrl: string;
  onDismiss: () => void;
  trigger: HTMLButtonElement | null;
}) {
  const dialogRef = useModalDialog(trigger);
  const headingId = useId();
  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={headingId} onCancel={(event) => {
      event.preventDefault();
      onDismiss();
    }}>
      <div className={styles.dialogHeader}>
        <h2 id={headingId}>Ilmoita tapahtuma</h2>
        <button type="button" onClick={onDismiss} autoFocus aria-label="Sulje ilmoituslomake">Sulje</button>
      </div>
      <EventSubmission baseApiUrl={baseApiUrl} />
    </dialog>
  );
}

function EventCalendarView({ baseApiUrl }: { baseApiUrl: string }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [city, setCity] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
  const [showSubmission, setShowSubmission] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const submissionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const { start, end } = getMonthRange(viewDate);
  const { events, availableCities, total, truncated, loading, error } = useEvents({
    baseApiUrl,
    from: start,
    to: end,
    city,
  });
  const monthEvents = getEventsForMonth(viewDate, events);
  const title = viewDate.toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' });

  return (
    <div className={styles.root} lang="fi">
      <section className={styles.calendar} aria-label="Tapahtumat">
        <div className={styles.actions}>
          <button type="button" className={styles.submitToggle} aria-haspopup="dialog" ref={submissionTriggerRef} onClick={() => setShowSubmission(true)}>
            Ilmoita tapahtuma
          </button>
        </div>
        <div className={styles.filters} role="group" aria-label="Suodata kaupungin mukaan">
          <span className={styles.filterLabel}>Kaupunki</span>
          <button type="button" aria-pressed={city === ''} onClick={() => setCity('')}>
            Kaikki kaupungit {!loading && `(${total})`}
          </button>
          {availableCities.map((item) => (
            <button
              key={item.name}
              type="button"
              aria-pressed={city === item.name}
              onClick={() => setCity(item.name)}
            >
              {item.name} {!loading && `(${item.count})`}
            </button>
          ))}
        </div>

        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <nav className={styles.nav} aria-label="Kuukauden valinta">
            <button type="button" aria-label="Edellinen kuukausi" onClick={() => setViewDate((date) => shiftMonth(date, -1))}>
              &lsaquo;
            </button>
            <button type="button" aria-label="Seuraava kuukausi" onClick={() => setViewDate((date) => shiftMonth(date, 1))}>
              &rsaquo;
            </button>
          </nav>
        </header>

        {loading && <p role="status">Ladataan tapahtumia...</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && truncated && <p>Vain ensimmäiset 500 tapahtumaa näytetään.</p>}
        {!loading && !error && monthEvents.length === 0 && <p>Ei tapahtumia tässä kuussa.</p>}

        {!loading && !error && monthEvents.length > 0 && (
          <div className={styles.eventList}>
            {monthEvents.map((event) => (
              <div className={styles.event} key={event.id}>
                <div className={styles.eventRow}>
                  <time className={styles.eventDate} dateTime={event.startDate}>
                    {formatEventDates(event.startDate, event.endDate)}
                  </time>
                  <span className={styles.eventMain}>
                    {event.picture && (
                      <img
                        className={styles.flyer}
                        src={event.picture}
                        alt={`Tapahtuman ${event.name} juliste`}
                        width="64"
                        height="80"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <button
                      type="button"
                      className={styles.eventName}
                      aria-haspopup="dialog"
                      onClick={(click) => {
                        triggerRef.current = click.currentTarget;
                        setSelectedEvent(event);
                      }}
                    >
                      {event.name}
                    </button>
                  </span>
                  <span className={styles.eventCity}>{event.city ?? 'Kaupunki puuttuu'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {selectedEvent && (
        <EventDialog event={selectedEvent} trigger={triggerRef.current} onDismiss={() => setSelectedEvent(null)} />
      )}
      {showSubmission && (
        <SubmissionDialog baseApiUrl={baseApiUrl} trigger={submissionTriggerRef.current} onDismiss={() => setShowSubmission(false)} />
      )}
    </div>
  );
}

export default EventCalendarView;
