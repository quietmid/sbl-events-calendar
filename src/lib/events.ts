export const EVENTS_COLLECTION_ID = '@suomenbreikkiliitt/event-calendar/events';

export type CityOption = {
  name: string;
  count: number;
};

export type PublicEvent = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  city: string | null;
  organizer: string | null;
  location: string | null;
  contactEmail: string | null;
  description: string | null;
  link: string | null;
  picture: string | null;
};
