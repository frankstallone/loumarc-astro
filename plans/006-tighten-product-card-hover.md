# 006 — Tighten product-card hover timing

- **Status**: TODO
- **Commit**: c3c5ce9
- **Severity**: MEDIUM
- **Category**: Purpose, frequency, easing, and duration
- **Estimated scope**: 1 file, one transition declaration

## Problem

Homepage product images take 500ms to settle after every hover. A repeated card
interaction should remain below the 300ms UI ceiling and use `ease` for hover.

```css
/* astro/src/pages/index.astro:531 — current */
.home-products__grid :global(.card img) {
  transition: transform 500ms var(--ease-out-quart);
}

.home-products__grid :global(.card > a:hover img) {
  transform: scale(1.025);
}
```

## Target

```css
/* target */
.home-products__grid :global(.card img) {
  transition: transform 200ms ease;
}
```

Preserve the existing `scale(1.025)`. Plan 004 will capability-gate the hover
selector, and Plan 009 may replace `200ms` with an equivalent duration token.

## Repo conventions to follow

- Homepage-specific product styling stays in `astro/src/pages/index.astro`.
- Use a transition, not keyframes, so rapid hover reversals retarget naturally.
- Use exactly `200ms ease` for this high-frequency hover.

## Steps

1. Replace `transform 500ms var(--ease-out-quart)` with
   `transform 200ms ease`.
2. Preserve the image scale and overflow clipping.
3. Do not add opacity, shadow, blur, or layout animation.

## Boundaries

- Do NOT change card sizes, product ordering, crops, or links.
- Do NOT modify the global product gallery; that is Plan 001.
- Do NOT add dependencies or keyframes.
- If the transition no longer reads `500ms`, STOP unless Plan 009 produced the
  documented equivalent tokenized target.

## Verification

- **Mechanical**: run `npm run lint` and `npm run build`; both must exit 0.
- **Feel check**:
  - Sweep rapidly across several cards and confirm each zoom follows immediately.
  - Reverse hover mid-transition and confirm it retargets without restarting.
  - At 10% playback, entry and exit each last 200ms at normal speed.
- **Done when**: the card zoom feels responsive and never exceeds 200ms.
