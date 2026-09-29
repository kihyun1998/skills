# The catalog points somewhere

> **Superseded by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).**
> `NODES.md` is deleted. The catalog is one file naming four skills, so the
> per-arrival contract read this record settled has nothing left to read — and the
> open question it left, whether that read is safer than one at the start, is
> unanswerable rather than answered.

> **Amended 2026-09-03 by [ADR-0065](0065-this-repos-thegraph-build-is-retired.md).**
> `check-graph-schema.py` and `check-restructure-spec.py` are named below in the
> present tense as the checks covering the split; both are deleted. The split
> itself — 1,503 lines to three files — stands, and the skill is unchanged.

## What was decided

> **Amended 2026-09-01 — the two new files were named against the tree rule.**
> They shipped as `nodes.md` and `build-contract.md`: lowercase at a skill root,
> which the build's measured rule **S1** reserves for a router subcommand body in
> `nit/` and which divergence **L1** (*flat `UPPERCASE.md`*) does not describe. S1
> read 13/13 clean and went to 13/15 the moment this record landed, and nothing
> reported it, because a measured rule is violated only where someone
> re-measures. They are now `NODES.md` and `BUILD_CONTRACT.md`; every reference
> below names the old paths and is left as written. The general lesson is
> recorded against S1 in `docs/agents/thegraph.md`, not here: **a record that
> creates a file is the moment the tree rule is decided, and this one did not
> look.**

`thegraph` is three files. `SKILL.md` keeps what a run reads on every traversal —
the invariants, the state slots, the node-type table, the reasoning habits, the
issue contract. `NODES.md` holds the per-node contracts. `BUILD_CONTRACT.md`
holds the two sections `/grill-the-graph` reads and no node does.

The file went from **1,503 lines to 671** — 710 lines of node contracts and 139 of
build contract left, and 17 lines of pointer came back.

## Why this record exists rather than a line in the commit

Because `docs/thegraph-restructure.md` said the opposite, in a table this repo
gates. Its Inventory 3 read *"stays"* for the invariant/build split and *"stays
unchanged"* for the build schema. Both moved. A spec row reversed without a
record is the drift the spec exists to prevent, one level up.

The row it did **not** reverse is the one worth naming: `## The nodes` already
read *"shrinks to contracts, bounds, and invocations — the bulk of the
reduction."* The reduction happened by **relocation** instead. The shrink that
row planned is still available and is now a better question than it was, because
it can be measured against a file that holds only nodes.

## What settled it, after an argument that got it backwards

The first pass at this argued for keeping `## The nodes` inside `SKILL.md`. Its
premise was that Anthropic's skill-authoring guidance only ever asks you to split
material that is **conditionally** needed — Pattern 1 is *"Advanced features"*,
Pattern 2 is *"to avoid loading irrelevant context"*, Pattern 3 is *"Conditional
details"* — and that the node contracts are read on most traversals, so the
guidance did not reach them.

Both halves were wrong.

**The guidance has a fourth statement, triggered by size.** *"If workflows become
large or complicated with many steps, consider pushing them into separate files
and tell Claude to read the appropriate file based on the task at hand."*
Eighteen node contracts across 708 lines is that case, and the router it
prescribes is what `classify` already is.

**And the premise was false in this file's own words.** `classify` exits a
trivial change with **no graph at all**, and routes an open decision **straight
to `verify`** — one node of eighteen. The catalog gives `map`, `promote` and
`downstream` a count of `0-1`, so a repo that publishes nothing never reads
`downstream` on any run. The claim that most nodes fire on most traversals came
from `docs/skill-shape-measurements.md`, and it is the one assertion in that
document with no command behind it.

Two further quotations had been read against their own function. *"No context
penalty for large files"* sits eleven lines above *"Bundle comprehensive
resources"* — it is an argument **for** moving material out. And *"if Claude
repeatedly reads the same file, consider whether that content should be in the
main SKILL.md instead"* is a **diagnostic symptom** inside a section that closes
*"iterate based on these observations rather than assumptions"* — and this repo
has no observations of either skill being run.

## The trade-off, observed

