# One file is not one home

> **Superseded by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).** The
> three copies are one: there is no catalog table, no state table and no per-node
> header. **The rule stands**, and its last instance was the one measured here.

> **Amended 2026-09-03 by [ADR-0065](0065-this-repos-thegraph-build-is-retired.md).
> `scripts/check-graph-schema.py` is deleted, and the three copies are uncompared
> again.** The rule below is unchanged — a copy earns its place by answering a
> different question — and so is the finding that motivated it: the catalog's
> three statements of its own graph disagreed in **eleven** places. What is gone
> is the gate. ADR-0065 carries this as a known hole.

## What was found

`thegraph/SKILL.md` states its own graph **three times**, and nothing had ever
compared them:

| Copy | Shape | Answers |
|---|---|---|
| the node-type table | one row per type | `Decider`, `Delegable`, `Count` |
| the State table | one row per slot | `Written by`, `Read by` |
| each node header | one line per node | `Reads`, `Writes`, `Decider`, delegability |

The first comparison returned **eleven** disagreements. Every one was a node
header omitting an edge the State table declared:

- `decide` carried no `**Reads**` / `**Writes**` line at all — the only node in
  the file without one;
- `batch` named three of the six slots it reads, missing `build_gaps`,
  `catalog_gaps`, and `findings`;
- `reference` omitted `change_type`, which is its **routing key**;
- `implement`, `promote`, and `gate` each omitted one slot;
- `verify` said *"both corpora"* where the table names `sources`;
- and in the one case the header was right, the table's `Read-by` for `sources`
  had dropped `enumerate`.

## Why nothing caught it

[ADR-0051](0051-a-copy-names-its-authority-and-is-checked-against-it.md) already
says a copy names its authority and is checked against it, and this repo now runs
five gates that do exactly that. Every one of them compares **across files** —
`cluster.py` against `docs/adr/`, `gates.py` against the hook, `stamp_check.py`
against the build, `check-skills.py` against `README.md`.

`sweep`'s surface roster is likewise a list of **files**. A fact restated inside
one file is on no surface, so the pass that exists to find drift cannot reach it.

The reason is a reading, not an oversight. *"One fact, one home"* is heard as
*"one file"*, because a file is what a home looks like from outside. It is not:
a home is **one place a reader is sent to get the answer**, and three tables in
one document are three places.

## The decision

**A copy is a second statement of a fact, not a second file.** ADR-0051's rule
applies unchanged; what changes is where it is looked for. When a document states
the same fact in two shapes because each shape answers a different question —
which is a good reason and the reason here — the shapes are cross-checked, in the
same change that creates the second one.

`scripts/check-graph-schema.py` does that for this catalog. It is a **repo-level**
check beside `check-skills.py`, not a `/grill-the-graph` artifact, and carries no
build stamp: the catalog is a skill in this repo and the check says the same thing
for every repo that installs it.

## What was deliberately not gated

The node-type table's `Delegable` column mixes subagent delegation (`yes`,
`fetch only`) with script extraction (`as a script`, `query only`), and a header
discharges the second by saying *"extracted as a script"*. Demanding that a
header carry the word *delegable* would be the check
[ADR-0053](0053-a-delegated-nodes-license-is-its-tool-grant-not-its-brief.md)
already threw away once: a rule whose question is sidestepped by rephrasing is a
formality wearing a gate's clothes. So the gate asks only the decidable
direction — a header calling itself delegable where the table says **never** —
plus the roster in both directions. If the other direction is ever worth gating,
it wants a declaration form like invariant ①'s `**Runs:**`, not a substring.

## [Amended by 0060] The other direction was worth gating, and it got the form

The section above stands as written — the reasoning was right and the condition
it set is the one that fired. It is amended because its **premise is now false**:
the other direction is gated.

What supplied the missing measurement was a defect the gap produced. `sweep`'s
header carried **Writes** the surfaces and **Delegable** with no statement of
which half went to the subagent, and the two were held apart by a pronoun in a
later paragraph. Nothing shipped wrong — the generated agent was read-only — but
the catalog would have read the same either way, and the grant check fires only
after a build has written the agent.

So the direction was opened on the terms this record set: a `**Delegated:**`
declaration in the node header, with a floor that it name a slot the node's own
`**Writes**` declares. Not a substring, and not the word *delegable*. See
[0060](0060-a-delegable-node-declares-what-is-delegated.md).

## What the sweep found, before this was called finished

[ADR-0055](0055-a-new-rule-is-swept-for-before-it-is-called-finished.md) requires
the corpus and the rule's inverse to be swept before any consequence line. Both
passes returned something, which is why this section exists rather than a
sentence saying the change was done:

- **The corpus.** The first pass compared two copies. Widening it found the
  **third** — the node-type table — which the first pass had read past. Two
  further disagreements surfaced there and are recorded above as not-gated.
- **The inverse.** *"A count whose authority is a table elsewhere is deleted"*
  ([ADR-0039](0039-the-traversal-is-a-run-level-statement-and-sweep-gets-a-slot.md))
  is this rule seen from the other end, and the same widening applied to it found
  two live counts already false before this change: the build doc claimed **19**
  mutations in `check-skills.py` and **1** in `check-restructure-spec.py`, where
  the scripts print **20** and **14**. Deleted rather than corrected a third time.
  `CLAUDE.md`'s *"Twelve / Five / Seven"* went the same way.
- **One rewrite was reverted.** The build doc's *"What this update moved"* section
  is a record of the build at `c39f0a0`; editing its `9 → 10 surfaces` to match
  today would be `sweep`'s never-rewrite-a-published-entry rule broken by the
  change enforcing its sibling.

## What this does not cover

It says nothing about how many copies a document *should* have — three was the
right number here and the check exists so it can stay three. It does not reach
duplication of **prose** stating the same rule twice, which is a judgement no
parser makes. And the gate reads one file by name: a second catalog would need
its own, which is the correct cost, since a generalised version would have to
guess which tables in an arbitrary document are copies of each other.
