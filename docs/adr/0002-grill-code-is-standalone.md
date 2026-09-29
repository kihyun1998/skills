# `grill-code` is standalone — it does not delegate to `code-review`/`audit`

> **Amended 2026-08-30.** The skill named `review` when this was written is now
> `code-review` upstream; see [ADR-0001](0001-acceptance-gate-delegates-to-review.md).
> Names updated in place — this record's argument is about *not* depending on it,
> which the rename does not touch.

`grill-code` runs its own scan and scoring rather than driving the existing
`code-review`, `audit`, `harden`, or `improve-codebase-architecture` skills. We
chose this over composition — the path [ADR-0001](0001-acceptance-gate-delegates-to-review.md)
took for the Acceptance Gate — because the outputs do not line up. The Gate
could delegate cleanly only because `code-review`'s Standards/Spec report *is*
exactly the Gate's input, a 1:1 fit. `grill-code` instead has to emit one
unified, scored, prioritised report across heterogeneous modes (security,
common-component extraction, refactoring, learning); the candidate skills each
produce a differently-shaped conclusion (`code-review` = diff Standards/Spec,
`audit` = frontend P0–P3, `harden` = code edits, not a report), so fanning out
and re-normalising their results into a single priority table would cost more
than scanning directly — and would still need a bespoke scoring layer on top.

## Consequences

- `grill-code` carries its own scan and scoring logic, so it is heavier to
  build and maintain than a thin composition would be. The upside is it is
  self-contained: it has no hard dependency on the Matt Pocock skill collection
  (`code-review`/`audit`/…), which is installed separately and may be absent on a
  given machine — the failure mode ADR-0001 accepted for the Gate.
- The two skills now embody opposite answers to the same question. That is
  deliberate: delegate when a downstream skill's output is your exact input
  (the Gate); stay standalone when you must reconcile several differently-shaped
  outputs into one (grill-code).
