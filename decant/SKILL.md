---
name: decant
description: "Sort source comments paragraph by paragraph under one policy: a comment says what the code is, and the why, the trap, the measured value and the history move to the repo's map. Reports which paragraph is owed to which note, what the notes are missing, and what can go, then stops — every write is the maintainer's. Use when a repository that keeps a map adopts the policy, or when a file's header has grown past the point of being read."
---

# decant — leave the one line, move the rest

**It runs where the repo keeps a map.** Check that the map exists on disk. Where
it does not, say so, name `grill-map`, and stop — there is no destination, and an
invented one is worse than no pass.

The reasons and measurements behind every rule here are in
[ADR-0076](../docs/adr/0076-a-comment-says-what-the-code-is.md). This file holds
the rules once.

## The policy

**A comment says what this code is.** Everything else a comment carries — why it
is this way, what it deliberately leaves out, the trap, the measured value, the
rejected alternative, how the code came to be here — belongs to a territory note,
to version control, or to nothing.

## The bins

A paragraph gets one.

| Bin | What it is | Where it goes |
|---|---|---|
| `KEEP` | what this code *is* — one line for a declaration, a short paragraph for a module | stays, plus **the pointer line** below |
| `DESIGN` | the rule, the trap, the measured value, the deliberate absence, the rejected alternative and why | the territory note's `## Design model` |
| `DECIDED` | the record that settled it | `## Governing decisions`, **as a link** — the record keeps its own reasoning |
| `CROSS` | a fact that holds in more than one territory | a cross-cutting invariant note |
| `TRACKER` | another module's defect, a follow-up, a report that this code is inert | carried to `ask-it` with everything else |
| `DROP` | history that constrains nothing, and anything the signature or one grep already answers | nowhere |

**The pointer line.** Where a paragraph leaves a site whose code would then look
*wrong* rather than merely unexplained — a call left out on purpose, a check that
seems missing — one line stays: *what is deliberate here, and which note says
why.* No reasoning; the reasoning is what moved. A `DESIGN` verdict at such a
site is incomplete until that line is named.

Paths to notes are the repository's own, read from its map.

## The unit is the paragraph

Split a block into paragraphs before judging. One header routinely carries what
the module is, a trap, a deliberate absence and a relocation story at once, and
one verdict on the block discards whichever lost. A one-bin verdict on a long
block needs a stated reason.

When one sentence carries two verdicts, split it at the clause.

## The questions, in order

Read the code as well as the comment — questions 1 and 2 cannot be answered from
prose. Ask these in order; the first yes decides.

1. **Does the code, the signature, or one grep already answer it?** Go read what
   answers it. The source agrees → `DROP`. The source says something
   **different** → `DROP — contradicted`, reported as a finding. Nothing answers
   it → next question.
2. **Does it constrain a future edit** — a trap, a value, an absence, a rejected
   alternative? → `DESIGN`.
3. **Does it hold beyond this territory?** → `CROSS`.
4. **Is it about code outside this paragraph's reach, or about this code being
   inert?** → `TRACKER`.
5. **Does it name the record that settled this — or does a decision record
   already hold it, named or not?** → `DECIDED`. Grep the records before
   question 2 sends a paragraph to the note: a fact a record holds is not owed.
6. **Would a cold reader not know what they are looking at?** → `KEEP`.
7. **Does it describe a change to the code, constraining nothing?** → `DROP`.

**The drop question comes last** because a wrong move costs a lookup and a wrong
drop costs a measurement nobody reconstructs.

