# 003 — Make the mobile menu exit interruptible

- **Status**: TODO
- **Commit**: c3c5ce9
- **Severity**: MEDIUM
- **Category**: Interruptibility
- **Estimated scope**: 1 file, small CSS change

## Problem

The mobile overlay transitions opacity, but removing `.is-active` immediately
applies `visibility: hidden`. The close animation therefore snaps out instead of
showing the declared 220ms exit, and a close/reopen reversal cannot retarget
continuously.

```css
/* astro/src/css/blocks/navigation.css:68 — current */
.mobile-nav-container {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms var(--ease-out-quart);
}

.mobile-nav-container.is-active {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
}
```

## Target

Delay only the transition to hidden until the opacity exit completes. Opening
must make the overlay visible immediately. Use a transition so reversals retarget
from the current opacity.

```css
/* target */
.mobile-nav-container {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 220ms cubic-bezier(0.32, 0.72, 0, 1),
    visibility 0s linear 220ms;
}

.mobile-nav-container.is-active {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
  transition-delay: 0s;
}
```

## Repo conventions to follow

- Mobile navigation state remains the existing `.is-active` class toggled by
  `astro/src/components/Header.astro:93-119`.
- Use the audit's exact drawer curve:
  `cubic-bezier(0.32, 0.72, 0, 1)`.
- Preserve the current 220ms duration.

## Steps

1. Update the base transition in `astro/src/css/blocks/navigation.css` to the
   exact two-property target above.
2. Add `transition-delay: 0s` to `.mobile-nav-container.is-active`.
3. Leave the Header script, focus restoration, `aria-hidden`, and scroll lock as-is.

## Boundaries

- Do NOT add keyframes, timers, or animation-event JavaScript.
- Do NOT add scale, bounce, or link staggering in this corrective plan.
- Do NOT alter navigation layout or accessibility attributes.
- If the menu is no longer class-driven, STOP and report.

## Verification

- **Mechanical**: run `npm run lint` and `npm run build`; both must exit 0.
- **Feel check**: at a mobile viewport, open and close the menu repeatedly.
  - Closing visibly fades for 220ms before becoming hidden.
  - Reopening during the exit reverses from the current opacity without flashing.
  - At 10% playback, visibility changes only after the exit reaches opacity 0.
- **Done when**: entry and exit both render and rapid reversals stay continuous.
