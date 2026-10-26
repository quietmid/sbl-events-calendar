import { createRoot, type Root } from 'react-dom/client';
import EventCalendarView from './event-calendar-view';

class EventCalendarElement extends HTMLElement {
  private root: Root | null = null;

  connectedCallback() {
    if (this.root) return;

    this.root = createRoot(this);
    this.root.render(<EventCalendarView />);
  }

  disconnectedCallback() {
    this.root?.unmount();
    this.root = null;
  }
}

export default EventCalendarElement;
