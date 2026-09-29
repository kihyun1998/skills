# The traversal is a run-level statement, and `sweep` gets the slot it never had

> **Superseded by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).** State
> slots are gone, so the one this gave `sweep` has no successor. **The traversal
> statement survives** and is no longer prose inside a catalog: it is the one
> guaranteed stop in `thegraph`'s order, with [`read-it`](../../read-it/) holding
> what it has to carry.

*Absorbs 0038, which proposed a `plan` **node** for the same gap and was reverted
four days later. Its number is vacated; see [the index](README.md). The gap it
named is real, its rejection of a human approval node is still load-bearing
below, and three quarters of this record is about how much smaller the fix turned
out to be.*

## The gap

`thegraph` never says which nodes this run will use. Each node knows its own
inbound guard, and the run ends with a Definition of Done that is explicitly
*"checked by a pass, not by recollection"* — but nothing tells that pass what was
supposed to have run. **The bar has a firing mechanism and no roster to fire
against**, which is the fourth instance of the shape
[ADR-0030](0030-the-staying-nodes-absorb-their-reflexes.md) named and
[ADR-0037](0037-placement-is-a-node-because-the-alternative-was-four-files.md)
repeated: *a bar with no firing mechanism is the same defect wearing a different
noun.*

## What actually prevents a skipped node, and where it stops working

Not discipline — **state**. The slot table is a dependency graph: `classify`
writes `change_type`, `boundary` writes `split`, `place` writes `placement`, and
`implement` reads all three. A node that never ran leaves its consumer's slot
empty, so the omission surfaces at the next reader rather than at a roll call.
That is why the catalog can say *"there is no skip-this-node act"* and mean it:
the guard's evaluation is already in state, so nothing is skipped in silence.

The mechanism is sound and it had one hole. **`sweep` writes the surfaces, and no
node reads them.** It was the only node whose output has no downstream consumer,
so it was the only one whose absence left no empty slot behind. The protection
the other nodes get for free is exactly the protection `sweep` did not get, and
the run where that bites is the long one — the same condition the catalog already
names as when a remembered rule gets dropped.

## The first fix was a node, and it was wrong three ways

The obvious shape for *"tell me what you are about to do"* is a `plan` node,
placed after `classify`, reading `change_type` and the build's roster, writing
`plan`, declaring the traversal and proceeding. It shipped and was reverted.

**It could not see the one node it was built to watch.** The argument was that
`sweep` writes surfaces nobody reads, so its omission leaves no empty slot. True,
and only half the sentence: **its *completion* leaves nothing behind either.** The
comparison the node existed to enable — declared against flushed — therefore
called `sweep` a silent skip on **every** run, including the ones where it swept
every surface. **A detector stuck on is not a detector.**

**Its own slot had no reader.** The state table said `plan` was read by the Done
pass and `batch`; `batch`'s contract reads `candidates` and `agreed_direction`
and names no plan. So the node reproduced, in the same commit, the exact defect
it was built to fix — and falsified the glossary entry it added, which called
`sweep` the one node whose output nothing reads.

**Its guard could not fire where it stood.** `plan` sat after `classify`, before
any diff, before `boundary`, before `enumerate`. Two of its three fork clauses
need evidence that does not exist yet — and the record said so in its own
consequences; the third was `place`'s guard word for word, at a point where it is
less determinable. Both endpoints of that edge — `classify`'s *"a decision is
presented with its enumerated consequences, or it is not ready to present"* and
`decide`'s restatement of the same bar — cannot be satisfied where `hidden_state`,
`sources`, `split`, and `findings` are all empty by construction. And the
clause's decider was never labelled, which is invariant ④ on the one edge in the
catalog that lacked it.

**And `scripts/check-restructure-spec.py` was red at that commit.** The gate this
repo runs on its own spec, green one commit earlier, unrun. The `gate` node's
whole content is *run every gate, bare*; the change that added a node type did
not run the gate that exists to catch exactly that.

