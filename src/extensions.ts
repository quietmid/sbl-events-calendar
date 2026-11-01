import { app } from '@wix/astro/builders';
import myPage from './extensions/dashboard/pages/my-page/my-page.extension.ts';

import eventCalendar from './extensions/site/widgets/event-calendar/event-calendar.extension.ts';

import dataCollections from './data/extensions.ts';

export default app().use(myPage).use(eventCalendar).use(dataCollections);
