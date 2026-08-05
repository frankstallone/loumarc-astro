# 009 — Consolidate motion tokens and properties

- **Status**: TODO
- **Commit**: c3c5ce9
- **Severity**: LOW
- **Category**: Cohesion and tokens
- **Estimated scope**: 4 files, token definition and consumer migration

## Problem

The declared motion tokens bundle duration and easing but omit a transition
property, encouraging implicit `transition-property: all`. Two tokens are unused,
while actual components hardcode 180ms, 220ms, 500ms, and 900ms.

```css
/* astro/src/css/variables.css:81 — current */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
--transition-base: 250ms var(--ease-out-quart);
--transition-movement: 200ms linear;
--transition-fade: 200ms ease;
```

```css
/* astro/src/css/global.css:246 — current */
footer a,
footer a:visited {
  transition: var(--transition-base);
}
```

```css
/* astro/src/pages/index.astro:347 — current */
transition:
  color 180ms var(--ease-out-quart),
  transform 180ms var(--ease-out-quart);
```

## Target

Tokens describe reusable durations and deliberate curves. Every consumer names
its transitioned property.

```css
/* astro/src/css/variables.css — target */
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--duration-press: 140ms;
--duration-feedback: 200ms;
--duration-drawer: 220ms;
--duration-marketing: 900ms;
```

After Plans 001–008, migrate exact equivalent consumers:

```css
/* target examples */
transition: color var(--duration-feedback) ease;
transition: transform var(--duration-press) var(--ease-out);
transition: transform var(--duration-feedback) ease;
transition: opacity var(--duration-drawer) var(--ease-drawer);
animation: hero-image-in var(--duration-marketing) var(--ease-out) both;
```

Remove `--ease-out-quart`, `--transition-base`, `--transition-movement`, and
`--transition-fade` only after `rg` confirms zero remaining consumers.

## Repo conventions to follow

- Global tokens live in `astro/src/css/variables.css`.
- Use the audit's exact curves and duration values shown above.
- Hover/color uses built-in `ease`; entry/press uses `--ease-out`; drawer uses
  `--ease-drawer`.
- Transition declarations must name `color`, `background-color`, `opacity`, or
  `transform`; never rely on `all`.

## Steps

1. Add the six target tokens to `variables.css`.
2. In `global.css`, migrate gallery transform, global button feedback, and footer
   links. Footer must be exactly
   `transition: color var(--duration-feedback) ease`.
3. In `navigation.css`, migrate menu opacity to drawer tokens and menu-control
   press transforms to press tokens. Remove the desktop-nav background transition
   if no selector changes that background; dead transitions should not remain.
4. In `index.astro`, migrate home-link, hero, product image, field border-color,
   and CTA transitions. Remove the unused `box-shadow` transition if no focus
   state changes box-shadow.
5. Run `rg -n -- 'ease-out-quart|transition-base|transition-movement|transition-fade' astro/src`.
6. When it returns no consumers, remove the four obsolete definitions.

## Boundaries

- Execute this after Plans 001–008. Drift caused by those plans is expected;
  any unrelated drift should stop execution.
- Do NOT change visual states, scale values, or durations beyond the exact target.
- Do NOT add unused easing or duration tokens.
- Do NOT add dependencies or JavaScript.

## Verification

- **Mechanical**: run the `rg` command in Step 5 and confirm no obsolete token
  consumers, then run `npm run lint` and `npm run build`; both must exit 0.
- **Feel check**: compare homepage cards, buttons, mobile navigation, product
  galleries, and footer links before/after at normal speed and 10% playback.
  - Equivalent interactions share equivalent timing.
  - Hover colors use `ease`; presses use strong ease-out; the drawer uses its curve.
  - No element animates an unspecified property.
- **Done when**: motion values have semantic ownership and no `transition: all`
  behavior remains.