**A tombstone is judged by what it constrains.** *"It used to be the `(text,
width)` pair"* reads as history and means *do not go back* — `DESIGN`. Tense
decides nothing.

**Ask the maintainer only on `KEEP` versus `DROP`-as-redundant** — is this
orienting a cold reader, or is the body already saying it? One paragraph at a
time, with a recommendation, and only when genuinely split. Decide every other
pair yourself and put the closeness in the reason line. Where the maintainer
cannot be asked — a subagent's run — decide these too, and mark each `close` so
they can be put to the maintainer in one batch.

**Test comments go through the same questions.** What a test proves is `KEEP`;
a tolerance's derivation or a measured value is `DESIGN`; the story of the bug
that prompted it is history.

## Check each `DESIGN` against its note

Open the note the verdict names and read it beside the source. There are three
outcomes, reported apart:

- **held** — the note already says it; the paragraph is a copy.
- **notes owed** — the note does not say it; the paragraph is the only place the
  fact exists. This is a defect in the map. Report it per territory, one line
  each: the fact, and the note that should hold it. Writing it is `grill-map`'s
  work.
- **two grounds** — note and comment give *different reasons for the same
  decision*, both plausible. Report both and pick neither; which is the real one
  belongs to whoever made the decision.

A territory with no note at all is *notes owed* at full size. Report it, and bin
nothing to a note you would have to invent.

**A decision can outlive its reason.** Where the code's choice still stands but
the reason its comment gives was made false by a later change, report it under
*Contradicted* as a falsified reason: the reason goes, and the note records the
choice as unexplained under its open section. Never supply a new reason — that
is the decision-maker's.

**The source that disagrees may be another comment.** Two comments in different
files contradicting each other are *Contradicted* too; report both sites, and
settle which is right from the code, not from either comment.

## Then read the file whole

After the paragraphs, read each file once end to end. Two comments in one file
giving the same rationale are each correct alone, so only this read finds them.

## Where it starts

It reads the whole tree, one territory at a time, when a maintainer asks for it.
No change runs it: the rule is kept at write time by the repo's `CLAUDE.md`,
where `grill-the-graph` put it, and a pass that checked every change would be
undone by the next edit made outside it.

It starts with `scripts/decant/narrow.py` in the skills
repository this folder links to (resolve the link first; `--help` for usage). It
prints, in order:

1. **what it scanned** — carry this block into the report first.
2. **the territory order** — production comment blocks per line of
   `## Design model`, highest first; test and harness (`demo/`) blocks are
   counted beside it and read, but do not rank. Read territories in this order, and put it in the report as
   printed. Choosing a territory because it looks promising biases every number
   the run produces.
3. **refactoring targets** — territories whose every file is shared with other
   notes.
4. **code drift** — files that use a territory's module but its `## Code` does
   not name, split in two: `+!` when **no note names the file at all** — it is
   outside the map, and almost always a real omission — and `+` when another note
   already names it, which is usually a consumer rather than a member. A TS
   `import type` is not a use. On a `--territory` run it also lists named files
   linked by no use to any other file the note names (`-`: a peer, or a wrong
   entry). Run with `--territory` for the one you are about to read; its scope
   then includes the `+!` and `+` files. **A `+!` and a `-` are settled by
   reading before anything else**, because every later finding is scoped by that
   list.
5. **candidates**: history-shaped lines, comments restating their note verbatim,
   the same sentence repeated across files.

The candidates remove work; they certify nothing. The matcher sees copies, and
people rewrite rather than copy, so a territory it calls clean still gets read.
Measured on its first territory: 5 of the 8 history clauses reading found.

**Finish each territory before starting the next.** A flaw in the method found on
the third territory has already been copied into the first two.

## The report

In this order:

1. **Scope** — which territories, how many blocks, and the order as it was
   derived before the first territory.
2. **Per paragraph** — location, bin, one-line reason. A `DROP` on redundancy
   names what answers it; a `DESIGN` or `CROSS` names its note by path; a
   `DECIDED` carries a link. Pointer lines are named where required.
3. **Contradicted** — comments the source disagrees with.
4. **Notes owed** and **two grounds**, per territory.
5. **Repeats within a file**, every copy named.
6. **Refactoring targets** — per file: its size against its layer, how many notes
   name it, and which of those notes own nothing else. A territory with no file
   of its own is a module that exists only in prose, and the strongest case.
7. Where narrowing ran: that it removed work and did not certify the remainder.

**The pass is done when the report is written and nothing else is.** Source,
notes and tracker are the maintainer's to change.

## Boundaries

- **`sweep`** asks whether a change made a surface *wrong*; this asks whether a
  paragraph belongs where it sits. A paragraph can fail both.
- **`grill-map`** owns the notes. This pass names what a note owes and stops.
- **`assay`** reads the code; this reads what the code says about itself.
