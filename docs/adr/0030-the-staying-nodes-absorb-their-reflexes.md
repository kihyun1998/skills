# The staying nodes absorb their reflexes, and an inventory that cannot say "yet" is not an inventory

> **Superseded by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).** There
> are no nodes. The reflexes this record folded *into* nodes were taken back out:
> they now fire on being noticed rather than at a point in a sequence, which is
> the inverse of what this decided and was reached by measuring that every sibling
> skill describes itself as a trigger and none as a step.

> **Amended 2026-09-03 by [ADR-0065](0065-this-repos-thegraph-build-is-retired.md).**
> `scripts/check-restructure-spec.py`, named below in the present tense as
> rejecting a blank status, is deleted. The inventory rule stands on the spec's
> own authority now.

The first three extractions under
[ADR-0042](0042-a-nodes-method-leaves-its-bound-stays.md)'s seam — `redden`,
`lens`, `boundary` — moved methods **out** of `thegraph`. This is the other direction: the reflexes that belong to nodes
**staying** in `thegraph`, folded in.

Five landed, and the scope is exactly those whose destination is not moving:

| Reflex | Landed in | What it added |
|---|---|---|
| restate-don't-echo | `classify` | restate the acceptance and route from the restatement; proceed silently when it settles the route; one named fork to `decide` |
| press-the-decision | `decide` | never supply the rationale first; press once after the call; narrow rather than repeat; an unexplained gap is recorded, not forced |
| keep-only-what-earned-it | `decide` | a bound reaching here may mean the foundation is wrong; a restart names what it keeps |
| taste-your-own-output | run level | the Definition of Done is checked by a **pass**, not by recollection |
| size the deliberation | run level | invariant ① answers *which mind*; nothing answered *how hard to think* |

Everything else stays mapped-but-unlanded on purpose. `shower`, `re0`, `debloat`,
and `ssotize` belong to `sweep`; `aim`, `nba`, and `hate`'s root-collapse belong
to `batch`; `factchk` belongs to `reference`. **Those nodes are scheduled to
leave**, so folding a reflex in now is work done twice — once here, once in the
skill it moves to. Each travels with its own extraction.

## The two run-level gaps were real absences, not restatements

`thegraph` had a **Definition of Done** and no pass that checks it. That is the
shape the method distrusts everywhere else: `gate` is a script and the trigger
check is a diff match precisely because a rule you must remember at the end is one
that gets skipped exactly when the run was long. A bar with no firing mechanism is
the same defect wearing a different noun, and it sat in the reasoning habits
unnoticed until the inventory asked where `sip` lands.

And invariant ① answers *which mind* runs a node — adjudicating on the main
thread, read-without-adjudicating delegable — while nothing answered **how hard to
think**. The two are independent: a mechanical rename across many files is cheap
work wanting a careful sweep. The rule added is the one that keeps the dial
honest: **more deliberation never substitutes for the proof surface.**

## The inventory could not answer the question it exists for

Inventory 2 of [the restructure spec](../thegraph-restructure.md) mapped all 28
paperthin reflexes to a destination and had **no status column**. Asked *"is it
all reflected yet?"* the table could only say where things belong — which reads,
at a glance, as though they are there.

It now carries a status per row, and
`scripts/check-restructure-spec.py` rejects a row whose status is blank or
unrecognised, with a `--selftest` mutation proving that check can fail. Current
count: **9 landed, 12 pending, 5 with no home, 3 already held.**

That column is the point of this ADR as much as the five folds are. A plan that
records intent and not progress is indistinguishable from a finished one, and the
gap only shows when somebody asks.

## Consequences

- **`classify` gained the restatement step**, which is where a mis-route is
  cheapest to prevent and most expensive to discover: an acceptance framing an
  open decision reads as ordinary work if it was skimmed, and the enumeration then
  arrives after approval, when its costs get demoted into follow-ups.
- **`decide` gained a frame-injection ban.** Handing the maintainer a rationale
  before they reach one produces a call they can restate but have not earned.
  `classify`'s open-decision route already buys the enumerated consequences; the
  new rule is to present those and stop.
- **The Done bar now names which siblings to re-run on your own output**, which
  makes the extracted skills load-bearing at the end of a run and not only inside
  the node that first invoked them.
- **Nothing was folded into a node scheduled to leave**, so no fold will need
  redoing.
