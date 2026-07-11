# 004 — Gate hover movement by input capability

- **Status**: TODO
- **Commit**: c3c5ce9
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 2 files, selector reorganization

## Problem

Positional hover effects run under bare `:hover`. Touch browsers can synthesize
or retain hover, leaving gallery images, product images, or CTAs transformed
after a tap.

```css
/* astro/src/css/global.css:222 — current */
.gallery img:hover,
.gallery picture:hover,
.gallery source:hover {
  transform: scale(1.025);
}

/* astro/src/pages/index.astro:540 and 652 — current */
.home-products__grid :global(.card > a:hover img) {
  transform: scale(1.025);
}

.home-hero__actions .button:hover,
.home-products__grid :global(.button:hover) {
  transform: translateY(-1px);
}
```

## Target

Movement caused by hover must exist only for a hover-capable fine pointer.
Non-positional color and underline feedback may remain outside the query.

```css
/* target pattern */
@media (hover: hover) and (pointer: fine) {
  .gallery img:hover {
    transform: scale(1.025);
  }
}
```

Apply the same exact media query around homepage product-image zoom and CTA
`translateY(-1px)`. Do not gate `:active` press feedback.

## Repo conventions to follow

- Responsive rules use native CSS media queries.
- Preserve current scale `1.025` and hover lift `-1px`.
- Plan 001 may have reduced the gallery selector to `.gallery img:hover`; accept
  that expected state rather than restoring parent/source selectors.

## Steps

1. In `astro/src/css/global.css`, wrap the final gallery transform hover rule in
   `@media (hover: hover) and (pointer: fine)`.
2. In `astro/src/pages/index.astro`, wrap the product-card image zoom rule in the
   same query.
3. Keep button background-color hover outside the query, but move only its
   `transform: translateY(-1px)` into a fine-pointer query. Split the declarations
   if necessary.
4. Confirm active/press selectors remain available to touch.

## Boundaries

- Do NOT remove hover color or underline feedback.
- Do NOT use viewport width as a proxy for input capability.
- Do NOT change transition values in this plan.
- If Plan 001 or 006 changed selector formatting, preserve their behavior.

## Verification

- **Mechanical**: run `npm run lint` and `npm run build`; both must exit 0.
- **Feel check**:
  - With mouse/trackpad, gallery and product zoom still work.
  - With touch emulation, tapping never leaves an image enlarged or CTA lifted.
  - Active press feedback still appears on touch.
- **Done when**: every hover transform is capability-gated and touch retains no
  false-hover movement.
