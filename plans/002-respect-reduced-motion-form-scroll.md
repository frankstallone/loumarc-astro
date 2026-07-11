# 002 — Respect reduced motion during form validation

- **Status**: TODO
- **Commit**: c3c5ce9
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 3 files, three equivalent script edits

## Problem

All form variants force a smooth programmatic scroll when CAPTCHA validation
fails. Explicit `behavior: 'smooth'` is not neutralized by the CSS reset.

```ts
// astro/src/components/FormBuilder.astro:289 — current
cap.scrollIntoView({ behavior: 'smooth', block: 'center' })

// astro/src/components/RequestForm.astro:212 — current
rCap.scrollIntoView({ behavior: 'smooth', block: 'center' })

// astro/src/components/AccessibilityForm.astro:169 — current
aCap.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

## Target

Use smooth scrolling normally and immediate scrolling when the operating system
requests reduced motion.

```ts
// target pattern in each component
const reduceMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)',
).matches

cap.scrollIntoView({
  behavior: reduceMotion ? 'auto' : 'smooth',
  block: 'center',
})
```

Use each component's existing prefix (`cap`, `rCap`, or `aCap`). Evaluate the
media query at validation time or once beside the existing DOM references; do
not introduce a package.

## Repo conventions to follow

- Form behavior is implemented in inline TypeScript inside each Astro component.
- Preserve each file's existing formatting; `AccessibilityForm.astro` currently
  uses semicolons while the other two do not.
- Existing focus transfer after scrolling must remain unchanged.

## Steps

1. Add the exact `matchMedia('(prefers-reduced-motion: reduce)')` check to
   `FormBuilder.astro` and branch its `scrollIntoView` behavior.
2. Apply the same logic to `RequestForm.astro` using `rCap`.
3. Apply the same logic to `AccessibilityForm.astro` using `aCap`.
4. Preserve the current `block: 'center'`, CAPTCHA focus, and pending-submit flow.

## Boundaries

- Do NOT change form submission, validation text, redirects, or CAPTCHA behavior.
- Do NOT extract a shared form module in this plan.
- Do NOT add dependencies.
- If any cited form no longer uses the shown call, STOP and report.

## Verification

- **Mechanical**: run `npm run lint` and `npm run build`; both must exit 0.
- **Feel check**: submit each form without completing CAPTCHA.
  - With normal motion, the CAPTCHA scroll remains smooth.
  - With reduced motion enabled, the CAPTCHA moves into view immediately.
  - Focus still lands on the CAPTCHA in both modes.
- **Done when**: no explicit smooth validation scroll runs under reduced motion.
