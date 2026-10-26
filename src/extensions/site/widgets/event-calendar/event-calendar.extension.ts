import { extensions } from '@wix/astro/builders'

export default extensions.customElement({
  id: '7237c4b7-daba-469a-aa6d-2ead03cc5895',
  name: 'event-calendar',
  width: {
    defaultWidth: 450,
    allowStretch: true
  },
  height: {
    defaultHeight: 250
  },
  installation: {
    autoAdd: true
  },
  presets: [
    {
      id: '073782fa-395b-48e1-80c9-5d0f7f8015cf',
      name: 'default',
      thumbnailUrl: '{{BASE_URL}}/event-calendar-thumbnail.png',
    },
  ],
  tagName: 'event-calendar',
  element: './extensions/site/widgets/event-calendar/event-calendar.tsx',
  settings: './extensions/site/widgets/event-calendar/event-calendar.panel.tsx',
});
