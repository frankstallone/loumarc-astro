# Loumarc Signs Marketing Site

## Environment Variables for Netlify Deployment

To enable form verification, set the following environment variables in your Netlify site settings:

- `URL`: The base URL of your deployed site (e.g., `https://loumarcsigns.com`)
- `LOUMARC_CAP_TOKEN_SECRET`: A random secret of at least 32 characters used to sign Cap challenge and form verification tokens. Use a generated secret value from Netlify or a password manager; do not commit the value.
- `LOUMARC_INTERNAL_RATE_LIMIT_SECRET`: A random shared secret used only by `forms-gate.ts` when it calls the CapJS validate function directly. Set the same value for all deploy contexts that serve forms.

You can set these in the Netlify dashboard under **Site settings → Build & deploy → Environment**.

Netlify build settings (when the app lives in `astro/`):

- Base directory: `astro`
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

The Netlify config file is located at `astro/netlify.toml`.

## Form Verification and Rate Limiting

Public form traffic is protected in two layers:

- `/forms/*` is handled by `netlify/edge-functions/forms-gate.ts`, which exports a Netlify code-based rate limit of 6 POST requests per IP/domain per 60 seconds.
- `/api/challenge`, `/api/redeem`, and `/api/validate` are routed to `netlify/functions/cap.js` through Netlify redirects, with per-IP/domain rate limits in `netlify.toml` before the function is invoked.

Those code-based rules block with HTTP `429` before the handler runs in production. `forms-gate.ts` validates completed form submissions through `/.netlify/functions/cap/validate` so successful form submissions do not share the public `/api/validate` redirect bucket. The handlers also use `netlify/functions/_shared/rate-limit.js` as a local fallback and log allowed/blocked decisions through the shared form-spam monitoring event. Do not log form fields, message contents, tokens, or full IP addresses when tuning this code.

When `LOUMARC_INTERNAL_RATE_LIMIT_SECRET` is configured, `forms-gate.ts` signs that internal validation request and forwards the original visitor source so fallback validation limits remain per visitor. Direct public requests to `/.netlify/functions/cap/validate` cannot spoof that source header without the secret.

`netlify/functions/cap.js` issues stateless signed challenges and stateless signed form verification tokens. It uses the site-wide Netlify Blobs store named `cap-verification` only for small single-use markers:

- `challenge/*` entries prevent one solved challenge from minting multiple form tokens.
- `verification/*` entries prevent one form verification token from submitting multiple forms.

Both entry types include expiration metadata and use strong-consistency conditional writes so replay checks work across serverless instances. Do not replace this with function memory, warm instance state, `/tmp`, or a full database without a follow-up architecture decision.

To tune the limits, update the `RATE_LIMIT_POLICIES` constants in `netlify/functions/_shared/rate-limit.js`, the exported `config.rateLimit` value in the edge function, and the `[redirects.rate_limit]` values in `netlify.toml`. After deployment, check Netlify's deploy post-processing logs to confirm the code-based rate limit rules were detected.

## Form-Spam Monitoring Logs

Form-spam protection logs use one JSON event name: `loumarc.form_spam`. Each line includes `schemaVersion`, `surface`, `action`, `result`, `reason`, `method`, `path`, `status` when applicable, and a `sourceHash` instead of a raw IP address. Form field values, message contents, customer contact details, and CapJS tokens must not be added to this event.

Common `forms-gate` reasons are `honeypot`, `missing-token`, `invalid-token`, `validation-error`, `forwarded`, and `upstream-forwarding`. Common `cap-verification` reasons are `challenge-created`, `redeem-success`, `redeem-failure`, `validate-success`, `validate-failure`, and `malformed-request`. Rate-limit decisions use the same event shape with `surface: "rate-limit"` and `reason: "rate-limit"` when blocked.

Use the Netlify CLI to review recent activity:

```bash
# Recent form gate decisions
npx netlify logs --since 1h --source edge-functions --edge-function forms-gate | grep 'loumarc.form_spam'

# Recent CapJS challenge/redeem/validate decisions
npx netlify logs --since 1h --source functions --function cap | grep 'loumarc.form_spam'

# Count blocked versus forwarded form submissions in the last day
npx netlify logs --since 24h --source edge-functions --edge-function forms-gate | grep 'loumarc.form_spam' | grep '"result":"blocked"' | wc -l
npx netlify logs --since 24h --source edge-functions --edge-function forms-gate | grep 'loumarc.form_spam' | grep '"result":"forwarded"' | wc -l

# Follow live form-spam protection decisions during deploy verification
npx netlify logs --follow --source functions --source edge-functions | grep 'loumarc.form_spam'
```

## Form Verification Checks

Run local static and unit checks before deploying:

```bash
LOUMARC_CAP_TOKEN_SECRET="replace-with-a-local-32-character-secret" npm run test
npm run lint
npm run build
```

For a safe deploy verification path:

1. Confirm `LOUMARC_CAP_TOKEN_SECRET` and `LOUMARC_INTERNAL_RATE_LIMIT_SECRET` are set for the target deploy context.
2. Verify `/api/challenge`, `/api/redeem`, and `/.netlify/functions/cap/validate` in a Deploy Preview first. A valid redeemed token should validate once; a second validation of the same token should return `{ "success": false }`.
3. Submit the main, accessibility, and request forms from the Deploy Preview only after form notification emails are disabled or pointed at an internal test recipient.
4. Confirm missing `cap-token`, malformed token, expired token, invalid token, and replayed token requests return `422` from `/forms/submit` with an `x-forms-gate` rejection header and do not appear as Netlify Form submissions.

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
