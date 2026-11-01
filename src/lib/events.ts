export const EVENTS_COLLECTION_ID = '@suomenbreikkiliitt/event-calendar/events';

export const CATEGORIES = ['competition', 'jam', 'open-practice'] as const;

export const COUNTRIES = [
  { code: 'FI', label: 'Finland' },
  { code: 'SE', label: 'Sweden' },
  { code: 'NO', label: 'Norway' },
  { code: 'DK', label: 'Denmark' },
  { code: 'EE', label: 'Estonia' },
  { code: 'LV', label: 'Latvia' },
  { code: 'LT', label: 'Lithuania' },
  { code: 'IS', label: 'Iceland' },
] as const;

export type EventCategory = (typeof CATEGORIES)[number];

export type PublicEvent = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  category: EventCategory;
  country: string;
  contactEmail: string;
  description: string;
  link: string | null;
  picture: string | null;
};
