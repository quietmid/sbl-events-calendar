import { extensions, type DataCollection } from '@wix/astro/builders';
import submissionLimitsCollection from '../extensions/backend/data-collections/submission-limits';

export const collectionIdSuffix = 'events';

const eventsCollection = {
  idSuffix: collectionIdSuffix,
  displayName: 'Tapahtumat',
  displayField: 'name',
  fields: [
    { key: 'name', displayName: 'Nimi', type: 'TEXT' },
    { key: 'startDate', displayName: 'Alkuaika', type: 'DATETIME' },
    { key: 'endDate', displayName: 'Päättymisaika', type: 'DATETIME' },
    {
      key: 'repeatUntil',
      displayName: 'Viikoittainen toisto päättyy',
      description: 'Viimeisen mahdollisen toistopäivän loppu Suomen ajassa.',
      type: 'DATETIME',
    },
    {
      key: 'cancelledDates',
      displayName: 'Perutut toistopäivät',
      description: 'Perutut päivämäärät muodossa VVVV-KK-PP, pilkuilla erotettuina.',
      type: 'TEXT',
    },
    {
      key: 'city',
      displayName: 'Kaupunki tai kunta',
      description: 'Suomalaisen kunnan virallinen nimi, esimerkiksi Helsinki tai Jyväskylä.',
      type: 'TEXT',
    },
    {
      key: 'country',
      displayName: 'Vanha maatieto',
      description: 'Säilytetään vanhojen ulkomaisten tapahtumien piilottamista varten. Uusiin tapahtumiin ei tarvita maatietoa.',
      type: 'TEXT',
    },
    { key: 'organizer', displayName: 'Järjestäjä', type: 'TEXT' },
    { key: 'location', displayName: 'Tapahtumapaikka', type: 'TEXT' },
    { key: 'contactEmail', displayName: 'Julkinen yhteystieto', description: 'Hyväksyttyjen tapahtumien julkinen sähköpostiosoite tai Instagram-käyttäjätunnus.', type: 'TEXT' },
    { key: 'description', displayName: 'Kuvaus', type: 'RICH_TEXT' },
    {
      key: 'link',
      displayName: 'Linkki',
      description: 'Valinnainen HTTPS-linkki tapahtumaan.',
      type: 'URL',
    },
    { key: 'picture', displayName: 'Kuva', type: 'IMAGE' },
    {
      key: 'status',
      displayName: 'Tila',
      description: 'Sallitut arvot: pending, approved, rejected. Uusien ilmoitusten tilan tulee olla pending.',
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
      country: 'FI',
      contactEmail: 'events@example.com',
      description: '<p>Sample competition event.</p>',
      status: 'approved',
    },
    {
      name: 'SBL Jam Helsinki',
      startDate: { $date: '2026-11-13T16:00:00.000Z' },
      country: 'FI',
      city: 'Helsinki',
      contactEmail: 'events@example.com',
      description: '<p>Sample breaking jam.</p>',
      status: 'approved',
    },
    {
      name: 'Open Practice Helsinki',
      startDate: { $date: '2026-11-10T14:00:00.000Z' },
      country: 'FI',
      city: 'Helsinki',
      contactEmail: 'events@example.com',
      description: '<p>Sample open practice session.</p>',
      status: 'approved',
    },
  ],
} satisfies DataCollection;

export default extensions.dataCollections({
  id: 'ecc978c2-bd25-47ec-a549-af3e70e0ad81',
  name: 'Data Collections',
  collections: [eventsCollection, submissionLimitsCollection],
});