Splitting an always-read section bought a real risk: a run that reads `SKILL.md`
and does not follow through to `nodes.md` executes the graph **with no node
contracts**, silently, with nothing erroring. That risk is why the first pass at
this record was defensible, and this record did not discharge it — the pointer
being part of stating the traversal rather than an optional link was supposed to,
together with the sibling issue that gave the traversal declaration a checklist.

**It happened anyway, on the first pilot #44 ran.** Haiku, given the skill
properly through the Skill tool rather than handed its files, read `CLAUDE.md`,
`docs/agents/thegraph.md` and `CONTEXT.md` and never opened `nodes.md` — where
`classify`'s trivial-change exit lives. It reached the right outcome through a
rule that did not apply (*"No build? Degrade"*, on a run that had read a current
build) and recorded a traversal declaration for a route `classify` skips
entirely. Sonnet, same skill, same query, read `nodes.md` unprompted and exited
correctly. Two runs, one pointer, one tier that followed it and one that built a
plausible-sounding substitute instead — see #44's pilot comment for the full
record.

So the checklist did not close the gap by existing; it closed the *traversal
declaration's* half, and the model still has to choose to open the second file.
Nothing here has changed as a result — the split stands, on the L738-740 grounds
this record already gives — but the risk paragraph above is now a measurement
instead of a prediction, and the pointer is not proven sufficient at every tier.
A skill this shape needs a tier floor, or this failure mode recurs at whichever
tier is weakest.

The cross-skill half has no such cover: `build-contract.md` is a contract read by
a *different* skill, a shape the guidance does not describe at all. It is
justified on token cost alone — 139 lines loaded by every run and read by none —
and must not be cited as evidence of conformance.

## What did not change, and why that matters

`grill-the-graph` reads `build-contract.md` **directly**, never through
`SKILL.md`. Routing it through would be two hops, whose documented consequence is
a `head -100` preview and incomplete information — landing on the file whose
whole job is the authoritative slot list.

Both gates that parse the catalog now read the **skill**, not one file:
`check-graph-schema.py` compares three copies that live in two files, and
`check-restructure-spec.py`'s Inventory 3 covers the sections of all three. The
unit is the skill. Scoping either to `SKILL.md` would have made the moved
sections read as bogus rows on the day of the split, and the fix would have
looked like deleting them.

`check-skills.py --selftest` caught the one thing prose review did not: its
`redden` rename mutation expected `thegraph/SKILL.md: depends on`, and the caller
had moved to `nodes.md`. The check still fired; the fixture's expectation was
stale. The file half of that expectation was **updated, not dropped** — matching
on the frontmatter `requires` line instead would have let a reference-layer
mutation pass while the reference layer checked nothing.

## The divergence that remains

`thegraph/SKILL.md` is still over the 500-line guidance — re-run rather than
trusting a number written here, it has moved twice already since the split
(#41, #42). Getting under it would require moving `## State` or
`## The reasoning habits`, both read on every traversal and both without the
size trigger that licensed the node contracts.

**This divergence is no longer unfalsifiable — it has one measurement against
it, and the measurement is not clean.** The guidance's stated rationale is
*optimal performance*, checked by running the skill against Haiku, Sonnet and
Opus. #44's pilot ran Haiku and Sonnet (Opus is not reachable from a subagent;
see #44) against the same query, skill properly invoked rather than handed its
files: Sonnet read `nodes.md` unprompted and exited correctly at `classify`;
Haiku did not reach `nodes.md` at all, reasoned from an inapplicable rule, and
still produced the right diff — a passing outcome by the wrong route, which is
the case for concern rather than reassurance. n=1, one tier, one query; not a
rate. See the trade-off section above for the run.

So the guidance's Haiku question — *"does it provide enough guidance"* — has a
first, negative answer for this pointer, at this tier, on this route. The
divergence is not resolved by this: the split still stands on the L738-740
grounds this record already gives, and one failing cell does not by itself argue
for reversing it. It argues for a tier floor on this skill, or for more cells
before treating the pointer as sufficient. Further evaluations under #44 are
what would either harden that floor into a decision or show the one failure was
noise.
