# Loumarc Signs Marketing Site

## Environment Variables for Netlify Deployment

To enable CapJS validation, set the following environment variable in your Netlify site settings:

- `URL`: The base URL of your deployed site (e.g., `https://loumarcsigns.com`)
- `LOUMARC_INTERNAL_RATE_LIMIT_SECRET`: A random shared secret used only by `forms-gate.ts` when it calls the CapJS validate function directly. Set the same value for all deploy contexts that serve forms.

You can set these in the Netlify dashboard under **Site settings → Build & deploy → Environment**.

Netlify build settings (when the app lives in `astro/`):

- Base directory: `astro`
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

The Netlify config file is located at `astro/netlify.toml`.

## Form and CapJS Rate Limiting

Public form traffic is protected in two layers:

- `/forms/*` is handled by `netlify/edge-functions/forms-gate.ts`, which exports a Netlify code-based rate limit of 6 POST requests per IP/domain per 60 seconds.
- `/api/challenge`, `/api/redeem`, and `/api/validate` are routed to `netlify/functions/cap.js` through Netlify redirects, with per-IP/domain rate limits in `netlify.toml` before the function is invoked.

Those code-based rules block with HTTP `429` before the handler runs in production. `forms-gate.ts` validates completed form submissions through `/.netlify/functions/cap/validate` so successful form submissions do not share the public `/api/validate` redirect bucket. The handlers also use `netlify/functions/_shared/rate-limit.js` as a local fallback and log allowed/blocked decisions with a source fingerprint, method, path, count, and reset time. Do not log form fields, message contents, tokens, or full IP addresses when tuning this code.

When `LOUMARC_INTERNAL_RATE_LIMIT_SECRET` is configured, `forms-gate.ts` signs that internal validation request and forwards the original visitor source so fallback validation limits remain per visitor. Direct public requests to `/.netlify/functions/cap/validate` cannot spoof that source header without the secret.

To tune the limits, update the `RATE_LIMIT_POLICIES` constants in `netlify/functions/_shared/rate-limit.js`, the exported `config.rateLimit` value in the edge function, and the `[redirects.rate_limit]` values in `netlify.toml`. After deployment, check Netlify's deploy post-processing logs to confirm the code-based rate limit rules were detected.

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
