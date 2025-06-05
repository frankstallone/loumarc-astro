# Loumarc Signs - Website
[![Netlify Status](https://api.netlify.com/api/v1/badges/7622e9a9-a159-4057-becd-8c914fdbd01e/deploy-status)](https://app.netlify.com/sites/loumarc-signs/deploys)

This repository contains the source code for the Loumarc Signs website. The project is split into two parts:

- **`astro/`** – The public facing site built with [Astro](https://astro.build/).
- **`studio/`** – The [Sanity.io](https://www.sanity.io/) Studio used to manage all site content.

## Requirements
- Node.js `>=20`
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

## Resources
- [Astro – Getting Started](https://docs.astro.build/en/getting-started/)
- [Sanity.io – Getting Started](https://www.sanity.io/docs/getting-started-with-sanity)
