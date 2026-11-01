import { extensions, type DataCollection } from '@wix/astro/builders';

export const collectionIdSuffix = 'events';

const eventsCollection = {
  idSuffix: collectionIdSuffix,
  displayName: 'Events',
  displayField: 'name',
  fields: [
    { key: 'name', displayName: 'Name', type: 'TEXT' },
    { key: 'startDate', displayName: 'Date', type: 'DATETIME' },
    { key: 'endDate', displayName: 'End Date', type: 'DATETIME' },
    {
      key: 'category',
      displayName: 'Category',
      description: 'Allowed values: competition, jam, open-practice.',
      type: 'TEXT',
    },
    {
      key: 'country',
      displayName: 'Country',
      description: 'Two-letter country code in uppercase, such as FI, EE, SE, or LV.',
      type: 'TEXT',
    },
    { key: 'contactEmail', displayName: 'Contact Email', type: 'TEXT' },
    { key: 'description', displayName: 'Description', type: 'RICH_TEXT' },
    {
      key: 'link',
      displayName: 'Link',
      description: 'Optional HTTPS event URL.',
      type: 'URL',
    },
    { key: 'picture', displayName: 'Picture', type: 'IMAGE' },
    {
      key: 'status',
      displayName: 'Status',
      description: 'Allowed values: pending, approved. New submissions should default to pending.',
      type: 'TEXT',
    },
  ],
  dataPermissions: {
    itemRead: 'PRIVILEGED',
    itemInsert: 'PRIVILEGED',
    itemUpdate: 'PRIVILEGED',
    itemRemove: 'PRIVILEGED',
  },
  indexes: [],
  initialData: [
    {
      name: 'Finnish Breaking Championship',
      startDate: { $date: '2026-11-22T10:00:00.000Z' },
      category: 'competition',
      country: 'FI',
      contactEmail: 'events@example.com',
      description: '<p>Sample competition event.</p>',
      status: 'approved',
    },
    {
      name: 'SBL Jam Helsinki',
      startDate: { $date: '2026-11-13T16:00:00.000Z' },
      category: 'jam',
      country: 'FI',
      contactEmail: 'events@example.com',
      description: '<p>Sample breaking jam.</p>',
      status: 'approved',
    },
    {
      name: 'Open Practice Helsinki',
      startDate: { $date: '2026-11-10T14:00:00.000Z' },
      category: 'open-practice',
      country: 'FI',
      contactEmail: 'events@example.com',
      description: '<p>Sample open practice session.</p>',
      status: 'approved',
    },
  ],
} satisfies DataCollection;

export default extensions.dataCollections({
  id: 'ecc978c2-bd25-47ec-a549-af3e70e0ad81',
  name: 'Data Collections',
  collections: [eventsCollection],
});
