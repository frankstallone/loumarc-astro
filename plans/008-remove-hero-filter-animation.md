# 008 — Remove the hero filter animation

- **Status**: TODO
- **Commit**: c3c5ce9
- **Severity**: LOW
- **Category**: Performance
- **Estimated scope**: 1 file, two keyframe declarations removed

## Problem

The first-load hero animation runs `filter: saturate()` across a full-width raster
for 900ms. The rare marketing entrance can remain, but it should use compositor-
friendly transform and opacity only.

```css
/* astro/src/pages/index.astro:665 — current */
@keyframes hero-image-in {
  from {
    opacity: 0.82;
    transform: scale(1.015);
    filter: saturate(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
    filter: saturate(1);
  }
}
```

## Target

```css
/* target */
@keyframes hero-image-in {
  from {
    opacity: 0.82;
    transform: scale(1.015);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

Keep the existing 900ms marketing duration, ease-out curve, and reduced-motion
opt-out. Plan 009 may replace those values with exact equivalent tokens.

## Repo conventions to follow

- Homepage animation remains local to `astro/src/pages/index.astro`.
- The existing reduced-motion block already sets `animation: none`.
- Large-raster motion must use transform and opacity only.

## Steps

1. Delete `filter: saturate(0.9)` from the `from` keyframe.
2. Delete `filter: saturate(1)` from the `to` keyframe.
3. Make no other visual or timing changes.

## Boundaries

- Do NOT remove the hero entrance or alter its crop.
- Do NOT change opacity, scale, duration, or image loading.
- Do NOT add `will-change`, blur, or another filter.
- If the keyframe no longer contains saturate, mark this plan DONE.

## Verification

- **Mechanical**: run `npm run lint` and `npm run build`; both must exit 0.
- **Feel check**: hard-refresh the homepage with cache disabled.
  - The image still settles gently from scale `1.015` and opacity `0.82`.
  - DevTools shows only transform and opacity changing.
  - Reduced-motion mode shows no hero entrance.
- **Done when**: the hero entrance is visually intact without animated filters.
