import { auth } from '@wix/essentials';
import { items } from '@wix/data';
import { media } from '@wix/sdk';
import type { APIRoute } from 'astro';
import {
  CATEGORIES,
  COUNTRIES,
  EVENTS_COLLECTION_ID,
  type EventCategory,
  type PublicEvent,
} from '../../lib/events';

export const prerender = false;

const MAX_RANGE_MS = 400 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 500;
const PAGE_SIZE = 100;
const COUNTRY_CODES = new Set(COUNTRIES.map(({ code }) => code));
const EVENT_CATEGORIES = new Set<string>(CATEGORIES);

type EventRecord = {
  _id?: unknown;
  name?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  category?: unknown;
  country?: unknown;
  contactEmail?: unknown;
  description?: unknown;
  link?: unknown;
  picture?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEventCategory(value: string): value is EventCategory {
  return EVENT_CATEGORIES.has(value);
}

function parseIsoDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

function parseAllowedValues(
  value: string | null,
  allowedValues: ReadonlySet<string>
): string[] {
  if (!value) {
    return [];
  }

  return [...new Set(value.split(',').map((entry) => entry.trim()).filter((entry) => allowedValues.has(entry)))];
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

function toPlainText(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Event is missing a valid description');
  }

  return value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toPublicEvent(item: EventRecord): PublicEvent {
  const category = requiredString(item.category, 'category');
  if (!isEventCategory(category)) {
    throw new Error('Event has an unsupported category');
  }

  return {
    id: requiredString(item._id, 'id'),
    name: requiredString(item.name, 'name'),
    startDate: toIsoDateTime(item.startDate, 'startDate'),
    endDate: toOptionalIsoDateTime(item.endDate),
    category,
    country: requiredString(item.country, 'country'),
    contactEmail: requiredString(item.contactEmail, 'contactEmail'),
    description: toPlainText(item.description),
    link: toHttpsUrl(item.link),
    picture: toBrowserImageUrl(item.picture),
  };
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const from = parseIsoDate(url.searchParams.get('from'));
  const to = parseIsoDate(url.searchParams.get('to'));

  if (!from || !to || to <= from || to.getTime() - from.getTime() > MAX_RANGE_MS) {
    return Response.json(
      { error: 'Provide valid from and to dates in YYYY-MM-DD format; the range must be at most 400 days.' },
      { status: 400 }
    );
  }

  const categories = parseAllowedValues(url.searchParams.get('category'), EVENT_CATEGORIES);
  const countries = parseAllowedValues(url.searchParams.get('country'), COUNTRY_CODES);

  try {
    const elevatedQuery = auth.elevate(items.query);
    const dateOverlapFilter = items
      .filter()
      .ge('startDate', from)
      .or(items.filter().ge('endDate', from));
    let query = elevatedQuery(EVENTS_COLLECTION_ID)
      .eq('status', 'approved')
      .lt('startDate', to)
      .and(dateOverlapFilter);

    if (categories.length > 0) {
      query = query.hasSome('category', categories);
    }

    if (countries.length > 0) {
      query = query.hasSome('country', countries);
    }

    let result = await query.ascending('startDate').limit(PAGE_SIZE).find();
    const events: PublicEvent[] = [];

    while (events.length < MAX_EVENTS) {
      for (const item of result.items) {
        events.push(toPublicEvent(item));
        if (events.length === MAX_EVENTS) {
          break;
        }
      }

      if (events.length === MAX_EVENTS || !result.hasNext()) {
        break;
      }

      result = await result.next();
    }

    return Response.json(
      { events },
      { headers: { 'Cache-Control': 'public, max-age=60' } }
    );
  } catch (error) {
    console.error('Failed to fetch public events', error);
    return Response.json(
      { error: 'Unable to fetch events right now.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
};
