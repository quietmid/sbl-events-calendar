import { httpClient } from '@wix/essentials';
import { useEffect, useState } from 'react';
import type { CityOption, PublicEvent } from '../../../../lib/events';

type UseEventsOptions = {
  baseApiUrl: string;
  from: Date;
  to: Date;
  city: string;
};

type EventsResponse = {
  events: PublicEvent[];
  cities: CityOption[];
  total: number;
  truncated: boolean;
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
    (value.city === null || typeof value.city === 'string') &&
    (value.organizer === null || typeof value.organizer === 'string') &&
    (value.location === null || typeof value.location === 'string') &&
    (value.contactEmail === null || typeof value.contactEmail === 'string') &&
    (value.description === null || typeof value.description === 'string') &&
    (value.link === null || typeof value.link === 'string') &&
    (value.picture === null || typeof value.picture === 'string')
  );
}

function isEventsResponse(value: unknown): value is EventsResponse {
  return isRecord(value) &&
    typeof value.truncated === 'boolean' &&
    typeof value.total === 'number' && Number.isInteger(value.total) && value.total >= 0 &&
    Array.isArray(value.events) && value.events.every(isPublicEvent) &&
    Array.isArray(value.cities) && value.cities.every(
      (city: unknown) => isRecord(city) &&
        typeof city.name === 'string' &&
        typeof city.count === 'number' && Number.isInteger(city.count) && city.count >= 0
    );
}

export function useEvents({ baseApiUrl, from, to, city }: UseEventsOptions) {
  const fromParam = from.toISOString();
  const toParam = to.toISOString();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [availableCities, setAvailableCities] = useState<CityOption[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ from: fromParam, to: toParam });

    if (city) {
      params.set('city', city);
    }

    setEvents([]);
    setLoading(true);
    setError(null);

    async function loadEvents() {
      let requestUrl: string | null = null;
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
        if (!response.ok) {
          throw new Error(`Events request failed with status ${response.status}`);
        }

        const payload: unknown = await response.json();
        if (!isEventsResponse(payload)) {
          throw new Error('Events response has an invalid shape');
        }

        if (active) {
          setEvents(payload.events);
          setAvailableCities(payload.cities);
          setTotal(payload.total);
          setTruncated(payload.truncated);
        }
      } catch (requestError) {
        if (active) {
          console.error('Failed to load events', requestError);
          setEvents([]);
          if (!requestUrl) {
            // TEMPORARY: remove before release
            console.log('Events request URL unavailable: API base URL is missing or invalid');
          }
          setError('Tapahtumien lataaminen ei onnistunut. Yritä myöhemmin uudelleen.');
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
  }, [baseApiUrl, fromParam, toParam, city]);

  return { events, availableCities, total, truncated, loading, error };
}
