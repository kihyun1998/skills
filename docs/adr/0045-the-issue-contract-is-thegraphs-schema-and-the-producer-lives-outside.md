# The issue contract is thegraph's schema, and its producer lives outside

> **Amended by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).** The schema
> is not `thegraph`'s any more: [`read-it`](../../read-it/) reads the issue and
> holds the six slots. The producer half was already scoped by 0069, and the
> provenance marks went with it — an answer in the contract is now a starting point
> rather than an authority, with no downgrade to license.

> **Scoped by [ADR-0069](0069-tickets-is-retired.md).** The schema half stands
> unchanged: `thegraph` still owns `## What the issue must supply` and still reads
> it at a run's start. The producer half has no instance — `tickets` is retired, so
> a contract is now written by hand or by an upstream slicer. The *"What would make
> this wrong"* condition below, **`derived` turns out to be the only value ever
> written**, is recorded there as having fired on the only run anyone measured; the
> reading it prescribes (the placement is wrong, not the value) is untested, because
> the producer was retired rather than moved.


`thegraph` reads a **Build** to learn what is true of a repository, and
`/grill-the-graph` fills it. It had nothing equivalent for a *change*. The one
thing the executor read from an issue was the acceptance, and its **State** table
named `entry` as a writer of `agreed_direction` — `entry` being neither a node
nor defined anywhere, an unowned row that had sat there since the catalog was
written.

The consequence was paid every time a feature was sharpened in one session and
built in another. The producers that slice a spec into tickets emit four fields;
the calls a maintainer actually made stay in the spec. So `boundary` re-drew a
settled split, `implement` re-picked a named seam, and `verify` reported the
settled call as a finding — correctly, since nothing told it whose call it was.
The reasoning habits predicted this in as many words: *everything reads as a
derivation, and the next strong argument, often one your own `verify` produces,
reopens a call the owner already made.*

## Decision

**`thegraph` owns an entry schema — `## What the issue must supply` — and no
skill that fills it lives inside `thegraph`.**

The split between the two schemas is the scope of the answer: the build answers
what is true of this repository until someone rebuilds it; the issue answers what
is true of this change until it merges. The `tickets` skill fills the second the
way `grill-the-graph` fills the first, and reads the slot list at runtime rather
than copying it.

## Why the producer cannot be a node

**Cardinality.** One spec fans out to N tickets and N runs. A one-to-many
fan-out has no home in a graph that runs once per ticket, and the ticket set
produced is precisely the cluster `spine` reads later. The write side is upstream
of the graph.

**Self-grading.** `classify` requires the acceptance to be restated and routed
from the restatement. That is a test only while the acceptance came from
somewhere else; a graph that authored it would be restating its own words. The
Acceptance Gate rests on the same premise from the other end.

## No node — and one slot, after a first attempt that refused it

**No node.** The contract read is a **run-level statement** attached to the
traversal declaration, which is already mandatory and already the only guaranteed
stop in the graph, so the read costs no new machinery.
[ADR-0039](0039-the-traversal-is-a-run-level-statement-and-sweep-gets-a-slot.md)
is the precedent: it absorbed a record proposing a `plan` **node** for a
neighbouring gap and vacated its number. That node died of **three** defects, and
all three are worth restating because the first attempt at *this* record cited
only two and then repeated the one it omitted:

1. **It could not see the node it was built to watch** — *a detector stuck on is
   not a detector.*
2. Its slot had no reader.
3. Its guard could not fire where it stood.

**And one slot, `inherited`.** This reverses the first attempt, which claimed no
slot was needed. It was wrong, and the way it was wrong is the useful part.

That attempt put only the agreed direction into state and left the other four
values in the opening declaration. But `verify` and `sweep` are **delegable**,
and a delegated node cannot see the main thread — which is the entire reason
state exists. So a `sweep` subagent could not read *out of scope* and would sweep
surfaces the change deliberately avoided; a `verify` subagent could not read
*decided interfaces* and would report a settled interface as a finding. That is
the failure this record opens by describing, reintroduced by the mechanism meant
to remove it.

Inventory 4's rule — *a proposal that needs a slot has found the wrong seam* —
caught it precisely as written. The constraint had been met by **declaring the
need away**, not by removing it. Honouring the rule meant adding the slot.

The slot also repairs defect 1, which the first attempt had reproduced: the Done
pass's *"check the traversal too"* had nothing to compare the contract against,
so a run that announced *"`boundary` will confirm"* and then re-decided left the
same trace as one that confirmed. A slot that flushes is what makes that
comparison exist.

