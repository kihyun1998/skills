---
name: decant
disable-model-invocation: true
requires: [lens]
description: "Sort source comments so each says only what the code is, and move the rest to the repo's map. /decant."
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

## Check each `DESIGN` against the code, then against its note

**The code first.** Every factual claim in a `DESIGN` or `CROSS` paragraph — a
count, a caller, a value, a name, a citation, an *only* / *every* / *never* — is
read against the code or the pinned source it describes before it is binned. A
claim the code contradicts goes under *Contradicted*; it is never moved as it
stands, because a false sentence moved into a note becomes the note's fact.

Then open the note the verdict names and read it beside the source. There are three
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

Before the first territory, count three things and put them at the top of the
report:

1. **What will be read** — every territory note, and per note the source files its
   `## Code` names, each with its number of comment blocks. Count block comments
   (`/* … */`, JSDoc `/** … */`) as well as line comments. A scope of zero, or a
   language whose comments you did not count, is not a clean result — say so.
2. **The territory order** — production comment blocks per line of
   `## Design model`, highest first; test and harness (`demo/`) blocks are counted
   beside it and read, but do not rank. Read territories in this order. Choosing
   a territory because it looks promising biases every number the run produces.
3. **Code drift** — per territory, the files that import its module but its
   `## Code` does not name. A file **no** note names is outside the map, and
   almost always a real omission; a file another note names is usually a
   consumer. A TS `import type` is not a use. The other direction too: a file
   `## Code` names that no other file it names uses or is used by is a peer, or
   a wrong entry. Settle drift by reading before anything else, because every
   later finding is scoped by that list.

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

**The pass is done when the report is written and nothing else is.** Source,
notes and tracker are the maintainer's to change — unless the maintainer hands
the writes over, and then the next section governs every one of them.

## Applying it

Applying carries out the report; it does not re-decide it. Nearly everything
that goes wrong in a decant goes wrong here, in the moving, so these rules are
stricter than the reading's.

- **Move, do not rewrite.** Carry a sentence as it stands and change only what
  the code contradicts. Where the note needs it shorter: one claim per sentence,
  never two paragraphs joined into one; keep every qualifier the original had —
  what exactly was measured, which cases, *only*, *permanently*; and before
  writing *because* or *so*, check in the original which side is the cause.
- **Account for every sentence.** Before moving a paragraph, list its sentences
  and name where each one lands — a note, the kept line, or `DROP` with its
  ground. The short reason is the one that goes missing.
- **Cut in the same commit.** A sentence moved to a note and left in the source is
  two copies, and the next edit changes one.
- **Link a reference fact, never restate it.** A `file:line` in another project
  belongs in the repository's pinned-reference record; the note links that row.
  Where no row exists, read the source and add one.
- **Read the destination section whole** after placing a sentence. A count (*three
  callers*, *the fourth producer*), a *none* / *only* / *every*, or the sentence
  next to it can be false now.
- **Re-point what pointed at it.** For every removed sentence, grep the whole
  repository for a distinctive phrase of it; and for the file's name **and the
  commented symbol's**, read every line that says what that comment says, states,
  records, gives or carries. Read every hit; never truncate the output. A
  quotation of a comment that no longer exists points at nothing, and a pointer
  by symbol is the one a file-name grep misses.
- **Then an adversarial read** (`lens`), briefed with these shapes: compressed
  until false, two claims merged into one, a qualifier widened, a cause reversed,
  a reason dropped, a neighbour contradicted.

What a published doc-comment may carry is the repository's rule, in its
`CLAUDE.md`, not this skill's.

## Boundaries

- **`sweep`** asks whether a change made a surface *wrong*; this asks whether a
  paragraph belongs where it sits. A paragraph can fail both.
- **`grill-map`** owns the notes. This pass names what a note owes; when it
  applies, it writes only the sentences its report moved.
- **`assay`** reads the code; this reads what the code says about itself.
