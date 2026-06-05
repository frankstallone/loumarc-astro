# Loumarc Signs - Website
[![Netlify Status](https://api.netlify.com/api/v1/badges/7622e9a9-a159-4057-becd-8c914fdbd01e/deploy-status)](https://app.netlify.com/sites/loumarc-signs/deploys)

This repository contains the source code for the Loumarc Signs website. The project is split into two parts:

- **`astro/`** – The public facing site built with [Astro](https://astro.build/).
- **`studio/`** – The [Sanity.io](https://www.sanity.io/) Studio used to manage all site content.

## Requirements
- Node.js `>=22`
- npm

## Project Structure

```
/
├── astro/   # Astro website
│   ├── public/
│   └── src/
│       ├── api/
│       ├── assets/
│       ├── components/
│       ├── css/
│       ├── layouts/
│       ├── pages/
│       ├── ts/
│       └── utils/
├── studio/  # Sanity Studio
│   ├── schemas/
│   └── src/
│       └── structure/
└── netlify.toml        # Netlify configuration (builds astro/ app)
```

## Installation
Install dependencies for each project:

```bash
# Astro site
cd astro
npm install

# Sanity Studio
cd ../studio
npm install
```

## Local Development
Run the Astro site (either):

- From repo root (forwards to `astro/`): `npm run dev`
- Or from `astro/`: `npm run dev`

Local Astro development relies on `astro/netlify.toml`. The root
`netlify.toml` remains the Netlify deploy config and uses `base = "astro"` for
cloud builds.

Run the Sanity Studio:

```bash
cd studio
npm run dev
```

## Building for Production
To create a production build of the site and Studio:

```bash
# Build Astro site
npm --prefix astro run build

# Build Sanity Studio
cd studio
npm run build
```

## Astro Commands

Run these commands from the `/astro` directory to work with the Astro site:

| Command | Action |
| :--------------------- | :--------------------------------------------- |
| `npm run dev` | Start the Astro site locally |
| `npm run build` | Build the site for production |
| `npm run preview` | Preview the built site |
| `npm run astro` | Access the Astro CLI |
| `npm run lint` | Run Astro checks |

## Sanity Studio Commands

Run these commands from the `/studio` directory to work with the Sanity Studio:

| Command | Action |
| :--------------------- | :--------------------------------------------- |
| `npm run dev` | Start the Studio locally |
| `npm run build` | Build the Studio for production |
| `npm run start` | Serve the built Studio |
| `npm run deploy` | Deploy the Studio to Sanity.io |
| `npm run deploy-graphql` | Deploy the GraphQL API |

## Deployment

The Astro site is deployed through [Netlify](https://www.netlify.com/). The
root `netlify.toml` is the deploy config for Netlify cloud builds:

- Base directory: `astro`
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

For local Astro dev, `astro/netlify.toml` mirrors the same paths relative to the
`astro/` subproject so `npm run dev` works both from the repo root and from
`astro/`. Updates to the `main` branch automatically trigger a new deploy. The
status badge at the top of this README reflects the latest deployment state.

Required Netlify environment variables for production form verification are
documented in `astro/README.md`, including `LOUMARC_CAP_TOKEN_SECRET` for
signed Cap challenges and form tokens.

## Resources
- [Astro – Getting Started](https://docs.astro.build/en/getting-started/)
- [Sanity.io – Getting Started](https://www.sanity.io/docs/getting-started-with-sanity)
