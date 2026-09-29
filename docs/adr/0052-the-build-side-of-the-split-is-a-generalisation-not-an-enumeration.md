# The build side of the split is a generalisation, not an enumeration

## The gap

`thegraph/SKILL.md` describes one boundary from two sides. *"What the build must
supply"* is the schema — what a compiled graph must answer. *"What is invariant,
what the build decides"* is the split — who is entitled to answer it.
(Both sections have since moved to `thegraph/build-contract.md`, keeping their
names. Nothing this record decides depends on which file holds them.)
`/grill-the-graph` walks the first against the second once per build, and an entry
on neither side is `unowned`.

The split's build side named **four list kinds**:

> each node's source list, surface list, command list, and path list

Several schema entries are none of those four. A `proof` **method** is a
procedure. A `sweep` **policy** — whether the changelog is snapshotted at publish
— is a yes/no. `search`'s **record roster** is a list, just not one of the four.
Every one of them is answered correctly by every build that has ever run, which
is exactly what keeps the gap invisible: the schema asked, a build answered,
nothing errored.

## The measurement, which is the whole reason this is a record

The obvious reading is *"the list is a few items short"*, and it is wrong. Six
compiled builds were on disk, five of them carrying the coverage check, every one
recompiled 2026-08-31 against the same catalog:

| Build | Slots it reported unowned |
|---|---|
| `justerm` | `proof` method + traps · record areas |
| `justrdp` | `proof` method + traps · record areas |
| `flutter_table_plus` | `proof` method + traps · record areas |
| `kihyun-skills` | those two, **plus** the changelog policy — and three more it could only call *marginal* |
| a private work repository | **neither** |

*Tracker capability and the war-story index are excluded: `cd8dc6f` placed them
part-way through the window, so a build reporting them is dating itself rather
than disagreeing.*

**Zero, two, and three — from one mechanical check, whose two inputs are two
sections of one shared file.** No repository value enters the computation, so the
disagreement cannot be repo-specific; it is a property of the question.

The private work repository is the load-bearing row. It is not a build that skipped the walk — it
documents running it twice, *"as every build must"* — and it answers both slots
more richly than any other build in the table: **twelve claim classes** with a
proof method each and **six** tautological-proof traps. It had the most to report
and reported nothing.

## The decision

**The build side names a general property and gives examples of it, never a
closed set.**

> each node's **data — everything it reads and everything it checks against**,
> its source, surface, command and path lists **among them**, along with its
> method, its traps, and the policies it applies to a surface

with two limits stated in the same breath:

1. **A node's *data* is not its *bound*.** What it reads from state, what it
   writes, who decides its exit, what sends an edge back stay fixed in the
   catalog, as do the bounds of every extracted method. Without this the
   generalisation swallows the catalog, and the next check finds the hole
   pointing the other way.
2. **The kinds named after "data" are examples and never the definition** — said
   outright, because the phrasing alone cannot carry it.

The extraction plan's **artifact manifest and its build stamp** get their own
clause. They are not a node's data, and a generalisation that pretended to reach
them would be the mirror defect.

## What actually changed, and it is not the wording

The coverage check used to ask *"is this slot one of the kinds listed?"* It now
asks **"is it something a node reads or checks against, and is it not a bound?"**

The first question has no procedure — a reader decides whether a proof method
"is a list", and five of them decided three different ways. The second has one.
That is the difference between a check and a poll, and it is why extending the
enumeration was rejected: **six named kinds have the property that produced this
record, and that row is the evidence that a longer list is not a more readable
one.**

## Why not route `proof`'s method to a sibling skill instead

`flutter_table_plus`'s build proposed it — *"`redden` owns the test-trust method,
so this is a live routing question rather than a wording one"* — and it is
answered by reading the catalog rather than deciding anything. Two different
things were being named:

| | Owner |
|---|---|
| the method that judges whether a proof can be trusted | **`redden`**, and the `proof` node already routes to it in as many words |
| what proof convinces this maintainer for layer N — *"real PTY capture"*, *"Playwright over `demo/*.html` × dpr 1/1.1/1.5/2"* | **the build** |

Six builds answer the second six ways with the method intact in all six, which is
the split's own rule verbatim: *if a repository may answer it differently without
breaking the method, the build decides it.* The routing was already done; the
proposal had routed the other half.

## Consequences

- Six slots stop reading as unowned, and **not one build's answer changes.** That
  is the shape of every placement in this section: the value was always there and
  the sentence saying who owned it was not.
- Four consumer builds carry `pending — needs a thegraph change` markers that are
  now stale. Each lifts at that repo's next `/grill-the-graph` run — this record
  is what the run will read.
- The three entries the last run could only call **marginal** — `map`'s file,
  where the glossary and records live, the artifact manifest — are decided. Two
  fall to the general phrase without being named, which is the case for a
  generalisation over a longer list stated as plainly as it can be.
- **This does not promise there is no sixth slot.** What it removes is the
  failure mode where a slot is unowned *because two readers disagree about
  whether it resembles a named kind*. A future `unowned` finding is now a claim
  that something is neither read nor checked against — a claim with an answer.

## Relation to the trail

[0047](0047-a-state-slot-declares-how-it-combines.md) is the same genre: a slot
needing a property nobody had assigned, closed by making the implicit default an
explicit declaration. This record does the same to the split's build side — the
implicit default there was *"the list is complete"*, and nothing said so.

[0049](0049-a-prose-rule-and-the-pattern-that-reads-it-are-one-design.md) is the
nearer precedent for the mechanism. A prose rule and the check that reads it are
one design; here the prose rule was written in a shape its own check could not
evaluate, and five evaluations returning three answers is what that looks like
from the outside.

The failure was already recorded once against this very section — the project's
seams stayed *"named all along"* in the schema while missing from the list, and
only an extraction forced the question to be routed. That fix was made for the
one value that surfaced. Nobody swept the rest, and every sweep since has found
more.
