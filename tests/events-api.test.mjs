import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { mock, test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './municipalities' && context.parentURL?.endsWith('/src/lib/submission.ts')) {
      return nextResolve('./municipalities.ts', context);
    }
    if ((specifier === '../../lib/events' || specifier === '../../lib/countries' || specifier === '../../lib/municipalities' || specifier === '../../lib/recurrence' || specifier === '../../lib/submission' || specifier === '../../lib/submission-limit') &&
        context.parentURL?.endsWith('/src/pages/api/events.ts')) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('/src/pages/api/events.ts')) {
      const source = readFileSync(new URL(url), 'utf8');
      return { format: 'module', source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const rows = [
  {
    _id: 'approved',
    name: 'Approved event',
    startDate: '2026-11-22T10:00:00.000Z',
    country: 'FI',
    city: 'Helsinki',
    contactEmail: 'events@example.com',
    description: '<p>Event details</p>',
    status: 'approved',
  },
  {
    _id: 'legacy',
    name: 'Legacy event',
    startDate: '2026-11-22T11:00:00.000Z',
    category: 'old-category',
    country: 'SE',
    city: 'Helsinki',
    contactEmail: 'events@example.com',
    description: '<p>Legacy details</p>',
    status: 'approved',
  },
  {
    _id: 'pending',
    name: 'Pending event',
    startDate: '2026-11-22T12:00:00.000Z',
    country: 'FI',
    city: 'Tampere',
    contactEmail: 'events@example.com',
    description: '<p>Pending details</p>',
    status: 'pending',
  },
];

let inserted = [];
const limits = new Map();
const bulkResult = (values = {}) => ({ inserted: 0, updated: 0, skipped: 0, errors: [], ...values });
const items = {
  async insert(collection, item) {
    inserted.push({ collection, item });
    return item;
  },
  async get(collection, id, options) {
    assert.equal(collection, '@suomenbreikkiliitt/event-calendar/submission-limits');
    assert.equal(options.consistentRead, true);
    const item = limits.get(id);
    return item ? { ...item } : null;
  },
  async bulkInsert(collection, records) {
    assert.equal(collection, '@suomenbreikkiliitt/event-calendar/submission-limits');
    const record = records[0];
    if (limits.has(record._id)) return bulkResult({ skipped: 1 });
    limits.set(record._id, { ...record });
    return bulkResult({ inserted: 1 });
  },
  async bulkUpdate(collection, records, options) {
    assert.equal(collection, '@suomenbreikkiliitt/event-calendar/submission-limits');
    const record = records[0];
    if (limits.get(record._id)?.revision !== options.condition.revision) return bulkResult({ skipped: 1 });
    limits.set(record._id, { ...record });
    return bulkResult({ updated: 1 });
  },
  filter() {
    let predicate = () => true;
    return {
      ge(field, value) {
        predicate = (row) => row[field] != null && new Date(row[field]) >= value;
        return this;
      },
      or(other) {
        const left = predicate;
        predicate = (row) => left(row) || other.matches(row);
        return this;
      },
      matches(row) { return predicate(row); },
    };
  },
  query() {
    let status;
    let before;
    let dateFilter;
    let pageSize = 100;
    return {
      eq(field, value) {
        if (field === 'status') status = value;
        return this;
      },
      lt(field, value) {
        assert.equal(field, 'startDate');
        before = value;
        return this;
      },
      and(filter) {
        dateFilter = filter;
        return this;
      },
      ascending() { return this; },
      limit(size) { pageSize = size; return this; },
      fields() { return this; },
      async find() {
        const matching = rows.filter((row) =>
            row.status === status &&
            (!before || new Date(row.startDate) < before) &&
            (!dateFilter || dateFilter.matches(row))
          ).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        const page = (offset) => ({
          items: matching.slice(offset, offset + pageSize),
          hasNext: () => offset + pageSize < matching.length,
          next: async () => page(offset + pageSize),
        });
        return page(0);
      },
    };
  },
};

mock.module('@wix/data', { namedExports: { items } });
mock.module('@wix/essentials', { namedExports: { auth: { elevate: (fn) => fn } } });
mock.module('@wix/sdk', {
  namedExports: {
    media: {
      getImageUrl(uri) {
        assert.equal(uri, 'wix:image://v1/flyer.jpg/flyer.jpg#originWidth=800&originHeight=1200');
        return { url: 'https://static.wixstatic.com/media/flyer.jpg' };
      },
    },
  },
});

const { GET, POST } = await import('../src/pages/api/events.ts');
async function getEvents(query = '') {
  const request = new Request(`https://example.com/api/events?from=2026-11-01&to=2026-12-01${query}`);
  const response = await GET({ request });
  assert.equal(response.status, 200);
  return (await response.json()).events;
}

const validSubmission = {
  name: 'Practice', city: 'Helsinki', startDate: '2026-12-07T18:00',
  endDate: '2026-12-07T20:00', contactEmail: 'contact@example.com', organizer: 'Breaking crew',
  publicationConsent: true,
};
const submit = (body) => POST({ request: new Request('https://example.com/api/events', {
  method: 'POST', body: JSON.stringify(body),
}) });

test('submission always saves pending with validated fields', async () => {
  inserted = [];
  limits.clear();
  assert.equal((await submit({ ...validSubmission, city: 'helsinki', status: 'approved',
    link: 'https://example.com', repeatUntil: '2027-01-31' })).status, 201);
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].item.status, 'pending');
  assert.equal(inserted[0].item.city, 'Helsinki');
  assert.equal(inserted[0].item.startDate.toISOString(), '2026-12-07T16:00:00.000Z');
});

