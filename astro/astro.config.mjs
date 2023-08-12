import { defineConfig } from 'astro/config';
import sanity from 'astro-sanity';
import sitemap from '@astrojs/sitemap';
import image from '@astrojs/image';
import purgecss from 'astro-purgecss';
import partytown from '@astrojs/partytown';

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
    image({
      serviceEntryPoint: '@astrojs/image/sharp',
    }),
    purgecss(),
    partytown({
      // Adds dataLayer.push as a forwarding-event.
      config: {
        forward: ['dataLayer.push'],
      },
    }),
  ],
  site: 'https://loumarcsigns.com',
  redirects: {
    '/products/carved/': '/products/carved-signs/',
    '/products/sandblasted/': '/products/sandblasted-signs/',
    '/products/post-panel/': '/products/post-panel-signs/',
  },
});
