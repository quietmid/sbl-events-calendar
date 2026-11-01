import { httpClient } from '@wix/essentials';
import { useEffect, useState } from 'react';
import { CATEGORIES, type EventCategory, type PublicEvent } from '../../../../lib/events';

type UseEventsOptions = {
  baseApiUrl: string;
  from: Date;
  to: Date;
  categories: string[];
  countries: string[];
};

type EventsResponse = {
  events: PublicEvent[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPublicEvent(value: unknown): value is PublicEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.startDate === 'string' &&
    (value.endDate === null || typeof value.endDate === 'string') &&
    typeof value.category === 'string' &&
    CATEGORIES.some((category: EventCategory) => category === value.category) &&
    typeof value.country === 'string' &&
    typeof value.contactEmail === 'string' &&
    typeof value.description === 'string' &&
    (value.link === null || typeof value.link === 'string') &&
    (value.picture === null || typeof value.picture === 'string')
  );
}

function isEventsResponse(value: unknown): value is EventsResponse {
  return isRecord(value) && Array.isArray(value.events) && value.events.every(isPublicEvent);
}

function toUtcDateFloor(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toUtcDateCeiling(date: Date): string {
  const utcMidnight = new Date(`${toUtcDateFloor(date)}T00:00:00.000Z`);
  if (utcMidnight.getTime() < date.getTime()) {
    utcMidnight.setUTCDate(utcMidnight.getUTCDate() + 1);
  }

  return utcMidnight.toISOString().slice(0, 10);
}

export function useEvents({ baseApiUrl, from, to, categories, countries }: UseEventsOptions) {
  const fromParam = toUtcDateFloor(from);
  const toParam = toUtcDateCeiling(to);
  const categoryParam = categories.join(',');
  const countryParam = countries.join(',');
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ from: fromParam, to: toParam });

    if (categoryParam) {
      params.set('category', categoryParam);
    }

    if (countryParam) {
      params.set('country', countryParam);
    }

    setEvents([]);
    setLoading(true);
    setError(null);

    async function loadEvents() {
      let requestUrl: string | null = null;
      let responseStatus: number | null = null;

      try {
        if (typeof baseApiUrl !== 'string' || baseApiUrl.length === 0) {
          throw new Error('The API base URL is missing');
        }

        const baseUrl = new URL(baseApiUrl);
        if (
          (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') ||
          baseUrl.origin === 'null'
        ) {
          throw new Error('The API base URL must be an absolute HTTP or HTTPS URL');
        }

        requestUrl = `${baseApiUrl.replace(/\/+$/, '')}/api/events?${params.toString()}`;
        // TEMPORARY: remove before release
        console.log('Events request URL:', requestUrl);

        const response = await httpClient.fetchWithAuth(requestUrl);
        responseStatus = response.status;
        if (!response.ok) {
          throw new Error(`Events request failed with status ${response.status}`);
        }

        const payload: unknown = await response.json();
        if (!isEventsResponse(payload)) {
          throw new Error('Events response has an invalid shape');
        }

        if (active) {
          setEvents(payload.events);
        }
      } catch (requestError) {
        if (active) {
          console.error('Failed to load events', requestError);
          setEvents([]);
          if (!requestUrl) {
            // TEMPORARY: remove before release
            console.log('Events request URL unavailable: API base URL is missing or invalid');
          }
          // TEMPORARY: remove before release
          setError(
            `Could not load events: ${requestUrl ?? 'API base URL unavailable; request not sent'} (HTTP ${responseStatus ?? 'unavailable'})`
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadEvents();

    return () => {
      active = false;
    };
  }, [fromParam, toParam, categoryParam, countryParam]);

  return { events, loading, error };
}