test('invalid submissions never reach the collection', async () => {
  inserted = [];
  const valid = validSubmission;
  assert.equal((await submit({ ...valid, city: 'Helsinkii' })).status, 400);
  assert.equal((await submit({ ...valid, endDate: '' })).status, 400);
  assert.equal((await submit({ ...valid, endDate: valid.startDate })).status, 400);
  assert.equal((await submit({ ...valid, contactEmail: '' })).status, 400);
  assert.equal((await submit({ ...valid, contactEmail: '@bad handle' })).status, 400);
  assert.equal((await submit({ ...valid, organizer: '' })).status, 400);
  assert.equal((await submit({ ...valid, publicationConsent: false })).status, 400);
  assert.equal((await submit({ ...valid, link: 'javascript:alert(1)' })).status, 400);
  assert.equal(inserted.length, 0);
});

test('submission accepts an Instagram handle without a webpage or specific location', async () => {
  inserted = [];
  limits.clear();
  assert.equal((await submit({ ...validSubmission, contactEmail: 'BreakingCrew' })).status, 201);
  assert.equal(inserted[0].item.contactEmail, '@BreakingCrew');
  assert.equal(inserted[0].item.location, null);
  assert.equal(inserted[0].item.link, null);
});

test('the per-contact limit is atomic and expires after one hour', async () => {
  limits.clear();
  inserted = [];
  const clock = mock.method(Date, 'now', () => 1_000_000_000);
  try {
    const responses = await Promise.all(Array.from({ length: 6 }, (_, index) =>
      submit({ ...validSubmission, contactEmail: index % 2 ? '@BREAKINGCREW' : 'breakingcrew' })));
    assert.equal(responses.filter((response) => response.status === 201).length, 5);
    assert.equal(responses.filter((response) => response.status === 429).length, 1);
    assert.equal(inserted.length, 5);
    assert.equal((await submit({ ...validSubmission, contactEmail: 'other@example.com' })).status, 201);
    clock.mock.mockImplementation(() => 1_003_599_999);
    assert.equal((await submit({ ...validSubmission, contactEmail: '@breakingcrew' })).status, 429);
    clock.mock.mockImplementation(() => 1_003_600_000);
    assert.equal((await submit({ ...validSubmission, contactEmail: '@breakingcrew' })).status, 201);
  } finally {
    clock.mock.restore();
  }
});

test('submission fails closed when the limiter cannot access storage', async () => {
  inserted = [];
  const get = mock.method(items, 'get', async () => { throw new Error('Storage unavailable'); });
  const logger = mock.method(console, 'error', () => {});
  try {
    assert.equal((await submit(validSubmission)).status, 503);
    assert.equal(inserted.length, 0);
    assert.equal(logger.mock.callCount(), 1);
  } finally {
    get.mock.restore();
    logger.mock.restore();
  }
});

test('approved events do not need a category and legacy categories are not returned', async () => {
  const events = await getEvents();
  assert.deepEqual(events.map((event) => event.id), ['approved']);
  assert.ok(events.every((event) => !('category' in event)));
});

test('approved events can omit optional contact and description without breaking the feed', async () => {
  const { contactEmail, description, ...withoutOptionalFields } = rows[0];
  rows.push({ ...withoutOptionalFields, _id: 'without-contact' });
  try {
    const events = await getEvents();
    const optional = events.find((item) => item.id === 'without-contact');
    assert.equal(optional.contactEmail, null);
    assert.equal(optional.description, null);
    assert.ok(events.some((item) => item.id === 'approved'));
  } finally {
    rows.pop();
  }
});

