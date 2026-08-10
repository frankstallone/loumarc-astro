import { defineConfig } from 'astro/config';
import sanityIntegration from '@sanity/astro';
import sitemap from '@astrojs/sitemap';
import partytown from '@astrojs/partytown';

import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  integrations: [
    sanityIntegration({
      projectId: 'yiwm54j7',
      dataset: 'production',
      apiVersion: '2023-04-24',
      useCdn: false,
    }),
    sitemap(),
    partytown(),
  ],

  site: 'https://loumarcsigns.com',
  adapter: netlify({
    devFeatures: {
      environmentVariables: true,
      images: false,
    },
  }),
});
