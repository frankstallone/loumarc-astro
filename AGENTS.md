# Repository Guidelines

## Project Structure & Module Organization
- `astro/`: Public site (Astro). Key dirs: `src/pages/`, `src/components/`, `src/assets/`, `src/utils/`, `public/`, `netlify/` (functions and edge functions).
- `studio/`: Sanity Studio. Key dirs: `schemas/`, `src/`, `plugins/`.
- Netlify config lives in `astro/netlify.toml`. Root `.gitignore` ignores builds and local artifacts.

## Build, Test, and Development Commands
- Astro (run from `astro/`):
  - `npm install`: install dependencies
  - `npm run dev`: start dev server (http://localhost:3000)
  - `npm run build`: production build to `astro/dist/`
  - `npm run preview`: preview production build
  - `npm run lint`: Astro type/check validation
- Studio (run from `studio/`):
  - `npm install`
  - `npm run dev`: start Sanity Studio
  - `npm run build`: production build
  - `npm run deploy`: deploy Studio to Sanity.io

## Coding Style & Naming Conventions
- Format: Prettier enforced.
  - Astro: `singleQuote: true`, `semi: false` (see `astro/.prettierrc`).
  - Studio: `singleQuote: true`, `semi: false` (see `studio/.prettierrc`).
- Linting: Astro uses `astro check`; Studio extends `@sanity/eslint-config-studio`.
- Indentation: 2 spaces (default). TypeScript strict in Astro (`astro/tsconfig.json`).
- Naming:
  - Astro components: PascalCase (e.g., `Footer.astro`).
  - Pages: kebab-case and dynamic routes (e.g., `accessibility-statement.astro`, `[slug].astro`).
  - Studio schemas: lowerCamelCase file names (e.g., `siteSettings.ts`).

## Testing Guidelines
- No unit test suite configured. Use `npm run lint`, build + `npm run preview`, and manual QA (forms, dynamic routes, images).
- If introducing testable logic, co-locate tests alongside files (e.g., `utils/foo.test.ts`) and keep them lightweight.

## Commit & Pull Request Guidelines
- Commits follow a conventional prefix style used in history: `feat:`, `fix:`/`bug:`, `refactor:`, `config:`, `doc:`, `wip:`. Example: `feat: add product hero image`.
- PRs include: concise description, linked issues, screenshots for UI changes, notes on breaking changes, and Netlify preview link (if available). Keep changes scoped to one concern.

## Security & Configuration Tips
- Node: use v22.13+ (see `engines` in both `package.json`s).
- Netlify env: set `URL` for CapJS validation; never commit secrets. Prefer Netlify/Studio-managed env vars and local `*.local` files (ignored).
- Edge/Functions live in `astro/netlify/edge-functions/` and `astro/netlify/functions/`; validate form flows (JS and non-JS) before merging.
