# Placement is a node, because spreading it over four files was the alternative

> **Superseded by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).**
> Placement is not a node, there being none. **The reasoning stands and moved**:
> [`make-it`](../../make-it/) reads the tree, any declared layout rule and the
> folder-structure reference together when a file needs a home — and it fires on
> meeting a homeless file rather than at a numbered step, which is the correction
> this record could not have made.

`thegraph` had no answer to *where does this file go*. The habit was there —

> **First principles + named prior art, together.** **Architecture** and
> domain-semantics decisions are derived from first principles *and*
> cross-checked against named prior art.

— and so was the routing rule that splits the routine case from the maintainer's:
*"anything derivable from code plus named prior art"* is the AI's, while
**structure** is explicitly one of `decide`'s types. Both applied. Neither fired,
because a habit stated to apply *throughout* fires nowhere in particular. This is
the third instance of the shape [ADR-0030](0030-the-staying-nodes-absorb-their-reflexes.md)
named: **a bar with no firing mechanism is the same defect wearing a different
noun.**

## The first proposal was not a node, and that was the mistake

The obvious reading of the split rule sends this to the build: a repo may lay
itself out differently without breaking the method, so the build decides. That is
true of the tree *rule* and false of the *node* that reads it, and conflating the
two produced a plan that touched four files:

| Where | Why it was needed |
|---|---|
| `thegraph` — build slot | the tree rule itself |
| `thegraph` — `boundary` node | somewhere to read it at run time |
| `boundary/SKILL.md` | *"layout is the physical expression of the seam"* governs work of its kind anywhere, so by the seam rule it is a **method** and could not stay in the node |
| `grill-the-graph` | compiling it |

The third row is the tell. It existed **only because the second row refused to be
a node**: a concern with no home gets smeared across the nearest ones, and the
smear then has to be split again along the method/bound seam that
[ADR-0042](0042-a-nodes-method-leaves-its-bound-stays.md) drew. One fact, four
homes.

There is a second cost, and it is the one the invariants care about. Folding
placement into `boundary` gives that node **two out-edges for unrelated reasons**
— `stop` for an upstream defect, `decide` for a structure call. Invariant ④ says
every condition names its decider; a node whose two edges have different deciders
for different kinds of reason still satisfies the letter and blurs the reading.

So `place` is a node. It costs one section and one state slot, and it takes the
`boundary` skill back out of the change entirely.

## What it is not

**It does not fetch.** The peer projects are a `reference` source class like any
other and `place` consumes `sources`. That keeps `firsthand`'s grade cap intact
— a layout read off a documentation site is a **summarized** class and cannot
produce a `CONFIRMED` finding, while a peer repository's actual tree can — and it
keeps peer trees out of the build. The rule is stored, the peers are *named*,
their contents are read when acted on. `downstream`'s rule applies unchanged: a
stored copy of somebody else's tree is a derivable fact that rots.

**It does not get its own divergence list.** Layout exceptions go in the
deliberate-divergence list the build already supplies. One new slot, not three.

**It does not ask what the rule already answers.** A path following from the tree
rule plus named prior art is derived and presented; only a new top-level area, or
a prior-art conflict the tie-breaker does not settle, reaches `decide`.

## The guard is a script, and it runs twice

`place` decides the path before the code exists. That alone would have reproduced
the defect this ADR opens with: `implement` writes the files, and a decision
never checked against the artifact is prose. So the tree rule is a path list, a
diff is a path list, and the match is extracted as a `code` condition that runs
again at `gate` on the diff actually produced. `verify`'s inbound guard is the
precedent — *"a script over the diff, not a recollection"*.

## Consequences

- **`boundary/SKILL.md` is untouched.** The extracted method stays where
  ADR-0042 put it, and nothing about layering moved back into the graph.
- **An existing built repo sees a warning, not a rebuild.** The new slot compiles
  empty, `grill-the-graph`'s update path re-grills empty slots, and the build
  stamp warns without rebuilding — the outcome the restructure spec already
  recorded for every catalog change.
- **A drifted repo is not ratified.** The compile induces the tree rule from what
  is in each directory, but a rule already declared in `CLAUDE.md`, `CONTEXT.md`,
  or a record **outranks the induction**, and a tree that contradicts itself is
  grilled rather than resolved by majority. `fixtures/tree-split.md` covers the
  second half.
- **The declared-rule precedence has no fixture.** It varies a second input, so
  folding it into `tree-split.md` would leave that fixture green with either rule
  deleted. The gap is recorded in the fixture's own closing note rather than left
  to read as covered.
- **Restructuring is still not a step.** `place` writes `triggers` when the same
  placement is argued twice; `verify` counts them and `promote` writes the
  record, and the restructure itself re-enters at `classify` as its own change.
  Nothing files from inside a run — invariant ③ is unchanged.
