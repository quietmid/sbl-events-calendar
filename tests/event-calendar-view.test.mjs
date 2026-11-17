import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { mock, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.endsWith('/event-submission.tsx')) {
      if (specifier.endsWith('.module.css')) {
        return { url: 'data:text/javascript,export default {submitToggle:"submitToggle"}', shortCircuit: true };
      }
      if (specifier.endsWith('finnish-municipalities-2026.json')) {
        return { url: 'data:text/javascript,export default ["Helsinki"]', shortCircuit: true };
      }
    }
    if (context.parentURL?.endsWith('/event-calendar-view.tsx')) {
      if (specifier.endsWith('.module.css')) {
        return { url: 'data:text/javascript,export default {}', shortCircuit: true };
      }
      if (specifier === './calendar' || specifier === './useEvents') {
        return nextResolve(`${specifier}.ts`, context);
      }
      if (specifier === './event-submission') {
        return { url: 'data:text/javascript,export default function EventSubmission() { return null; }', shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('/event-calendar-view.tsx') || url.endsWith('/event-submission.tsx')) {
      const source = readFileSync(new URL(url), 'utf8');
      return {
        format: 'module',
        source: ts.transpileModule(source, {
          compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
        }).outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const event = {
  id: 'flyer',
  name: 'Breaking Jam',
  startDate: new Date().toISOString(),
  endDate: null,
  city: 'Helsinki',
  organizer: 'Breaking crew',
  location: null,
  contactEmail: 'events@example.com',
  description: 'Details',
  picture: 'https://example.com/flyer.jpg',
  link: null,
};
let events = [];
mock.module(new URL('../src/extensions/site/widgets/event-calendar/useEvents.ts', import.meta.url), {
  namedExports: {
    useEvents: () => ({ events, availableCities: [{ name: 'Helsinki', count: 1 }], total: events.length, truncated: false, loading: false, error: null }),
  },
});

const { default: EventCalendarView, EventDialog, SubmissionDialog } = await import('../src/extensions/site/widgets/event-calendar/event-calendar-view.tsx');
const { default: EventSubmission } = await import('../src/extensions/site/widgets/event-calendar/event-submission.tsx');

test('monthly events appear once in date order without week headings', () => {
  const now = new Date();
  const start = (day) => new Date(now.getFullYear(), now.getMonth(), day, 12).toISOString();
  events = [
    { ...event, id: 'late', name: 'Late event', startDate: start(25), picture: null },
    { ...event, id: 'early', name: 'Early event', startDate: start(2), picture: null },
  ];
  const html = renderToStaticMarkup(React.createElement(EventCalendarView, { baseApiUrl: 'https://example.com' }));
  assert.match(html, /Early event[\s\S]*Late event/);
  assert.equal((html.match(/aria-haspopup="dialog"[^>]*>(?:Early|Late) event<\/button>/g) ?? []).length, 2);
  assert.doesNotMatch(html, /Viikko|Week/);
});

test('submission control is at the top of the calendar before the city filters', () => {
  events = [event];
  const html = renderToStaticMarkup(React.createElement(EventCalendarView, { baseApiUrl: 'https://example.com' }));
  assert.match(html, /aria-haspopup="dialog"[^>]*>Ilmoita tapahtuma<\/button>[\s\S]*Suodata kaupungin mukaan/);
});

test('submission opens in a labelled dialog with a close button', () => {
  const html = renderToStaticMarkup(React.createElement(SubmissionDialog, {
    baseApiUrl: 'https://example.com', onDismiss() {}, trigger: null,
  }));
  assert.match(html, /<dialog[^>]*aria-labelledby="([^"]+)"[^>]*>[\s\S]*<h2 id="\1">Ilmoita tapahtuma<\/h2>/);
  assert.match(html, /aria-label="Sulje ilmoituslomake"/);
});

test('submission offers a visible button without requiring Turnstile', () => {
  const html = renderToStaticMarkup(React.createElement(EventSubmission, { baseApiUrl: 'https://example.com' }));
  assert.match(html, /<button class="submitToggle" type="submit">Lähetä tarkistettavaksi<\/button>/);
  assert.match(html, /sähköpostiosoite tai Instagram-käyttäjätunnus/);
});

test('an event flyer and city are shown beside the event title in Finnish', () => {
  events = [event];
  const html = renderToStaticMarkup(React.createElement(EventCalendarView, { baseApiUrl: 'https://example.com' }));
  assert.match(html, /<img[^>]*src="https:\/\/example\.com\/flyer\.jpg"[^>]*alt="Tapahtuman Breaking Jam juliste"/);
  assert.match(html, /<button[^>]*aria-haspopup="dialog"[^>]*>Breaking Jam<\/button>/);
  assert.match(html, /Kaikki kaupungit/);
  assert.match(html, /Helsinki/);
  assert.doesNotMatch(html, /🇫🇮|Country|Week/);
});

test('events without a flyer do not render an image or flyer link', () => {
  events = [{ ...event, picture: null }];
  const html = renderToStaticMarkup(React.createElement(EventCalendarView, { baseApiUrl: 'https://example.com' }));
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /View full flyer/);
  assert.match(html, /Breaking Jam/);
});

test('the event dialog shows the flyer above the name without requiring a separate link', () => {
  const html = renderToStaticMarkup(React.createElement(EventDialog, { event, onDismiss() {}, trigger: null }));
  assert.match(html, /<img[^>]*src="https:\/\/example\.com\/flyer\.jpg"[^>]*alt="Tapahtuman Breaking Jam juliste"[^>]*>[\s\S]*<h2[^>]*>Breaking Jam<\/h2>/);
  assert.doesNotMatch(html, /View full flyer/);
});

test('events without a city show an explicit placeholder', () => {
  events = [{ ...event, city: null }];
  const html = renderToStaticMarkup(React.createElement(EventCalendarView, { baseApiUrl: 'https://example.com' }));
  assert.match(html, /Kaupunki puuttuu/);
});

test('the event dialog still renders when there is no flyer', () => {
  const html = renderToStaticMarkup(React.createElement(EventDialog, {
    event: { ...event, picture: null }, onDismiss() {}, trigger: null,
  }));
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /<h2[^>]*>Breaking Jam<\/h2>/);
});

test('the event dialog separates labeled details and retains formatted content and the website link', () => {
  const html = renderToStaticMarkup(React.createElement(EventDialog, {
    event: { ...event, description: '<p>Open <strong>practice</strong></p>', link: 'https://example.com/event' },
    onDismiss() {}, trigger: null,
  }));
  assert.match(html, /<dt>Aika<\/dt><dd>/);
  assert.match(html, /<dt>Kaupunki<\/dt><dd>Helsinki<\/dd>/);
  assert.match(html, /<dt>Järjestäjä<\/dt><dd>Breaking crew<\/dd>/);
  assert.match(html, /<dt>Yhteystiedot<\/dt><dd>events@example.com<\/dd>/);
  assert.match(html, /<h3>Tapahtuman tiedot<\/h3>/);
  assert.match(html, /<strong>practice<\/strong>/);
  assert.match(html, /href="https:\/\/example.com\/event"/);
  assert.equal((html.match(/aria-hidden="true" focusable="false"/g) ?? []).length, 4);
});

test('the dialog omits an absent organizer but keeps the city placeholder and contact', () => {
  const html = renderToStaticMarkup(React.createElement(EventDialog, {
    event: { ...event, organizer: null, city: null }, onDismiss() {}, trigger: null,
  }));
  assert.doesNotMatch(html, /<dt>Järjestäjä<\/dt>/);
  assert.match(html, /<dd>Kaupunki puuttuu<\/dd>/);
  assert.match(html, /<dd>events@example.com<\/dd>/);
});

test('the dialog omits contact and details sections when they are absent', () => {
  const html = renderToStaticMarkup(React.createElement(EventDialog, {
    event: { ...event, contactEmail: null, description: null }, onDismiss() {}, trigger: null,
  }));
  assert.doesNotMatch(html, /Yhteystiedot|Tapahtuman tiedot/);
  assert.match(html, /Breaking Jam/);
});

test('the dialog shows an event location when supplied', () => {
  const html = renderToStaticMarkup(React.createElement(EventDialog, {
    event: { ...event, location: 'Dance studio' }, onDismiss() {}, trigger: null,
  }));
  assert.match(html, /<dt>Tapahtumapaikka<\/dt><dd>Dance studio<\/dd>/);
});
