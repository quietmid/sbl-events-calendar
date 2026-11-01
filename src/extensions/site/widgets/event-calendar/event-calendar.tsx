import { createRoot, type Root } from 'react-dom/client';
import { httpClient } from '@wix/essentials';
import EventCalendarView from './event-calendar-view';

class EventCalendarElement extends HTMLElement {
  private root: Root | null = null;

  connectedCallback() {
    if (this.root) return;

    const baseApiUrl = new URL(import.meta.url).origin;
    const pingUrl = `${baseApiUrl}/api/ping`;

    // TEMPORARY: remove before release
    console.log('Widget import.meta.url:', import.meta.url);
    console.log('Ping request URL:', pingUrl);

    async function testPing() {
      try {
        const response = await httpClient.fetchWithAuth(`${baseApiUrl}/api/ping`);
        const data = await response.text();
        // TEMPORARY: remove before release
        console.log('Ping response:', { status: response.status, data });
      } catch (error) {
        console.error('Ping request failed', error);
      }
    }

    void testPing();

    this.root = createRoot(this);
    this.root.render(<EventCalendarView baseApiUrl={baseApiUrl} />);
  }

  disconnectedCallback() {
    this.root?.unmount();
    this.root = null;
  }
}

export default EventCalendarElement;
