# Partytown integration research

Checked 2026-08-10 against primary sources.

## Summary

Use `@astrojs/partytown` for the Hotjar bootstrap only. Keep both GA4 scripts on the main thread and do not configure `forward: ['dataLayer.push']`. Astro runs only scripts marked `type="text/partytown"` through Partytown; its docs say the browser Network panel should show Partytown intercepting such requests ([Astro integration guide](https://docs.astro.build/en/guides/integrations-guide/partytown/)).

No Partytown or Hotjar sunset was found in their official documentation. Hotjar still documents the same tracking-code installation and verification flow ([Hotjar installation guide](https://help.hotjar.com/hc/en-us/articles/36819972345105-How-to-Install-Your-Hotjar-Tracking-Code), [Hotjar verification guide](https://help.hotjar.com/hc/en-us/articles/36819989669905-How-to-Check-That-Hotjar-Is-Working)).

## Version information

- Reviewed baseline: `@astrojs/partytown: ^2.1.5`; lockfile: `2.1.5`, with `@qwik.dev/partytown` `0.11.2`.
- Current npm `latest`: `2.1.7` ([npm package](https://www.npmjs.com/package/@astrojs/partytown?activeTab=versions)).
- Recommendation: update the declaration to `^2.1.7` and refresh the lockfile to `2.1.7`. The existing caret range can resolve it, but naming the current reviewed baseline makes installs and dependency review explicit. Version `2.1.6` fixes file-descriptor leaks when clients disconnect or reads fail. Version `2.1.7` updates `@qwik.dev/partytown` to `0.13.2` ([Astro changelog](https://github.com/withastro/astro/blob/main/packages/integrations/partytown/CHANGELOG.md#217)).
- No breaking change is documented between `2.1.5` and `2.1.7`. The bundled Partytown changes are backward-compatible: `0.12.0` adds an opt-in `strictProxyHas` option; `0.13.0` is documentation-only; `0.13.1` removes deprecated-API Lighthouse warnings; `0.13.2` changes publishing metadata ([Partytown changelog](https://github.com/QwikDev/partytown/blob/main/CHANGELOG.md#0132)).

## Key concepts

`type="text/partytown"` selects worker execution. `forward` serves a different purpose: it patches a main-thread global and sends calls into the worker. Partytown recommends `forward: ['dataLayer.push']` only when Google Tag Manager or GA itself runs in Partytown ([Partytown GTM guide](https://partytown.qwik.dev/google-tag-manager/), [forwarding guide](https://partytown.qwik.dev/forwarding-events/)). Here GA4 remains ordinary JavaScript, so forwarding its main-thread `dataLayer.push` would cross an unwanted boundary and should stay absent.

## Implementation and validation

1. Build the production output with `npm run build`, then serve `dist/` with a static server for browser QA. The Netlify adapter does not support `astro preview`.
2. Inspect the delivered HTML. Confirm the Hotjar bootstrap has `type="text/partytown"`. Confirm the external GA4 loader and inline `dataLayer`/`gtag` initializer do not have that type.
3. Open a private browser window with blockers disabled. In DevTools Network, filter `partytown`; confirm Partytown library/worker requests load and the Hotjar script is intercepted. In Console, use Astro's default dev/preview debug mode or temporarily set `config.debug: true`; Partytown documents `logScriptExecution` for script execution details ([Astro debug configuration](https://docs.astro.build/en/guides/integrations-guide/partytown/#enabling-debug-mode), [Partytown debugging](https://partytown.qwik.dev/debugging/)).
4. Filter Network by `hotjar`. Confirm requests include only site ID `3055288`, none are red, and the Hotjar dashboard reports **Installation successful** or **Collecting data**. Hotjar calls this Network check its most reliable manual verification ([Hotjar verification guide](https://help.hotjar.com/hc/en-us/articles/36819989669905-How-to-Check-That-Hotjar-Is-Working)).
5. Filter Network by `gtag` or `google-analytics`. Confirm `gtag/js?id=G-G4P6ZWLZZ5` loads normally. In Console, confirm `typeof window.gtag === 'function'` and `Array.isArray(window.dataLayer)`. Trigger a telephone click and confirm its GA request/event while Hotjar continues to send requests.
6. Keep the config assertion that rejects `dataLayer.push` in `forward`. This guards the intended execution split; browser QA proves behavior end to end.

## Common issues

- Blockers can suppress Hotjar and cause a false failure; disable them for verification.
- No Hotjar requests means the tracking code did not execute. Red requests can indicate CSP or another network error. More than one Hotjar site ID means duplicate installation ([Hotjar verification guide](https://help.hotjar.com/hc/en-us/articles/36819989669905-How-to-Check-That-Hotjar-Is-Working)).
- Do not infer worker execution from the Hotjar request alone. Check the script type plus Partytown debug/interception evidence.
