# `theflow` is frozen; `thegraph` inherits its rules by copy

> **Amended by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).**
> *"`thegraph` carries every rule `theflow` held"* no longer holds in full. The
> discipline survives — read the real source, the mechanism/policy boundary, TDD
> behind a test-trust gate, real round-trip proof, an adversarial pass, sweep every
> describing surface, gates run bare, the downstream loop — but it survives **in the
> skills that own each piece**, not in one document. Freezing `theflow` is unchanged.

`thegraph` — the graph-engineering successor specified in
[#13](https://github.com/kihyun1998/kihyun-skills/issues/13) — carries every
rule `theflow` holds. It takes them as a **copy**, and `theflow` is **frozen**
on the same change: bug fixes only, no new precision.

The alternatives were to have `thegraph` read `theflow` at runtime, or to
extract the shared rules into a third document both skills read. Runtime
reference takes a dependency on a skill whose *retirement* is the goal, so the
debt would have to be paid back exactly when the successor is otherwise
finished. Extraction adds a third seam between two skills that already have one,
and it would freeze the rules' current shape at precisely the moment the
successor needs to restructure them — the rules are being re-expressed as node
contracts and edge guards, which is not a reformatting a shared document can
absorb.

The freeze is what makes the copy safe. Two skills holding the same rules is
ordinarily a divergence seed, and this repo's own practice says so: `grill-the-flow`
deliberately does **not** copy `theflow`'s bindings schema, reading it at runtime
instead, on the stated grounds that duplicating it "would be the divergence seed
theflow exists to prevent". This decision is a scoped exception to that
principle, and the scope is what earns it — with `theflow` frozen, the two copies
differ as a frozen v1 differs from an advancing v2. That is a version gap, which
resolves by retirement, not a divergence, which resolves by reconciliation. The
non-duplication rule still governs *inside* the new pair: `grill-the-graph` reads
`thegraph`'s node-type catalog at runtime and does not copy it.

Restructuring `theflow` in place was never available. It is installed in 19
repositories, each with a bindings doc written against its current seven-step
shape.

## Consequences

- **`theflow` stops improving.** New precision lands only in `thegraph`, so the
  19 repositories running `theflow` receive no further refinements. Accepted:
  any of them can be built into a graph at any time, and the bindings doc that
  makes that possible is already in each of them.
- **A rule that is genuinely wrong must be fixed twice** while both skills live.
  Bounded by the freeze — only bug fixes qualify, so the set of changes that can
  touch both is small and always reactive.
- **A wanted non-bug change to `theflow` is the signal this decision failed.**
  If the freeze cannot hold, the successor is not actually succeeding it, and
  this ADR should be revisited rather than quietly bent.
- **Retirement deletes the duplication along with `theflow`.** Until then the
  copy is the transition cost, paid up front and visibly, instead of a
  reconciliation cost paid repeatedly and invisibly.
- **Retirement is the maintainer's call, made by feel after use.** No acceptance
  metric gates it; the spec records that a formal regression baseline (mapping
  `theflow`'s war-story index onto the graph) was considered and declined, and
  that the accepted cost is meeting an inheritance gap as a defect rather than
  catching it against a baseline.
