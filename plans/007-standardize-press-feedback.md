# 007 — Standardize press feedback

- **Status**: TODO
- **Commit**: c3c5ce9
- **Severity**: LOW
- **Category**: Physicality and cohesion
- **Estimated scope**: 3 files, shared button behavior plus scoped override

## Problem

The global button style has no press transform. Only selected homepage CTAs move,
and they use `translateY(1px)` rather than a consistent physical compression.
Form submits, buttons on other pages, and mobile menu controls feel flat.

```css
/* astro/src/css/global.css:199 — current */
button:not(.mobile-open):not(.mobile-close),
.button {
  display: block;
  /* visual properties; no transition or active transform */
}
```

```css
/* astro/src/pages/index.astro:659 — current */
:global(.home-header #main-navigation .button:active),
.home-hero__actions .button:active,
.home-products__grid :global(.button:active) {
  transform: translateY(1px);
}
```

```css
/* astro/src/css/blocks/navigation.css:109 — current */
.mobile-open { /* no transform transition */ }
.mobile-close { /* no transform transition */ }
```

## Target

Every pressable button compresses to `scale(0.97)` with the audit's exact strong
ease-out curve and a 140ms duration.

```css
/* target */
button:not(.mobile-open):not(.mobile-close),
.button {
  transition:
    transform 140ms cubic-bezier(0.23, 1, 0.32, 1),
    background-color 200ms ease,
    color 200ms ease;
}

button:not(.mobile-open):not(.mobile-close):active,
.button:active {
  transform: scale(0.97);
}

.mobile-open,
.mobile-close {
  transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
}

.mobile-open:active,
.mobile-close:active {
  transform: scale(0.97);
}
```

Change the homepage scoped active rule to `transform: scale(0.97)` so its higher
specificity does not override the global target with `translateY(1px)`.

## Repo conventions to follow

- Shared element behavior belongs in `astro/src/css/global.css`.
- Menu-control styling remains in `astro/src/css/blocks/navigation.css`.
- Homepage-specific overrides remain in `astro/src/pages/index.astro`.
- Use exactly `140ms` and `cubic-bezier(0.23, 1, 0.32, 1)`.

## Steps

1. Add explicit transform/background/color transitions to the global button rule.
2. Add the global `:active { transform: scale(0.97) }` selectors.
3. Add transform transitions and active scale to mobile open/close controls.
4. Replace the homepage active `translateY(1px)` with `scale(0.97)`.
5. Keep hover lift separate and capability-gated by Plan 004.

## Boundaries

- Do NOT change padding, radii, colors, text, or button markup.
- Do NOT add bounce or scale below `0.97`.
- Do NOT animate width, height, margin, or padding.
- If Plan 009 has tokenized the exact values, use those tokens instead of
  duplicating literals.

## Verification

- **Mechanical**: run `npm run lint` and `npm run build`; both must exit 0.
- **Feel check**: press homepage CTAs, form submit buttons, card CTAs, and both
  mobile menu controls with mouse, keyboard, and touch emulation.
  - Pointer/touch presses compress subtly and release immediately.
  - Keyboard activation does not leave a transformed state behind.
  - At 10% playback the scale bottoms at exactly `0.97` with no bounce.
- **Done when**: all button families share the same subtle press response.
