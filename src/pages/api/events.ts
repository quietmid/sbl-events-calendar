import { auth } from '@wix/essentials';
import { items } from '@wix/data';
import { media } from '@wix/sdk';
import type { APIRoute } from 'astro';
import sanitizeHtml from 'sanitize-html';
import { countryCode } from '../../lib/countries';
import { municipalityName } from '../../lib/municipalities';
import { weeklyOccurrences } from '../../lib/recurrence';
import { SubmissionError, validateSubmission } from '../../lib/submission';
import { reserveSubmission } from '../../lib/submission-limit';
import {
  EVENTS_COLLECTION_ID,
  type CityOption,
  type PublicEvent,
} from '../../lib/events';

export const prerender = false;

const MAX_RANGE_MS = 400 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 500;
const PAGE_SIZE = 100;
const MAX_SUBMISSION_BYTES = 16_384;

async function readSubmission(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new SubmissionError('Ilmoitus puuttuu.');
  const decoder = new TextDecoder();
  let content = '';
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_SUBMISSION_BYTES) throw new SubmissionError('Ilmoitus on liian suuri.');
    content += decoder.decode(value, { stream: true });
  }
  try {
    return JSON.parse(content + decoder.decode());
  } catch {
    throw new SubmissionError('Ilmoitus ei ole kelvollinen.');
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await readSubmission(request);
    const submission = validateSubmission(body);
    if (!await reserveSubmission(submission.contactEmail)) {
      return Response.json({ error: 'Voit lähettää enintään viisi ilmoitusta tunnissa tällä yhteystiedolla.' }, { status: 429 });
    }
    await auth.elevate(items.insert)(EVENTS_COLLECTION_ID, submission);
    return Response.json({ message: 'Tapahtuma lähetettiin tarkistettavaksi.' }, { status: 201 });
  } catch (error) {
    if (error instanceof SubmissionError) return Response.json({ error: error.message }, { status: 400 });
    console.error('Event submission failed', error);
    return Response.json({ error: 'Tapahtuman lähettäminen ei onnistunut.' }, { status: 503 });
  }
};

type EventRecord = {
  _id?: unknown;
  name?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  repeatUntil?: unknown;
  cancelledDates?: unknown;
  country?: unknown;
  city?: unknown;
  organizer?: unknown;
  location?: unknown;
  contactEmail?: unknown;
  description?: unknown;
  link?: unknown;
  picture?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseIsoDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}\.\d{3}Z)?$/.test(value)) {
    return null;
  }

  const fullValue = value.length === 10 ? `${value}T00:00:00.000Z` : value;
  const date = new Date(fullValue);
  return Number.isNaN(date.getTime()) || date.toISOString() !== fullValue
    ? null
    : date;
}

