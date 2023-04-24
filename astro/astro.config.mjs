import { defineConfig } from 'astro/config';
import sanity from 'astro-sanity'

// https://astro.build/config
export default defineConfig({
    integrations: [sanity({
        projectId: '2chysz6o',
        dataset: 'production',
        apiVersion: '2023-04-24',
        useCdn: true,
    })]
});
