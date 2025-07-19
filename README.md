# Loumarc Signs - Website
[![Netlify Status](https://api.netlify.com/api/v1/badges/7622e9a9-a159-4057-becd-8c914fdbd01e/deploy-status)](https://app.netlify.com/sites/loumarc-signs/deploys)

This repository contains the source code for the Loumarc Signs website. The project is split into two parts:

- **`astro/`** – The public facing site built with [Astro](https://astro.build/).
- **`studio/`** – The [Sanity.io](https://www.sanity.io/) Studio used to manage all site content.

## Requirements
- Node.js `>=20`
- npm

## Project Structure

The repository is divided into two top-level folders:

- **`astro/`** – The Astro website
- **`studio/`** – The Sanity Studio

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
└── studio/  # Sanity Studio
    ├── schemas/
    └── src/
        └── structure/
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
Run the Astro site:

```bash
cd astro
npm run dev
```

Run the Sanity Studio:

```bash
cd studio
npm run dev
```

## Sanity Studio Commands
Run these commands from the `studio` directory:

```bash
npm run dev            # Start the Studio in development mode
npm run start          # Serve the production build
npm run build          # Build the Studio for production
npm run deploy         # Deploy the Studio to Sanity
npm run deploy-graphql # Deploy the GraphQL API
```

## Building for Production
To create a production build of the site and Studio:

```bash
# Build Astro site
cd astro
npm run build

# Build Sanity Studio
cd ../studio
npm run build
```

## Deployment

The site is automatically deployed to [Netlify](https://www.netlify.com/). The
`netlify.toml` file configures the build to run inside the `astro` directory.
Pushing to the `main` branch triggers a new deployment. The current status of
these deployments is shown by the Netlify badge at the top of this README.

## Resources
- [Astro – Getting Started](https://docs.astro.build/en/getting-started/)
- [Sanity.io – Getting Started](https://www.sanity.io/docs/getting-started-with-sanity)
