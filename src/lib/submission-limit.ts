import { auth } from '@wix/essentials';
import { items } from '@wix/data';

const COLLECTION_ID = '@suomenbreikkiliitt/event-calendar/submission-limits';
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SUBMISSIONS = 5;
const MAX_ATTEMPTS = 10;

async function contactId(contact: string): Promise<string> {
  const bytes = new TextEncoder().encode(contact.toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function readTimestamps(value: unknown): number[] {
  if (typeof value !== 'string') throw new Error('Invalid submission limit record');
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((time) => typeof time === 'number' && Number.isSafeInteger(time))) {
    throw new Error('Invalid submission limit timestamps');
  }
  return parsed;
}

export async function reserveSubmission(contact: string): Promise<boolean> {
  const id = await contactId(contact);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const now = Date.now();
    const current = await auth.elevate(items.get)(COLLECTION_ID, id, { consistentRead: true });
    if (!current) {
      const result = await auth.elevate(items.bulkInsert)(COLLECTION_ID, [
        { _id: id, timestamps: JSON.stringify([now]), revision: 1 },
      ]);
      if (result.inserted === 1) return true;
      if (result.skipped === 1 || (result.errors.length === 1 && result.errors[0].code === 'WDE0074')) continue;
      throw new Error('Failed to create submission limit record');
    }
    if (typeof current.revision !== 'number' || !Number.isSafeInteger(current.revision)) {
      throw new Error('Invalid submission limit revision');
    }
    const timestamps = readTimestamps(current.timestamps).filter((time) => time > now - WINDOW_MS);
    if (timestamps.length >= MAX_SUBMISSIONS) return false;
    const result = await auth.elevate(items.bulkUpdate)(COLLECTION_ID, [{
      _id: id, timestamps: JSON.stringify([...timestamps, now]), revision: current.revision + 1,
    }], { condition: { revision: current.revision } });
    if (result.updated === 1) return true;
    if (result.errors.length) throw new Error('Failed to update submission limit record');
  }
  throw new Error('Submission limit could not be updated after concurrent requests');
}
