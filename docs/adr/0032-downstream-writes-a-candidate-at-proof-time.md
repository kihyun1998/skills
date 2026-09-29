# `downstream` writes a candidate at `proof` time, because it never discovered anything

> **Amended by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).** The
> `downstream` node is gone; **the rule is unchanged** and lives in
> [`ask-it`](../../ask-it/). Writing what a release will oblige while the proof's
> evidence is still in front of you, rather than after the release, is exactly what
> that skill does.

[ADR-0042](0042-a-nodes-method-leaves-its-bound-stays.md) left `downstream` as the
one node whose method might or might not separate from publishing. It does not
separate, and the reason turns out to be that there was no method there to begin
with.

The two nodes say so themselves:

> `proof`: *"Link the local build into an actual consumer, run its **full** suite,
> and the strongest evidence is a consumer test that **pinned the old bug as its
> expected value now breaking**."*
>
> `downstream`: *"flip the tests that pinned the old bug as expected — **the same
> tests that broke at `proof`**."*

**`proof` already found the list.** `downstream` was written as though it went
looking, and it never did: it acted, later, on something already in hand.

## So it moves earlier, not out

The obligation is **dated by the release**. The knowledge is not.

Deferring the writing until after the release asks the question at the worst
available moment — the branch is merged, the run is over, and the one person who
could say whether a given workaround was bug-avoidance or something else has
stopped looking at it. At `proof` time they are staring straight at the broken
test that proves it.

So the node now runs beside `proof` and **writes a candidate** whose condition is
the release, in the envelope's own columns: **Measured** names which consumer
tests broke, **Direction** says remove-or-keep for each with the reason a keep
gets recorded under, and **Still the agreed call?** carries the answer for a
purely additive release — that consumers are obliged *nothing*, which is worth
writing rather than leaving as an empty section.

## Why not a bare notification, and why not delete the node

**A notification was the tempting shape** and it is the weakest one available. What
this catches is silent: a stale workaround produces no error, no failing test, no
warning. A note saying *"check your consumers"* hands the whole job back to memory
at the moment attention is lowest — the shape `gate` exists to refuse, one step
removed. A candidate is a notification that arrives carrying its evidence, and
invariant ③ already routes it.

**Deleting the node type was the other tempting shape**, on the argument that a
trigger outside the run makes something a follow-up rather than a node. That
argument is sound and the cost is disproportionate:

- Five `grill-the-graph` fixtures use `downstream` as their worked example of an
  absent node, and they are a regression baseline.
- Its derivation row — *"whether the project publishes"* — is the cleanest evidence
  case in that table.
- **`thegraph`'s own thesis paragraph uses it**: *"a project that publishes nothing
  has no downstream node, so there is nothing to skip and nothing to record about
  the skipping."* That sentence is why a compiled graph beats a step list, and
  deleting the node costs it its example.

And the saving would be nil. In a repo that publishes nothing the node is
**already absent**; carrying one more type in a catalog costs such a repo nothing.
Moving the trigger inside the run resolves the objection without paying any of it.

## Consequences

- **The node got smaller and stopped asking for an investigation.** The instruction
  it used to carry — go to each consumer, raise the constraint, walk the
  workarounds — is now the candidate's Direction, decided by a human with the
  measurement in front of them.
- **Its decider changed** from `AI` to *AI to compose, human at `batch` to
  dispose*, and it now writes `candidates`. Both are recorded in the catalog.
- **Nothing about the build changed**, so by
  [ADR-0041](0041-a-behind-stamp-with-no-missing-slot-is-informational.md)'s stamp
  rule a behind stamp here is informational.
- **The derive-don't-store rule survives intact.** The candidate holds *measured
  evidence about specific tests*, not a roster; the consumer list is still derived
  by grepping sibling manifests at the moment of acting.
- **Every node type is now resolved.** Twelve extracted, five whole. The
  restructure spec has no open node.
