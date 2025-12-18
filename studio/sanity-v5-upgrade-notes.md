# Sanity Studio v5 upgrade summary

## Current Studio versions (post-upgrade)
- `sanity@5.0.1` with `@sanity/vision@5.0.1`.
- UI stack: `@sanity/ui@3.1.11`, `@sanity/icons@3.7.4`, `styled-components@6.1.19`.
- React stack: `react@19.2.2`, `react-dom@19.2.2`, `@types/react@19.2.7`.
- Engines: package.json still enforces Node >=22.13.0 (local installs on lower Node may warn but Studio builds target that range).

## Migration impact for this repo
- **Dependencies aligned to v5:** Studio dependencies are now on the Sanity v5 line with React 19.2.x, matching required peers for Sanity and Vision.
- **Custom desk structure:** No code changes were required beyond dependency bumps; smoke-test the Desk structure, previews, and tutorial plugin UI in `npm run dev`.
- **Content consumers:** Astro’s headless consumers are unaffected by Studio-only dependency changes, but a quick publish + site content check is recommended after deploying the updated Studio.

## Sanity v5 breaking changes and status
- **React + UI peer minimums (breaking):** Sanity v5 requires React 18+ and the matching `@sanity/ui`/`@sanity/icons` majors; Studio now uses React 19.2.x with `@sanity/ui@3` and `@sanity/icons@3`, satisfying those requirements.
- **Node runtime floor (breaking):** The v5 line expects modern Node LTS (18+). The Studio `engines` entry remains `>=22.13.0`, so installs and builds stay above the minimum.
- **Vision/plugin alignment (breaking):** Sanity’s first-party tools (e.g., Vision) have v5 releases that must match core. Both `sanity` and `@sanity/vision` are on `5.0.1`, keeping the Studio on a supported set without additional config changes.

## Follow-up verification checklist
1) From `studio/`, run `npm run build` to confirm the Studio compiles under v5 dependencies.
2) Launch `npm run dev` and verify Desk panes (especially `siteSettings`) and Vision queries.
3) Deploy the Studio and perform a content edit/publish cycle, then validate the Astro site renders the updated content as expected.
