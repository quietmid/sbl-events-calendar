import type { DataCollection } from '@wix/astro/builders';

export const collectionIdSuffix = 'submission-limits';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Ilmoitusten lähetysrajat',
  fields: [
    { type: 'TEXT', displayName: 'Lähetysajat', key: 'timestamps' },
    { type: 'NUMBER', displayName: 'Versio', key: 'revision' },
  ],
  displayField: 'timestamps',
  dataPermissions: {
    itemInsert: 'PRIVILEGED',
    itemRead: 'PRIVILEGED',
    itemRemove: 'PRIVILEGED',
    itemUpdate: 'PRIVILEGED',
  },
  indexes: [],
  initialData: [],
} satisfies DataCollection;
