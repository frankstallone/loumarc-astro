# Astro 6 Upgrade Record

Completed: March 12, 2026

## Summary

The Astro site has been upgraded to Astro 6 after `@sanity/astro` published official Astro 6 support.

Current Astro app package targets:

- `astro@^6.0.3`
- `@astrojs/netlify@^7.0.1`
- `@astrojs/partytown@^2.1.5`
- `@astrojs/sitemap@^3.7.1`
- `@sanity/astro@3.3.0`

Removed during the cutover:

- `astro-purgecss`

## Repository changes

The upgrade kept the existing site contracts unchanged:

- page routes and dynamic slug generation
- Netlify form gate on `/forms/*`
- Netlify function redirect on `/api/*`
- Sanity content fetching through `sanity:client`
- current Partytown forwarding and sitemap generation

The implementation changed only the Astro dependency stack and removed the unsupported PurgeCSS integration from [`astro/astro.config.mjs`](/Users/starlord/github/loumarc-astro/astro/astro.config.mjs).

## Verification results

These commands passed after the upgrade:

```bash
npm run check:astro6-gate
npm install
npm run lint
npm run build
```

Verified results:

- the package metadata gate is now open because `@sanity/astro@3.3.0` declares `astro: ^6.0.0`
- install completes without the old `astro-purgecss` peer warning
- `astro check` passes with `0 errors` and `0 warnings`
- the production build succeeds on Astro 6 with the Netlify adapter
- `@astrojs/netlify` still accepts `devFeatures.environmentVariables` and `devFeatures.images`

Current non-blocking hints left unchanged:

- JSDoc typing hint in `astro/netlify/edge-functions/forms-gate.ts`
- inline script hint in `astro/src/components/Head.astro`

## Notes

- No Sanity client migration was needed because the upstream integration now supports Astro 6.
- CSS purging is no longer part of the build. If bundle size becomes a problem, treat that as a separate optimization task instead of reintroducing `astro-purgecss`.