test('approved weekly events appear in later months and honour cancelled dates', async () => {
  rows.push({
    ...rows[0], _id: 'weekly',
    startDate: '2026-10-19T15:00:00.000Z',
    endDate: '2026-10-19T17:00:00.000Z',
    repeatUntil: '2026-12-31T21:59:59.999Z',
    cancelledDates: '2026-11-09',
  });
  try {
    const events = await getEvents();
    const weekly = events.filter((item) => item.id.startsWith('weekly:'));
    assert.deepEqual(weekly.map((item) => item.startDate), [
      '2026-11-02T16:00:00.000Z', '2026-11-16T16:00:00.000Z',
      '2026-11-23T16:00:00.000Z', '2026-11-30T16:00:00.000Z',
    ]);
  } finally {
    rows.pop();
  }
});

test('weekly Finnish events retain local time across the daylight-saving transition', async () => {
  rows.push({
    ...rows[0], _id: 'summer-weekly',
    startDate: '2027-03-22T16:00:00.000Z',
    repeatUntil: '2027-04-04T20:59:59.999Z',
  });
  try {
    const request = new Request('https://example.com/api/events?from=2027-03-01&to=2027-04-01');
    const body = await (await GET({ request })).json();
    assert.deepEqual(body.events.filter((item) => item.id.startsWith('summer-weekly:')).map((item) => item.startDate), [
      '2027-03-22T16:00:00.000Z', '2027-03-29T15:00:00.000Z',
    ]);
  } finally {
    rows.pop();
  }
});

test('legacy Finnish events without cities stay visible; non-Finnish and unknown locations are hidden', async () => {
  rows.push({ ...rows[0], _id: 'organizer', organizer: '  Breaking crew  ', country: 'Finland', city: undefined });
  rows.push({ ...rows[0], _id: 'unknown', country: 'Unknown Place' });
  rows.push({ ...rows[0], _id: 'new', country: undefined, city: ' espoo ' });
  try {
    const events = await getEvents();
    assert.equal(events.find((item) => item.id === 'organizer').organizer, 'Breaking crew');
    assert.equal(events.find((item) => item.id === 'organizer').city, null);
    assert.equal(events.find((item) => item.id === 'approved').organizer, null);
    assert.equal(events.find((item) => item.id === 'new').city, 'Espoo');
    assert.ok(!events.some((item) => item.id === 'legacy' || item.id === 'unknown'));
    assert.ok(events.every((item) => !('country' in item)));
  } finally {
    rows.splice(-3);
  }
});

test('rich descriptions retain safe formatting but strip executable content', async () => {
  rows.push({
    ...rows[0],
    _id: 'formatted',
    description: '<p onclick="alert(1)">Hello <strong>world</strong></p><ul><li>Jam</li></ul>' +
      '<a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a>' +
      '<img src=x onerror=alert(1)><script>alert(1)</script><svg onload=alert(1)></svg>',
  });
  try {
    const description = (await getEvents()).find((item) => item.id === 'formatted').description;
    assert.match(description, /<p>Hello <strong>world<\/strong><\/p>/);
    assert.match(description, /<ul><li>Jam<\/li><\/ul>/);
    assert.match(description, /<a href="https:\/\/example.com">good<\/a>/);
    assert.doesNotMatch(description, /onclick|javascript:|onerror|onload|<script|<svg|<img|alert\(1\)/);
  } finally {
    rows.pop();
  }
});

test('approved flyer images are normalized to browser-safe URLs', async () => {
  const extra = [
    { ...rows[0], _id: 'wix-flyer', picture: 'wix:image://v1/flyer.jpg/flyer.jpg#originWidth=800&originHeight=1200' },
    { ...rows[0], _id: 'external-flyer', picture: { url: 'https://example.com/flyer.png' } },
    { ...rows[0], _id: 'unsafe-flyer', picture: 'http://example.com/flyer.png' },
  ];
  rows.push(...extra);
  try {
    const events = await getEvents();
    assert.equal(events.find((item) => item.id === 'wix-flyer').picture, 'https://static.wixstatic.com/media/flyer.jpg');
    assert.equal(events.find((item) => item.id === 'external-flyer').picture, 'https://example.com/flyer.png');
    assert.equal(events.find((item) => item.id === 'unsafe-flyer').picture, null);
    assert.equal(events.find((item) => item.id === 'approved').picture, null);
  } finally {
    rows.splice(-extra.length);
  }
});

