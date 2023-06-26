import { defineConfig } from 'astro/config';
import sanity from 'astro-sanity';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  integrations: [
    sanity({
      projectId: 'yiwm54j7',
      dataset: 'production',
      apiVersion: '2023-04-24',
      useCdn: false,
    }),
    sitemap(),
  ],
  site: 'https://loumarcsigns.com',
});
