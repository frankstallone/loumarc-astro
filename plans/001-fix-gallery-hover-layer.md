# 001 — Fix the gallery hover layer

- **Status**: TODO
- **Commit**: c3c5ce9
- **Severity**: MEDIUM
- **Category**: Physicality and performance
- **Estimated scope**: 2 files, small CSS-only change

## Problem

Product galleries apply the same hover transform and shadow to a `<picture>` and
its nested `<img>`. Both selectors match under the pointer, so the scale compounds
to roughly `1.0506` and two elements participate in the effect.

```css
/* astro/src/css/global.css:216 — current */
.gallery img,
.gallery picture,
.gallery source {
  border-radius: var(--border-radius);
}
.gallery img:hover,
.gallery picture:hover,
.gallery source:hover {
  box-shadow: 0px 10px 32px -3px rgba(0, 0, 0, 0.1);
  transform: scale(1.025);
  transition: var(--transition-base);
}

.gallery img:not(:hover),
.gallery picture:not(:hover),
.gallery source:not(:hover) {
  transition: var(--transition-base);
}
```

```astro
<!-- astro/src/pages/products/[slug].astro:91 — current -->
<picture>
  <source ... />
  <img ... />
</picture>
```

## Target

Only the rendered image should move. Do not animate `box-shadow`, do not target
`picture` or `source`, and do not use a property-less transition.

```css
/* target */
.gallery img,
.gallery picture {
  border-radius: var(--border-radius);
}

.gallery img {
  transition: transform 200ms ease;
}

.gallery img:hover {
  transform: scale(1.025);
}
```

Plan 004 will capability-gate this hover rule. This plan only fixes the animated
layer and transitioned property.

## Repo conventions to follow

- Global gallery behavior lives in `astro/src/css/global.css`.
- The existing restrained scale value is `1.025`; preserve it.
- UI hover transitions must stay below 300ms; use exactly `200ms ease`.

## Steps

1. In `astro/src/css/global.css`, keep border radius on `img` and `picture` only.
2. Delete hover and `:not(:hover)` rules for `picture` and `source`.
3. Put `transition: transform 200ms ease` on the base `.gallery img` rule.
4. Keep only `transform: scale(1.025)` in `.gallery img:hover`.
5. Do not change the product-gallery markup.

## Boundaries

- Do NOT change image dimensions, crops, loading, or Sanity image URLs.
- Do NOT add a motion library or JavaScript.
- Do NOT change homepage product-card hover; that belongs to Plan 006.
- If the cited selectors have drifted since `c3c5ce9`, STOP and report.

## Verification

- **Mechanical**: run `npm run lint` and `npm run build`; both must exit 0.
- **Feel check**: open a product page containing a Sanity `<picture>` gallery.
  - Hover one image and confirm the visible scale is `1.025`, not compounded.
  - Confirm no shadow animates during entry or exit.
  - In DevTools at 10% playback, confirm only the `<img>` has a transform.
- **Done when**: one compositor-friendly transform runs on one element per image.
