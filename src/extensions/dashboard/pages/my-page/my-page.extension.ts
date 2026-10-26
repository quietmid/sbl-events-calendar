import { extensions } from '@wix/astro/builders';

export default extensions.dashboardPage({
  id: '1dbe0b31-c8ab-4b10-b266-c6457c6ed692',
  title: 'My Page',
  routePath: '',
  component: './extensions/dashboard/pages/my-page/my-page.tsx',
  fullPage: false,
  metaData: {
    searchable: true,
    description: 'Manage My Page in your dashboard.',
  },
});