function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Event is missing a valid ${fieldName}`);
  }

  return value;
}

function toIsoDateTime(value: unknown, fieldName: string): string {
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new Error(`Event is missing a valid ${fieldName}`);
  }

  return date.toISOString();
}

function toOptionalIsoDateTime(value: unknown): string | null {
  return value === null || value === undefined || value === ''
    ? null
    : toIsoDateTime(value, 'endDate');
}

function toHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function toBrowserImageUrl(value: unknown): string | null {
  let source: string | undefined;

  if (typeof value === 'string') {
    source = value;
  } else if (isRecord(value)) {
    const image = value;
    source = typeof image.uri === 'string' ? image.uri : typeof image.url === 'string' ? image.url : undefined;
  }

  if (!source) {
    return null;
  }

  const url = source.startsWith('wix:image://') ? media.getImageUrl(source).url : source;
  return toHttpsUrl(url);
}

function sanitizeDescription(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new Error('Event is missing a valid description');
  }

  return sanitizeHtml(value, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['https', 'mailto'],
    allowProtocolRelative: false,
  });
}

function toPublicEvent(item: EventRecord): PublicEvent {
  return {
    id: requiredString(item._id, 'id'),
    name: requiredString(item.name, 'name'),
    startDate: toIsoDateTime(item.startDate, 'startDate'),
    endDate: toOptionalIsoDateTime(item.endDate),
    city: municipalityName(item.city),
    organizer: typeof item.organizer === 'string' && item.organizer.trim() ? item.organizer.trim() : null,
    location: typeof item.location === 'string' && item.location.trim() ? item.location.trim() : null,
    contactEmail: item.contactEmail == null || item.contactEmail === ''
      ? null
      : requiredString(item.contactEmail, 'contactEmail'),
    description: sanitizeDescription(item.description),
    link: toHttpsUrl(item.link),
    picture: toBrowserImageUrl(item.picture),
  };
}

function isFinnishEvent(item: EventRecord): boolean {
  if (typeof item.country === 'string' && item.country.trim()) {
    const country = item.country.trim();
    return country.toLocaleLowerCase('fi-FI') === 'suomi' || countryCode(country) === 'FI';
  }
  return municipalityName(item.city) !== null;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.has('category') || url.searchParams.has('country')) {
    return Response.json({ error: 'Luokka- ja maasuodattimia ei enää tueta.' }, { status: 400 });
  }

  const from = parseIsoDate(url.searchParams.get('from'));
  const to = parseIsoDate(url.searchParams.get('to'));

  if (!from || !to || to <= from || to.getTime() - from.getTime() > MAX_RANGE_MS) {
    return Response.json(
      { error: 'Anna kelvollinen ajanjakso (enintään 400 päivää).' },
      { status: 400 }
    );
  }

  const cityParam = url.searchParams.get('city');
  const requestedCity = cityParam === null ? null : municipalityName(cityParam);
  if (cityParam !== null && !requestedCity) {
    return Response.json({ error: 'Anna kelvollinen suomalainen kunta.' }, { status: 400 });
  }

  try {
    const elevatedQuery = auth.elevate(items.query);
    let approved = await elevatedQuery(EVENTS_COLLECTION_ID)
      .eq('status', 'approved')
      .limit(PAGE_SIZE)
      .fields('country', 'city')
      .find();
    const cityOptions = new Map<string, CityOption>();
    do {
      for (const item of approved.items) {
        if (!isFinnishEvent(item)) {
          if (typeof item.country !== 'string' || !item.country.trim()) {
            console.error('Approved event has no verified Finnish location', item._id);
          }
          continue;
        }
        const city = municipalityName(item.city);
        if (city) {
          cityOptions.set(city, { name: city, count: 0 });
        } else if (item.city !== undefined && item.city !== null && item.city !== '') {
          console.error('Approved Finnish event has an invalid municipality', item._id);
        }
      }
      if (!approved.hasNext()) break;
      approved = await approved.next();
    } while (true);

    const dateOverlapFilter = items
      .filter()
      .ge('startDate', from)
      .or(items.filter().ge('endDate', from))
      .or(items.filter().ge('repeatUntil', new Date(from.getTime() - 7 * 24 * 60 * 60 * 1000)));
    const query = elevatedQuery(EVENTS_COLLECTION_ID)
      .eq('status', 'approved')
      .lt('startDate', to)
      .and(dateOverlapFilter);

    let result = await query.ascending('startDate').limit(PAGE_SIZE).find();
    const events: PublicEvent[] = [];
    let truncated = false;
    let total = 0;

    while (true) {
      for (const item of result.items) {
        if (!isFinnishEvent(item)) continue;
        const occurrences = weeklyOccurrences(toPublicEvent(item), item.repeatUntil, item.cancelledDates, { from, to });
        total += occurrences.length;
        const city = municipalityName(item.city);
        if (city) {
          let option = cityOptions.get(city);
          if (!option) {
            option = { name: city, count: 0 };
            cityOptions.set(city, option);
          }
          option.count += occurrences.length;
        }
        if (!requestedCity || requestedCity === city) {
          for (const occurrence of occurrences) {
            events.push(occurrence);
            events.sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
            if (events.length > MAX_EVENTS) {
              events.pop();
              truncated = true;
            }
          }
        }
      }

      if (!result.hasNext()) {
        break;
      }

      result = await result.next();
    }

    return Response.json(
      {
        events,
        cities: Array.from(cityOptions.values()).sort((a, b) => a.name.localeCompare(b.name, 'fi-FI')),
        total,
        truncated,
      },
      { headers: { 'Cache-Control': 'public, max-age=60' } }
    );
  } catch (error) {
    console.error('Failed to fetch public events', error);
    return Response.json(
      { error: 'Tapahtumien lataaminen ei onnistunut.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
};
