# 005 — Preserve useful feedback in reduced-motion mode

- **Status**: TODO
- **Commit**: c3c5ce9
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 4 files, targeted reduced-motion rules

## Problem

The reset forces all animations and transitions to `0.01ms`, including harmless
color and opacity feedback. Reduced motion should remove position changes, not
erase every animated state cue.

```css
/* astro/src/css/reset.css:68 — current */
@media (prefers-reduced-motion: reduce) {
  html:focus-within {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Target

Keep automatic scrolling globally, then suppress movement at the components that
move. Retain a 150ms opacity fade for the mobile overlay and 200ms `ease` color
feedback.

```css
/* astro/src/css/reset.css — target */
@media (prefers-reduced-motion: reduce) {
  html:focus-within {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
  }
}
```

```css
/* component-level target pattern */
@media (prefers-reduced-motion: reduce) {
  .gallery img:hover {
    transform: none;
  }

  button:not(.mobile-open):not(.mobile-close):active,
  .button:active {
    transform: none;
  }

  .mobile-nav-container {
    transition:
      opacity 150ms ease,
      visibility 0s linear 150ms;
  }
}
```

In `index.astro`, keep the existing `animation: none` for the hero and add
`transform: none` for product-image hover, CTA hover, and CTA active movement.
Do not disable background-color, color, underline, focus, or opacity feedback.

## Repo conventions to follow

- Reduced-motion CSS already lives in `reset.css` and at the bottom of
  `index.astro`.
- The homepage already correctly disables `hero-image-in` under reduced motion.
- Use exactly `150ms ease` for the reduced-motion menu opacity.

## Steps

1. Remove the universal animation/transition duration overrides from `reset.css`;
   retain the automatic scroll rules.
2. Add a reduced-motion gallery override in `global.css` that prevents hover scale.
3. Add a reduced-motion navigation override that keeps a 150ms opacity fade,
   delays hidden visibility by 150ms, and suppresses active transforms on the
   mobile open/close controls.
4. Extend the existing homepage reduced-motion block to prevent product-image and
   CTA transforms, including `.home-link:active`, while keeping color feedback.
5. Add a global reduced-motion override that suppresses the shared button and
   `.button` active scale introduced by Plan 007.
6. Verify Plan 002 separately handles explicit JavaScript smooth scrolling.

## Boundaries

- Do NOT remove focus indicators or static state changes.
- Do NOT set `transition: none` globally.
- Do NOT re-enable the hero movement under reduced motion.
- Do NOT alter form JavaScript in this plan.

## Verification

- **Mechanical**: run `npm run lint` and `npm run build`; both must exit 0.
- **Feel check**: emulate reduced motion.
  - Hero, gallery, card zoom, and CTA positional movement are absent.
  - Form buttons, links styled as buttons, and mobile menu controls do not scale.
  - Mobile menu still communicates open/close with a brief opacity fade.
  - Footer and button colors still transition visibly but gently.
  - Focus rings and underline changes remain intact.
- **Done when**: reduced motion removes displacement without deleting useful
  non-positional feedback.
