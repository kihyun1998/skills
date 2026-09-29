# The issue contract names the cases, and the comparison that reads them keys on answered rather than on `human`

> **Amended by [ADR-0071](0071-thegraph-is-four-skills-in-order.md).** The
> contract is [`read-it`](../../read-it/)'s, not `thegraph`'s, and the Done pass
> whose comparison this record keyed is gone with the run state it compared.
> `Required cases` is live as one of six slots read at the start.

> **Scoped by [ADR-0069](0069-tickets-is-retired.md).** `Required cases` and the
> answered-keyed comparison are live; both belong to `thegraph`. What is gone is the
> producer this record widened — `tickets` is retired. Its widening is the evidence
> that survives: the slot list went from five to six here and the producer needed
> **zero** edits, because it read the section at runtime instead of holding a copy.


## The gap

The issue contract had five slots — *Agreed direction · Decided interfaces ·
Proof expectation · Out of scope · Anchor* — and **none of them asked what must
be built**. A producer could fill all five carefully and still drop a requirement
the ticket's own prose named, because no slot asked for the list.

Measured on `/thegraph .scratch/the-marks-share-one-alphabet 01` in
a private work repository. That ticket named two worries in a section above its
checklist; its checklist bullet named neither. The run built to the bullet, and
the pair the ticket named was never drawn. The maintainer found it by looking at
the sheet, and the repair took three `fix:` commits.

**The contract was present and filled.** All five subsections, each marked
`provenance: derived`. Its **Agreed direction** transcribed one of the two
worries and dropped the other — because the slot it was filling asks for a
*direction*, and a direction is not a list of cases. The mechanism
[ADR-0045](0045-the-issue-contract-is-thegraphs-schema-and-the-producer-lives-outside.md)
built worked exactly as designed and lost the requirement in the same place the
run did.

## Why the graph could not close this on its own

The first proposal was that `classify` flush its restatement and the Done pass
compare the output against it. That is the shape this record exists to refuse,
and ADR-0045 had already refused it in its own words:

> **Self-grading.** `classify` requires the acceptance to be restated and routed
> from the restatement. That is a test only while the acceptance came from
> somewhere else; a graph that authored it would be restating its own words.

The Done pass rules the same way from its own side — it declines to compare
against the traversal declaration because that was *generated from* `inherited`,
so the two agree by construction. A reference the run authored, in the same
breath and from the same reading, cannot detect that reading's skim.

Two further defects, recorded because each constrains the shape:

1. `classify` **Reads** the change and the issue's *acceptance*. A restatement
   built from it inherits the same blind spot — in the measured run it would have
   held the bullet and not the missing pair.
2. A revision that put the restatement in the traversal declaration is
   impossible, not merely weak. The declaration is `entry`'s flush, and `entry`
   is the run's start **before** `classify` — the only guaranteed stop happens
   before the node that would write the value.

## The decision

**A sixth issue-contract slot, `Required cases`**, and **one Done-pass line that
reads it**.

The slot is the second in the list, between **Agreed direction** and **Decided
interfaces**, in order of decreasing abstraction. It may be answered `"none"`
like every other.

Nothing else moves. The carrier already exists — `inherited`, read by
`boundary`, `place`, `implement`, `proof`, `verify`, `sweep`, `batch` and the
Done pass. The producer widens itself: `tickets` is told not to hardcode the
slots and to read the schema at runtime, so *"when thegraph gains a slot, this
skill widens with it."*

## Why a contract slot and not a **State** slot

Inventory 4's rule is that a proposal needing a new state slot has found the
wrong seam, and the two slots admitted under it — `inherited` and `loops` —
each arrived because a value had **no carrier**: a delegable node cannot see the
main thread, and two bars already written read a fact nothing held. Neither test
fires here. The value's readers are the contract's existing readers.

The State route was also measured for cost. Four edits are gate-mandatory — the
State-table row, `classify`'s **Writes**, `implement`'s **Reads**, and the
Inventory 4 slot list — and it would move the hand-written *"declares 19 slots"*
count in [`../thegraph-state-model.md`](../thegraph-state-model.md), on the one
surface whose own rule is that an ungraded claim is a defect. The contract slot
moves none of it.

**And the decisive argument is the one the first proposal made against a sixth
slot: that it would put the requirement in a second place.** It does the
opposite. The contract is transcribed once, outside the run, by the producer that
watched the decision. The State slot would have had the run paraphrase the ticket
at minute one — that is the second copy, and it is the self-grading one.

## Why the comparison keys on *answered*, never on `human`

The Done pass already compares each **`human`** entry against the slot the node
flushed. That one detects a node that *re-decided* a call its owner had made, so
it keys on the mark that licenses a downgrade — and the asymmetry ADR-0045
recorded holds: a call wrongly marked `human` is silent, because no transcript
holds the finding the lens did not make.

**This comparison licenses nothing and downgrades nothing.** It can only ever
*add* a finding — that the output lacks a case the issue named. There is no
silent direction for it to fail in, so a `derived` answer is compared too. Keying
it on `human` would blind it to protect a licence it never asks for, and would
have made it a no-op on the very ticket that produced this record, where all five
slots read `derived`.

**A slot the issue left empty is a no-op**, not a finding. The contract already
says an empty slot is the ordinary case rather than a gap, and a line that fired
on every ticket written before the slot existed would be noise rather than a
detector.

## What this does not claim

**Nothing gates either edit.** `grep -rn "\- \[ \]" scripts/` returns zero hits,
and deleting every checklist line from `thegraph/SKILL.md` leaves all sixteen
hook commands green. The contract's slot list is in no Inventory and no checker.
The mechanism is that `tickets` reads the section at runtime and the Done pass
carries the line — the same standing the rest of this method's prose discipline
has, and it is stated rather than dressed up.

`classify` is **not** widened. Reading a ticket's free prose is the *producer's*
job, while the conversation is still in the window; the graph reads the contract.
Widening it would re-open ADR-0045's ruling that anything outside the contract
section is the producer's own text, to buy what the slot already buys.

## Left for its own record

The Done pass runs `redden`, `lens` and `boundary` on the run's own output and
does **not** run `code-review`'s Spec axis, whose whole brief is requirements the
spec asked for that are missing — and which is already a Declared external and a
hard `requires:` of `gate`. A real omission, and a different fix: it reads the
ticket rather than a transcription of it. It needs a fixed point the Done pass
would have to supply, a tool grant for two sub-agents that `agent_grant_check.py`
cannot see, and an argument against the divergence that forbids giving two
readers split material.