## What replaced it, and why it is smaller

**The slot goes where the hole is.** `sweep` now writes `swept` — the surfaces
written **and** the surfaces read and found not to apply. That puts it inside the
mechanism every other node already had: an omission surfaces because a slot is
empty. No node type, no roster to keep, and the second half of the slot is what
distinguishes a surface correctly passed over from one nobody opened, which no
roster comparison could have told apart anyway.

**The roster was already in hand.** `docs/agents/thegraph.md` is read on **every
run** — the first instruction in the skill. The Done pass can compare against it
directly, so the missing fact needed no node, no slot, no durable flush, and no
edge. Storing a derived roster and then forbidding its refresh would also have
been the *"a stored list is a derivable fact that rots"* rule broken from the
inside.

**The announcement is run-level.**
[ADR-0030](0030-the-staying-nodes-absorb-their-reflexes.md) already landed two
obligations at run level rather than as nodes, for the same reason: they govern
the run, not a position in it. This is the third.

## The stop is unconditional, and that is the maintainer's call

The reverted node was an **AI** node that declared the traversal and proceeded,
interrupting only on evidence. That choice was argued carefully, and the argument
against a human approval gate still stands on its own terms — three costs, in
rising order:

| Cost | Why |
|---|---|
| a fourth human door | `batch`, `stop`, and `decide` are the three, and invariant ③ exists to keep the count from growing — one shape for handing something to the maintainer |
| offloading | the roster is derivable from the build plus `change_type`. The routing habit's own words: *"Asking what the code already answers is offloading work"* |
| ritual | `brief` refused automation for this exact reason — *"you will over-fire and become ritual, or under-fire and never know"* — and a gate that fires on schedule rather than on evidence is the over-firing case by construction |

The third is the sharpest: **an approval sought every run is an approval nobody
reads by the fourth run, and an unread gate is worse than none** — it launders a
skim into recorded consent.

**The maintainer chose the unconditional stop anyway, having been shown that
argument**, and one fact decided it: **every human node in this graph is
edge-triggered.** `batch`, `stop`, and `decide` all wait for a guard, so a run in
which no guard happens to fire reaches a person for the first time at `batch` —
after the implementation, the proof, the sweep, and the gates. Whatever the
ritual risk of stopping every run, the alternative was a routine change going
start to finish with no place for the maintainer to redirect it. **A guaranteed
stop that is sometimes skimmed beats a conditional one that a routine run never
reaches.**

This is a product call, not a derivation. It is the maintainer's to reverse, and
what would reverse it is evidence of the ritual: go-aheads given without reading,
or a traversal statement nobody has ever corrected.

## Consequences

- **`docs/thegraph-restructure.md` Inventory 4 gains `swept`**, and the
  sixteen-slot claim moves with it, along with the gate's two hardcoded literals.
- **A pre-existing defect is removed rather than corrected.** Inventory 1 read
  *"Count: 17 rows, 17 nodes"* while holding 18 rows, since ADR-0037 added
  `place`. The gate's regex was anchored on that literal, so it matched the stale
  line and stayed green — **a count claim that cannot go wrong because nothing
  compares it to anything.** Setting it to 18 would have rebuilt the same trap, so
  both roster counts are gone: Inventory 1 and Inventory 4 are checked against
  `thegraph`'s own tables in full, and a number restates what that check already
  sees. **Inventory 2 keeps its count**, because its roster has no external
  authority to be checked against and that number is the only check it has. The
  anchors are now claims the gate verifies instead of tallies it cannot.
- **No fixture changes and no build slot.** No node type was added, so the
  full-graph fixtures' rosters stay correct and nothing new is asked of a
  compiled build.
- **The try-and-revert is recorded here rather than in a record of its own.** A
  node that shipped and was reverted in the same week is one decision with a
  wrong first attempt, not two decisions — and the attempt's own reasoning is
  what produced both the slot and the maintainer's call above.
