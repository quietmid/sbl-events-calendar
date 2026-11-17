import { DateTime } from 'luxon';
import sanitizeHtml from 'sanitize-html';
import { municipalityName } from './municipalities';

const ZONE = 'Europe/Helsinki';
const MAX_DESCRIPTION = 5000;

export class SubmissionError extends Error {}

function text(value: unknown, label: string, max: number, required = false): string | null {
  if (value == null || value === '') {
    if (required) throw new SubmissionError(`${label} puuttuu.`);
    return null;
  }
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) {
    throw new SubmissionError(`${label} ei ole kelvollinen.`);
  }
  return value.trim();
}

function dateTime(value: unknown, label: string): DateTime {
  const input = text(value, label, 16, true);
  if (!input || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(input)) throw new SubmissionError(`${label} ei ole kelvollinen.`);
  const parsed = DateTime.fromISO(input, { zone: ZONE });
  if (!parsed.isValid || parsed.toFormat("yyyy-MM-dd'T'HH:mm") !== input) throw new SubmissionError(`${label} ei ole kelvollinen.`);
  return parsed;
}

export function validateSubmission(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SubmissionError('Ilmoitus ei ole kelvollinen.');
  const data = Object.fromEntries(Object.entries(value));
  const name = text(data.name, 'Tapahtuman nimi', 150, true);
  const city = municipalityName(data.city);
  if (!city) throw new SubmissionError('Valitse kelvollinen suomalainen kunta.');
  const start = dateTime(data.startDate, 'Alkuaika');
  const end = dateTime(data.endDate, 'Päättymisaika');
  if (end <= start || end > start.plus({ days: 7 })) throw new SubmissionError('Päättymisajan on oltava alkuaikaa myöhemmin, enintään viikon päässä.');
  const organizer = text(data.organizer, 'Järjestäjä', 150, true);
  const link = text(data.link, 'Verkkosivu', 2048);
  const location = text(data.location, 'Tapahtumapaikka', 250);
  if (link) {
    try {
      if (new URL(link).protocol !== 'https:') throw new Error('Invalid URL');
    } catch {
      throw new SubmissionError('Anna kelvollinen HTTPS-verkkosivu.');
    }
  }
  const contact = text(data.contactEmail, 'Yhteystieto', 254, true);
  if (!contact) throw new SubmissionError('Anna sähköpostiosoite tai Instagram-käyttäjätunnus.');
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const isInstagram = /^@?[a-zA-Z0-9._]{1,30}$/.test(contact);
  if (!isEmail && !isInstagram) throw new SubmissionError('Anna kelvollinen sähköpostiosoite tai Instagram-käyttäjätunnus.');
  const publicContact = isEmail ? contact : `@${contact.replace(/^@/, '')}`;
  if (data.publicationConsent !== true) throw new SubmissionError('Hyväksy tapahtuman tietojen julkaiseminen.');
  const description = text(data.description, 'Kuvaus', MAX_DESCRIPTION);
  const untilText = text(data.repeatUntil, 'Toiston päättymispäivä', 10);
  let repeatUntil: Date | null = null;
  if (untilText) {
    const until = DateTime.fromISO(untilText, { zone: ZONE }).endOf('day');
    if (!/^\d{4}-\d\d-\d\d$/.test(untilText) || !until.isValid ||
        until < start || until > start.plus({ years: 1 }).endOf('day')) {
      throw new SubmissionError('Toiston päättymispäivän on oltava enintään vuoden päässä.');
    }
    repeatUntil = until.toJSDate();
  }
  return {
    name, city, startDate: start.toJSDate(), endDate: end.toJSDate(), repeatUntil,
    link, location, organizer, contactEmail: publicContact,
    description: description ? sanitizeHtml(description, { allowedTags: [], allowedAttributes: {} }) : null,
    status: 'pending',
  };
}
