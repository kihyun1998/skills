---
name: tickets
disable-model-invocation: true
description: "Put back what slicing dropped. Run it right after the tickets are cut, in the same window as the grilling that produced them: it transcribes the calls that were settled into each ticket, enrolls the parent as the relation the tracker actually renders, and marks each entry human, derived, or unknown. Never guesses a provenance. Adds to a ticket and never rewrites one."
---

Write the issue contract into tickets that were just cut, so the session that
builds them does not re-decide what this session already settled.

```
grill  →  spec  →  slice into tickets  →  /tickets <spec-issue>  →  /clear  →  /thegraph <ticket>
                                          ^ here                            ^ reads what you wrote
```

The slicer is whatever cut the tickets — upstream `/to-tickets`, or a human. This
runs after it and before the clear.

## Contents

- [Goal](#goal)
- [The schema lives in thegraph, not here](#the-schema-lives-in-thegraph-not-here)
- [Three acts, and nothing else](#three-acts-and-nothing-else)
- [What it must not do](#what-it-must-not-do)
- [Workflow](#workflow)
- [Rules](#rules)
- [Verification](#verification)

## Goal

A feature is sharpened in one session and built in another. In between, a slicer
turns the spec into tickets — and a ticket is deliberately thin, because a
general slicer cannot know who will execute it and thin is what stays durable.

That thinness is the right default and the wrong one here. **We know the
executor: `thegraph`.** So the calls a maintainer made — which layer owns the
behaviour, which seam the tests hang off, what is deliberately untouched — can
travel with the ticket instead of staying behind in the spec.

What that buys is not speed. It is that a re-decision **becomes visible**: a run
that inherited a call and a run about to make one otherwise produce the same
transcript, and a cost nobody can see is a cost nobody weighs.

**This skill adds a layer to somebody else's ticket.** It does not slice, and the
slicer keeps improving without it.

## The schema lives in thegraph, not here

Do **not** hardcode the contract in this file — **neither the slot list nor the
provenance values**. Read [`../../thegraph/SKILL.md`](../../thegraph/SKILL.md)
directly, both sections:

- **"What the issue must supply"** is the authoritative slot list.
- **"What each provenance licenses"** is the authoritative definition of `human`,
  `derived` and `unknown` — what each means, what each licenses downstream, and
  the rule for choosing between them.

When thegraph gains a slot, this skill widens with it; when it renames one,
follow it. This is the same borrow-don't-copy rule `grill-the-graph` follows for
the build schema.

**It holds for the values as much as for the slots**, and that half was learned
the expensive way. This file once carried its own copy of the provenance table,
and the copy widened: it admitted a `human` mark where the spec merely
*attributed* a call to the maintainer, which thegraph has never licensed. A
writer that admits more than its reader licenses produces a downgrade nobody
authorised, silently — and the copy named its authority in this very section
while doing it. A copy that names its authority and is never asserted against it
is a stamp, and a stamp warns nobody (ADR-0051).

## Three acts, and nothing else

**Transcribe.** Read the spec issue, and the conversation if it is still in the
window. Write the contract block into each ticket, one slot at a time, each
answered or explicitly `none`.

**Use the shape thegraph names**, exactly — one `## Issue contract` section, one
`### ` subsection per slot named as the schema names it, and `provenance: <value>`
as that subsection's first line, alone. A reader and a writer that agree only on
a list of slot names agree on nothing; the shape is what makes the read a lookup
instead of an interpretation.

**Enroll.** Convert the prose parent reference into the tracker's own relation.
See the repo's issue-tracker doc under `docs/agents/` for the exact calls; on a
tracker with no such relation, leave the prose and say so.

**Mark.** Attach a provenance to every entry, as thegraph's **"What each
provenance licenses"** defines the three values. **Open that subsection and mark
from it — never from memory of it.** The values are not interchangeable, exactly
one of them licenses a downgrade, and the rule for choosing between the other two
is stated there in full.

This skill adds **one** constraint of its own, and it constrains *when this skill
runs* rather than what the values mean: see **"Run it inside the unbroken
window"** in [Rules](#rules).

## What it must not do

- **Not slice.** The ticket set is the slicer's output and arrives settled.
- **Not explore the codebase.** A `tickets` that investigates has moved the
  re-decision one session earlier rather than removing it. It transcribes a
  decision; it does not make one.
- **Not rewrite.** Title, body prose, acceptance criteria and blocking edges are
  untouched. The contract is appended.
- **Not file anything.** It writes to tickets that already exist.

## Workflow

1. **Resolve the inputs.** Take the spec issue number as the argument. Read it
   full, with comments. Find the tickets it produced — the slicer's parent
   references, or the relation if one was already enrolled.
2. **Read the schema.** Open thegraph's *"What the issue must supply"* for the
   slot list and *"What each provenance licenses"* for the values. Both, at
   runtime: this file states neither.
3. **Draft one ticket's block**, and show it before writing anything. The first
   one is the one to get wrong cheaply.
4. **Write the rest** once the shape is approved, one ticket at a time.
5. **Enroll each parent relation**, then read the roster back and show it.
6. **Report** what each ticket answered, what it left `none`, and every entry
   marked `unknown` — that last list is the one worth the maintainer's eye,
   because each line is a call the build session will make from cold.

## Rules

- **A slot answered `none` is finished; an empty slot is not.** The build schema's
  own rule, for the same reason: later, an unasked question and a deliberately
  empty answer look identical.
- **No paths and no code snippets.** A ticket outlives the tree it was written
  against. Name interfaces and contracts; the run resolves them against the code.
- **Never contradict the spec.** Where the spec and the conversation disagree,
  the disagreement is the finding. Write **both** readings into the slot and mark
  the entry `unknown` — that is what `unknown` is for, and it is the one case
  where it beats `derived`. Then say so. Picking a side silently is the failure;
  answering `none` is second worst, because it discards the very thing this skill
  exists to carry.
- **A slot the spec only gestures at is `none`.** *"Test it at the right seam"*
  names no seam. Write `none` rather than inventing one — you may not go to the
  code for it, and a guess marked `derived` reads as accurate.
- **Run it inside the unbroken window.** Grilling through slicing is meant to sit
  in one context; this is the last step of it. Run later and it still works from
  the spec body — but **no entry can be marked `human`**, because you did not
  watch anyone decide. Values the spec states are `derived`; the rest `unknown`.
  Say that this is what happened.
- **Say when it does not pay.** One ticket built in the same window as its
  grilling inherits nothing, because nothing was lost. The gain is realised
  across a `/clear`.

## Verification

- Every ticket carries every slot the schema names, answered or `none`, inside a
  `## Issue contract` section in the shape the schema states.
- Every entry carries a provenance, and no `human` mark rests on inference.
- The `human` marks are reported to the maintainer, listed rather than counted.
  They are the one thing worth their eye: each is a node that will confirm rather
  than decide, on their authority.
- Each parent relation is enrolled, and the roster reads back showing every
  ticket.
- Nothing above the contract block changed: title, acceptance criteria and
  blocking edges are byte-for-byte what the slicer wrote.
