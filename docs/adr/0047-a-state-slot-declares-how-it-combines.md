# A state slot declares how it combines, and only the main thread writes one

> **Superseded by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).** There
> is no state. Each step is a skill that returns to its caller, so nothing
> accumulates in a slot and nothing needs a rule for how two writes resolve.

*Absorbs 0046, which extended invariant ② with a third property, shipped, and was
reverted the same day. Its number is vacated; see [the index](README.md). It was
the fourth call of one audit, and the other three stand — so this is one decision
with a wrong fourth attempt, not two decisions. The audit itself is
[`../thegraph-state-model.md`](../thegraph-state-model.md), a working spec and not
a record; what is decided lives here.*

## The gap

`thegraph`'s `## State` declared seventeen slots with a writer and a reader each,
and stopped. It never said how two writes to one slot resolve, where a slot
without one of the three flush destinations lives durably, or who performs the
write when a delegated node returns.

The settled prior art for graph state closes exactly these, and closes them by
refusing to guess. LangGraph's default channel raises rather than pick a winner —
*"can receive only one value per step, use an Annotated key to handle multiple
values"* — and its silent last-write-wins channel documents the cost in its own
docstring: *"assumes that if multiple values are received, they are all equal."*
The principle underneath is one this method already holds everywhere else:
**remove the implicit default and make it a declaration**, because a silent winner
leaves no transcript.

## Why the slot table could not have caught this itself

[ADR-0039](0039-the-traversal-is-a-run-level-statement-and-sweep-gets-a-slot.md)
established what the table is for:

> The slot table is a dependency graph … A node that never ran leaves its
> consumer's slot empty, so the omission surfaces at the next reader rather than
> at a roll call.

That mechanism reads the **presence** of a value. Every gap here is about a
value's **shape** — how two of them combine, where the one being held survives,
who put it there. A full slot satisfies the mechanism whatever those answers are,
which is why four of them sat unnoticed while the table itself was cited as
sound.

## The decisions

**① A queued candidate is current state, and current state goes in the body.**
`candidates`, `dropped` and `build_gaps` matched none of the three flush
destinations and were barred from the tracker before `batch` by invariant ③, so
the run cache was the only place left — a cache this method itself declares
deletable. Each flush now edits them into the working issue's body, for the same
reason the judgements go there. This makes an existing sentence true rather than
adding a guarantee: *"rebuilt by re-reading the issue"* did not hold for these
three slots before.

It generalises an argument
[ADR-0036](0036-a-carried-build-gap-needs-a-durable-address.md) already made for
`build_gaps` alone, and 0036 is amended in the change that falsified it. The
window is **narrowed, not closed**: the flush is per node exit, so a cache lost
between a candidate being queued and its node exiting is still lost.

> **Amended after reading the pipeline data-passing prior art.** This shipped
> putting the *entries* in the body, and the body is the small, current,
> rewritten thing. A candidate carries the envelope's seven columns, every node
> exit rewrites the body, and `nit` records this repo's own tracker storing a
> truncated prefix and returning success — so the destination chosen to stop a
> silent loss had a silent loss of its own.
>
> **The body holds the address; the comment holds the payload.** Airflow keys an
> XCom row and bounds its value with the metadata store, escaping through a
> backend the `clear()` note confirms is a genuinely separate place — *"this will
> not purge any data from a custom XCom backend"*; Dagster names the seam as an
> interface, `handle_output` deciding where an op's output lands. Here the body
> carries a handle and a one-line label, the columns go to the append-only
> comment they were always going to, and growth follows the number of queued
> items rather than their text.
>
> **The handle needed no mechanism**: these slots are `append`, nothing before
> `batch` removes an earlier item, so an item's position in its slot *is* its
> handle. And the pre-write half is a borrow, not an invention — `nit` already
> makes *"too long" sayable before the write*.

**② A `Combines` column.** `append` adds and never removes; `replace` holds one
current value a later write supersedes; **`keyed`** is a map from a name the node
already has to that instance's value.

> **Amended the same day.** This shipped with **two** values; the third is added
> below. The original reasoning is kept, because it was sound: a value for
> relation-enrolling *was* drafted and dropped, correctly, since enrolling is a
> flush mechanism for what `batch` files and no slot uses it. What the record got
> wrong was concluding from one wrong third value that there was no right one.
>
> **`keyed` is for the fan-out slots, and both other values are wrong for them.**
> `sources`, `proof` and `swept` are each written by N instances of one node type
> — one per source class, per layer, per surface. Under `append` an instance that
> re-runs leaves its stale entry beside the fresh one with nothing saying which is
> current; under `replace` the second instance overwrites the first, and a
> three-layer graph keeps one proof. The key lets entries coexist *and* supersede,
> and is never invented — the node already had the name, which is what the
> catalog's Count column has been saying all along.
>
> This settles half of the reverted fourth call: **invalidating a `keyed` slot is
> well defined** — the writer re-writes its key. It was undefined for `append`,
> which is the defect that reverted 0046.