test('city options come from approved Finnish events across all dates and filter case-insensitively', async () => {
  const extra = [
    { ...rows[0], _id: 'lowercase', city: ' HELSINKI ' },
    { ...rows[0], _id: 'espoo', country: 'Suomi', city: 'Espoo' },
    { ...rows[0], _id: 'future', country: undefined, city: 'Jyväskylä', startDate: '2027-01-01T10:00:00.000Z' },
    { ...rows[0], _id: 'foreign', country: 'EE', city: 'Turku' },
    { ...rows[0], _id: 'pending-city', city: 'Oulu', status: 'pending' },
    { ...rows[0], _id: 'missing-city', city: undefined },
  ];
  rows.push(...extra);
  try {
    const request = new Request('https://example.com/api/events?from=2026-11-01&to=2026-12-01&city=helsinki');
    const response = await GET({ request });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.events.map((item) => item.id), ['approved', 'lowercase']);
    assert.deepEqual(body.cities, [
      { name: 'Espoo', count: 1 },
      { name: 'Helsinki', count: 2 },
      { name: 'Jyväskylä', count: 0 },
    ]);
    assert.equal(body.total, 4);
    assert.deepEqual(await getEvents('&city=Oulu'), []);
  } finally {
    rows.splice(-extra.length);
  }
});

test('city counts and total include all matching events across pages', async () => {
  const extra = Array.from({ length: 501 }, (_, index) => ({
    ...rows[0], _id: `event-${index}`, city: index % 2 ? 'HELSINKI' : 'Helsinki',
  }));
  rows.push(...extra);
  try {
    const request = new Request('https://example.com/api/events?from=2026-11-01&to=2026-12-01&city=Espoo');
    const body = await (await GET({ request })).json();
    assert.deepEqual(body.events, []);
    assert.equal(body.cities.find((item) => item.name === 'Helsinki').count, 502);
    assert.equal(body.total, 502);
    assert.equal(body.truncated, false);
    const unfiltered = await GET({ request: new Request('https://example.com/api/events?from=2026-11-01&to=2026-12-01') });
    const all = await unfiltered.json();
    assert.equal(all.events.length, 500);
    assert.equal(all.truncated, true);
  } finally {
    rows.splice(-extra.length);
  }
});

test('invalid municipalities are not offered as filters or displayed as verified cities', async () => {
  rows.push({ ...rows[0], _id: 'typo', city: 'Helsinkii' });
  try {
    const invalid = new Request('https://example.com/api/events?from=2026-11-01&to=2026-12-01&city=Helsinkii');
    assert.equal((await GET({ request: invalid })).status, 400);
    assert.equal((await getEvents()).find((item) => item.id === 'typo').city, null);
  } finally {
    rows.pop();
  }
});

test('both local names for Maarianhamina identify the same municipality', async () => {
  const extra = [
    { ...rows[0], _id: 'mariehamn', country: undefined, city: 'Mariehamn' },
    { ...rows[0], _id: 'maarianhamina', country: undefined, city: 'Maarianhamina' },
  ];
  rows.push(...extra);
  try {
    const events = await getEvents('&city=Maarianhamina');
    assert.deepEqual(events.map((item) => item.id), ['mariehamn', 'maarianhamina']);
    assert.ok(events.every((item) => item.city === 'Maarianhamina - Mariehamn'));
  } finally {
    rows.splice(-extra.length);
  }
});

test('UTC timestamp bounds support accurate local-month city counts', async () => {
  const extra = [
    { ...rows[0], _id: 'inside', startDate: '2026-11-30T22:30:00.000Z', city: 'Espoo' },
    { ...rows[0], _id: 'outside', startDate: '2026-12-31T22:00:00.000Z', city: 'Oulu' },
  ];
  rows.push(...extra);
  try {
    const request = new Request('https://example.com/api/events?from=2026-11-30T22%3A00%3A00.000Z&to=2026-12-31T22%3A00%3A00.000Z');
    const body = await (await GET({ request })).json();
    assert.deepEqual(body.events.map((item) => item.id), ['inside']);
    assert.equal(body.cities.find((item) => item.name === 'Espoo').count, 1);
    assert.equal(body.cities.find((item) => item.name === 'Oulu').count, 0);
  } finally {
    rows.splice(-extra.length);
  }
});

test('obsolete category filters are rejected rather than silently ignored', async () => {
  const request = new Request('https://example.com/api/events?from=2026-11-01&to=2026-12-01&category=jam');
  const response = await GET({ request });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /ei enää tueta/);
  const country = new Request('https://example.com/api/events?from=2026-11-01&to=2026-12-01&country=FI');
  assert.equal((await GET({ request: country })).status, 400);
});
