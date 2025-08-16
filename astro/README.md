# Loumarc Signs Marketing Site

## Environment Variables for Netlify Deployment

To enable spam management and CapJS validation, set the following environment variables in your Netlify site settings:

- `NETLIFY_API_TOKEN`: Personal access token for Netlify API (required for marking submissions as spam)
- `URL`: The base URL of your deployed site (e.g., `https://loumarcsigns.com`)
- `SITE_ID`: Your Netlify site ID (only required for testing the API token with the temporary function)

You can set these in the Netlify dashboard under **Site settings → Build & deploy → Environment**.

Netlify build settings (when the app lives in `astro/`):

- Base directory: `astro`
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

The Netlify config file is located at `astro/netlify.toml`.

---

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory. However, images [optimized by astro](https://docs.astro.build/en/guides/images/) and are stored in the `/assets/` directory.

## 🧞 Astro Commands

All commands are run from the `/astro` directory of the project, from a terminal:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `npm install`          | Installs dependencies                            |
| `npm run dev`          | Starts local dev server at `localhost:3000`      |
| `npm run build`        | Build your production site to `./dist/`          |
| `npm run preview`      | Preview your build locally, before deploying     |
| `npm run astro ...`    | Run CLI commands like `astro add`, `astro check` |
| `npm run astro --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
