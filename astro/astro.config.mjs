import { defineConfig } from 'astro/config';
import sanity from 'astro-sanity'

// https://astro.build/config
export default defineConfig({
    integrations: [sanity({
        projectId: 'vk5xc4pu',
        dataset: 'production',
        apiVersion: '2023-04-24',
        useCdn: true,
    })]
});