## The downgrade keys on `human`, not on the slot being filled

This is the correction that matters most, and the first attempt had it backwards.

It gated the confirm-instead-of-decide behaviour on a slot being **filled**, and
gave provenance exactly one consequence — a row in the `verify` brief. So a
`tickets` run after a `/clear`, which by its own rule marks everything
unratified, could transcribe an **AI's proposal** out of a spec, and the run
would announce *"`boundary` will confirm"* while `batch` reported the direction
as still agreed. Nobody had agreed to anything. The safe default reached the
silent failure by the shortest path available.

So: `human` licenses the downgrade, writes `agreed_direction`, and enters the
brief. `derived` is accurate but unratified — the node decides as before, from a
stated starting point rather than a fresh lookup. `unknown` is context only and
changes nothing at all. Inference never upgrades any of them.

The asymmetry still stands and is the reason for the ordering. A settled call
re-opened by `verify` is **loud** — provided it actually reaches a human, which
is why a finding contradicting a `human` entry grades `UNADJUDICATED` and never
`DELIBERATE`: the latter is acknowledged in `findings` and goes no further, so
grading it there would delete a challenge to the maintainer's own call and buy
back exactly the silence this rule spends itself avoiding.

## Consequences

- **A `human` entry enters the `verify` brief as a run-scoped
  deliberate-divergence row, not a fifth item.** The four things the brief
  carries are fixed in the catalog. This is not a fifth: that list holds a
  deliberate choice with the record that decided it, and a maintainer's call on
  this issue is that same thing scoped to a run.
- **A `human` entry buys a downgrade, never a skip** — and a filled slot alone buys nothing. `boundary` with an inherited
  split still runs and still takes its `stop` edge if the code disagrees. A
  contract that let a node be skipped would be a build write performed by a
  ticket.
- **An empty slot is the ordinary case and does not reach `build_gaps`.** Routing
  it there was the first attempt's move and is wrong twice: that slot arrives at
  `batch` *as a re-grill request*, so every un-migrated ticket would file five;
  and `grill-the-graph` reads it as **the drift detector its re-run trigger
  otherwise lacks**, where an issue gap is not evidence and buries what is. A
  missing build value has no other route to a human; a missing issue value has
  one already, in a declaration that is a mandatory stop. Every issue already on
  the tracker keeps working, and adoption stays incremental.
- **The contract has a stated shape, and the read has a decider.** A producer and
  a reader sharing only a list of slot names share nothing, so the contract is one
  named section, one subsection per slot, provenance on its own first line.
  Judging whether a slot is answered is prose reading, so the read is labelled
  **AI** like every other condition — invariant ④ applies to a schema as much as
  to an edge.
- **The invariant/build split gains the third scope.** ADR-0042's clause — *an
  extraction that leaves a question with no named answerer has not finished;
  check the split, not only the schema* — applies unchanged, and the first
  attempt failed it. One consequence is concrete: the deliberate-divergence list
  is now **co-authored**, project entries from the build and run entries from the
  issue, and the split says so.
- **`docs/agents/issue-tracker.md` gained the relation operations.** `spine`'s
  decider is `code` because the roster is a relation query, and this repo's
  tracker doc — derived from an upstream config before that config documented
  relations — had never carried the operation. Verified live rather than
  transcribed: the database id and the issue number are different numbers on the
  same issue, and passing the wrong one fails without saying so.
- **The producers upstream stay untouched and stay useful.** A slicer keeps a
  ticket thin because it cannot know who will execute it, and thin is correct for
  it. `tickets` adds a layer on top precisely because here the executor is known.
- **The gain is realised across a `/clear`.** A ticket built in the same window
  as its grilling inherits nothing, because nothing was lost.

## What would make this wrong

- **The declaration plus the Done-pass comparison turn out not to fire.** They
  are the mechanism; if a run reports the contract and re-decides anyway, the
  answer is a `code` condition in the build's extraction plan, deliberately
  declined here on ADR-0039's ground that the smaller fix comes first.
- **`derived` turns out to be the only value ever written.** Then the producer is
  running outside the window where it could observe a decision, and the placement
  is what is wrong, not the value.
- **Provenance marking proves unusable at `unknown`.** If nearly every entry
  lands there, the contract is being filled outside the window it was designed
  for, and the producer's placement — not the default — is what is wrong.
