import { httpClient } from '@wix/essentials';
import { useState, type FormEvent } from 'react';
import municipalities from '../../../../lib/finnish-municipalities-2026.json';
import styles from './event-calendar.module.css';

export default function EventSubmission({ baseApiUrl }: { baseApiUrl: string }) {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [repeat, setRepeat] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setError('');
    setMessage('');
    setSending(true);
    try {
      const response = await httpClient.fetchWithAuth(`${baseApiUrl}/api/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.get('name'), startDate: values.get('startDate'), endDate: values.get('endDate'),
          city: values.get('city'), link: values.get('link'), location: values.get('location'), organizer: values.get('organizer'),
          contactEmail: values.get('contactEmail'), publicationConsent: values.has('publicationConsent'),
          description: values.get('description'), repeatUntil: repeat ? values.get('repeatUntil') : null,
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
          ? result.error : 'Lähettäminen ei onnistunut.');
      }
      form.reset();
      setRepeat(false);
      setMessage('Tapahtuma lähetettiin tarkistettavaksi.');
    } catch (failure) {
      console.error('Event submission failed', failure);
      setError(failure instanceof Error ? failure.message : 'Lähettäminen ei onnistunut.');
    } finally {
      setSending(false);
    }
  }

  return (
    <form className={styles.submission} onSubmit={submit}>
      <p>Tapahtuma tarkistetaan ennen julkaisua. Lähetetyt tiedot julkaistaan hyväksytyn tapahtuman yhteydessä. Ajat ilmoitetaan Suomen ajassa.</p>
      <label>Tapahtuman nimi <input name="name" maxLength={150} required /></label>
      <label>Alkuaika <input name="startDate" type="datetime-local" required /></label>
      <label>Päättymisaika <input name="endDate" type="datetime-local" required /></label>
      <label>Kaupunki tai kunta <select name="city" required defaultValue=""><option value="" disabled>Valitse kunta</option>{municipalities.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
      <label>Tapahtumapaikka (valinnainen) <input name="location" maxLength={250} /></label>
      <label>Tapahtuman HTTPS-verkkosivu (valinnainen) <input name="link" type="url" maxLength={2048} /></label>
      <label>Järjestäjä <input name="organizer" maxLength={150} required /></label>
      <label>Julkinen sähköpostiosoite tai Instagram-käyttäjätunnus <input name="contactEmail" type="text" maxLength={254} required /></label>
      <label><input name="publicationConsent" type="checkbox" required /> Hyväksyn tapahtuman tietojen ja yhteystiedon julkaisemisen.</label>
      <label>Kuvaus (valinnainen) <textarea name="description" maxLength={5000} rows={5} /></label>
      <label><input type="checkbox" checked={repeat} onChange={(event) => setRepeat(event.target.checked)} /> Toista viikoittain</label>
      {repeat && <label>Toiston viimeinen päivä <input name="repeatUntil" type="date" required /></label>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button className={styles.submitToggle} type="submit" disabled={sending}>Lähetä tarkistettavaksi</button>
    </form>
  );
}
