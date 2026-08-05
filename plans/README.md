# Animation improvement plans

Plans were audited and stamped against commit `c3c5ce9`. Source implementation
must happen outside the read-only advisor workflow.

| Plan | Title | Severity | Status | Dependencies |
| --- | --- | --- | --- | --- |
| 001 | Fix the gallery hover layer | MEDIUM | TODO | None |
| 002 | Respect reduced motion during form validation | MEDIUM | TODO | None |
| 003 | Make the mobile menu exit interruptible | MEDIUM | TODO | None |
| 004 | Gate hover movement by input capability | MEDIUM | TODO | 001 recommended first |
| 005 | Preserve useful feedback in reduced-motion mode | MEDIUM | TODO | 001, 003, 004 recommended first |
| 006 | Tighten product-card hover timing | MEDIUM | TODO | None |
| 007 | Standardize press feedback | LOW | TODO | None |
| 008 | Remove the hero filter animation | LOW | TODO | None |
| 009 | Consolidate motion tokens and properties | LOW | TODO | 001–008 |

## Recommended execution order

1. `001-fix-gallery-hover-layer.md`
2. `002-respect-reduced-motion-form-scroll.md`
3. `003-fix-mobile-menu-exit.md`
4. `004-gate-hover-motion-by-input.md`
5. `006-tighten-product-card-hover.md`
6. `007-standardize-press-feedback.md`
7. `008-remove-hero-filter-animation.md`
8. `005-preserve-reduced-motion-feedback.md`
9. `009-consolidate-motion-tokens.md`

Plan 005 follows the component fixes so its reduced-motion overrides match the
final selectors. Plan 009 runs last because it replaces the exact literal values
introduced by the preceding plans with shared semantic tokens.
