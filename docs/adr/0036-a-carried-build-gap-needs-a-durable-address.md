# A carried `build_gaps` entry needs a durable address, and the flush is two-way

> **Superseded by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).**
> `build_gaps` is deleted, slot and machinery. A run needing something nobody wrote
> down asks then and the answer is appended to the build; there is no queue, no
> re-grill and therefore no carried entry to give a durable address to.

> **Amended by `6d77f3d`, which generalised this record's argument and falsified
> two of its sentences. Both are kept below as written.**
>
> - *"The only place a gap is actually written is run state"* — no longer true.
>   `build_gaps` is now flushed to the working issue's body at every node exit,
>   alongside `candidates` and `dropped`, because the argument this record makes
>   for one slot holds for the whole queue. The Measured table's *"drops G1 with
>   no trace"* describes a failure that can no longer occur in that form.
> - *"`grill-the-graph` needs no change. Its degradation already reads …"* — the
>   sentence it quotes was rewritten in the same commit. The fallback chain is now
>   three terms: the run-state cache, then the worked issues' bodies, then the
>   issues where `batch` kept them.
>
> **What this record still owns is the half the amendment does not touch:**
> surviving a cleanup is not being answered. An entry that outlives one still
> carries no disposition, so carrying is decided at `batch` and never inferred
> from the entry still being there. That is why the two-way flush stays.

`thegraph` already required it:

> *"…carrying it is a real answer only while the substituted value stays written
> down."*

It never said **where**. The only place a gap is actually written is run state,
which the same method calls *"a cache that may be deleted at any time"*. Follow
both sentences and a carried gap evaporates on schedule, legitimately.

## Measured in a live repository

A repository that has run this method for four build cycles:

| The gap | Where it lives | Where else |
|---|---|---|
| **G1** — the `implement`/`proof` claim classes have no row for pure logic in Rust; the run substituted a module-scoped `cargo test` under the same three bars, carried unadjudicated across two runs | `.thegraph/run-03.md`, `.thegraph/run-04.md` | **nowhere** |
| A `triggers.mjs` scoping gap, announced inside a disposition as *"recorded as a `build_gaps` item, not a code defect"* | one issue under `.scratch/` | **no run-state `build_gaps` section holds it** |

Both directions leak, and each is invisible from the other side. Deleting the
cache — which the method invites — drops G1 with no trace. Reading the cache
first — which `grill-the-graph` prescribes — never surfaces the second.

The consequence is not hypothetical: the plan for that repository's rebuild had
*"delete `.thegraph/`, it is a cache"* as a step, and running it before the
rebuild would have destroyed the only record of a two-run-old open question.

## The rule

The substituted value stays written down **where `batch` keeps a disposition, not
only in run state**, and the flush is **two-way**: a gap announced in a
disposition and never written back to `build_gaps` is invisible to the next
build, which reads run state first.

## What this is not

Not a new state slot and not a new node. `build_gaps` already names `batch` and
the next `/grill-the-graph` as its consumers; this says what `batch` owes back.

Not a rule by [`promote`](../../promote/SKILL.md)'s bar either — **one** trigger,
one ambiguity, in one paragraph. It is a clause where the ambiguity was, the same
shape as [ADR-0034](0034-bindings-are-spent-at-the-first-build.md).

## Consequences

- **`grill-the-graph` needs no change.** Its degradation already reads *"the
  run-state cache if it survived, otherwise the issues where `batch` kept them"*.
  The gap was that nothing made the second branch true.
- **Deleting run state stops being lossy**, which is what lets the method keep
  calling it a cache without contradicting itself.
- **An existing repository has to be reconciled by hand once**, because the
  entries predate the rule.