The column is not derivable from the flush destination, and ① is what separated
them: before it, evidence appended to a comment and judgements replaced in the
body, so destination implied combine. `candidates` now appends *and* lives in the
body.

**③ A delegated node returns a report; the main thread performs the write.** The
outbound half was already settled — run-scoped rows travel in the invocation,
never baked into a generated artifact — and the inbound half had no rule at all.
This is the write-side pair of the trust rule `batch` states: that one governs
what may leave state, this one what may enter it.

Its consequence is the one worth having, and it needs both halves to work: an
empty delegation still flushes, **and on an `append` slot it must flush
something**, since appending nothing leaves exactly the trace of never having run.
`verify` therefore carries the obligation `sweep` already had — a pass that finds
nothing records the corpora it walked. That is ADR-0039's `sweep` problem
appearing in a second place, found only because the first half was written before
the second.

## The fourth call, and why it was reverted

0046 extended invariant ② from (guard, bound) to (guard, bound, invalidates),
with the set **derived** — every slot written between a back-edge's target and its
origin. Two adversarial passes over the same corpus, one hunting omissions and one
taking the opposing stance, converged on four defects:

- **Nothing records which back-edges fired**, so the Done-pass clause it landed in
  was three acts of recollection at the end of the longest runs — the bar the
  record itself quoted the method as refusing.
- **The derivation was wrong on arrival.** It includes `triggers`, absent from the
  stated list, and invalidating `triggers` would double-count `promote`'s
  two-trigger bar. Read literally it also invalidates the candidate queue ① had
  just given a home. And *"between"* was inclusive of the origin on one edge and
  exclusive on another, four lines apart.
- **It did not compose with ②.** Three of the four slots the `gate` edge
  invalidated are `append`, whose declared behaviour is never to remove.
- **It invented a build override for an invariant that admits none**, against
  *"No build may override these"* and against the fixture it was added to.

**The gap it aimed at is real and stays open.** A loop leaves state describing
code that no longer exists, and 0039's mechanism cannot see it, because a stale
slot is **full** rather than empty. What the attempt got wrong is order: the fix
cannot be authored before deciding what invalidation *means* for the slots it
touches, and cannot be checked before something records which edges fired.

**Both are now answered, in that order.** The slots a back-edge would invalidate
are the fan-out slots; they are `keyed`, and invalidating a `keyed` slot is the
writer re-writing its key. And an eighteenth slot, **`loops`**, records a fired
edge when it fires — written by the node whose guard fired, `append`, read by the
Done pass and by `decide`.

`loops` was not built for the invariant, which is why it stands on its own: two
bars already in this catalog read a fact nothing carried. `gate`'s bound counts
three consecutive failures **with the same signature**, and `decide` reads *"a
back-edge that keeps re-firing"* to judge whether the foundation is wrong rather
than the fix — the most expensive call in the graph, resting on recollection. The
cheaper alternative, inferring a fired edge from a node flushing twice, was tested
against the field that owns the problem and fails: a second flush has three
possible causes here, and durable execution recovers position by replaying code
against its log rather than by reading repetition as control flow. Replay is
unavailable to a method whose nodes are prose executed by judgement, so what
remains is to write the fact down when it happens.

**A second attempt at the fourth call is therefore unblocked, and is still not
this record.** Both of its inputs now exist; whether invariant ② should carry the
third property is a decision to take on its own evidence rather than because the
obstacles were cleared.

## Consequences

- The state slots' combine joins the **Fixed here** list in the invariant/build
  split. A repository answering it differently would break the method, and a
  property answerable in the schema but placed on neither side of that split is
  the `unowned` shape this catalog has already been caught by once.
- `grill-the-graph` gains no grilled slot. All three decisions are catalog-fixed,
  so a build supplies nothing new; only its `build_gaps` fallback chain grew a
  middle term.
- **The counts stay in the catalog's Count column and nowhere else.** They were
  briefly copied into the slot table's writer column, which is the two-tables
  drift `grill-the-graph` records as having already bitten this repo. The prose
  points at the Count column instead.
- Three attacks were made on these decisions and **held**; they are recorded in
  the audit's Verification section so a later reader does not re-run them.
- The durable-execution prior art — deterministic replay, event sourcing — bears
  on ① and was **not read** before ① shipped. That is a debt against this
  toolkit's own exit guard, not a note about future reading.
