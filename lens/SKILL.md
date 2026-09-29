---
name: lens
description: "An adversarial read-only pass returning graded findings, not bare claims. One reader is briefed on every corpus at once — this codebase's siblings and the named prior art — because two readers split across halves buy coverage while calling it independence, and neither can then say which of two disagreeing things is wrong. Each finding is restated without naming the reference before its direction is asked, so a search index cannot become an argument for architecture; then graded CONFIRMED, UNADJUDICATED, INERT, or DELIBERATE, so the pass costs less after it finishes than while it ran. A second reader is bought with opposing stance over the same material, never by dividing it. Use before trusting an enumeration, when a spike keeps catching new gaps one probe at a time, or when a bug would cost more than a wrong number."
---

Read everything once, adversarially, and hand back findings that are already graded.

## Goal

Two failures make a completeness pass cost more than it is worth.

The first is **splitting the material**. Two readers on the same model share every
blind spot that matters and differ only in which files they opened, so dividing
the corpus buys coverage while calling it independence — and each half can then
see that two things disagree without being able to say which is wrong, so every
divergence comes back to be adjudicated from cold against material the other half
already had open. One reader, everything.

The second is **returning bare claims**. A pass that hands back *"this differs
from X"* has moved the whole adjudication onto the reader's thread, one
reproduction at a time. A graded finding carries the reasoning that reached *"no
action"*, which is the part that pays.

## Workflow

1. **Assemble the brief, and check it carries four things.** The corpora; the
   grade table below; the **tie-breaker** — what wins when prior art and this
   project's own evidence disagree; and the **list of divergences that are
   deliberate**, each with the record that decided it. The last two are what a
   finding is graded *against*. A pass never given them reports a divergence on a
   layer where the reference has no vote at all, and reports it as urgent,
   because from inside the brief it is.

2. **Read every corpus end to end.** Both this codebase's siblings — the features
   that already solve the adjacent problem — and the named prior art,
   systematically, not by sampling. **Never drop one because the change is
   small**: a pass that stops reading the reference stops finding what only the
   reference knows.

3. **Restate each finding without naming the reference — before asking which way
   it goes.** A reference can demolish a claim that rests on it; it cannot erect a
   claim about your design, and collapsing those two directions is how a read-only
   pass starts proposing architecture.

   > If the finding still stands — *"this code does X, and our own record says
   > Y"* — it is a defect, and the reference was a search index that pointed at
   > it. If the reference cannot be removed from the sentence, it is a **design
   > proposal**, not a defect.

   This narrows the **grade**, never the reading. A layer where the tie-breaker
   gives the reference no authority is still a layer where the reference knows
   things nobody else does; *"the reference cannot win here"* is the same skip as
   *"the change is small"* in better clothes.

4. **Grade it**, from the table below.

5. **Give the direction, because a divergence is not one.** *"This differs from
   X"* has not said *"move to X"*. Which way it goes depends on whether the
   **other** corpus shares the divergence: this thing alone drifted → move toward
   the reference; this thing *and* its siblings agree against the reference → a
   family decision, so hold the neutral behaviour now and track the parity fix as
   one coordinated change. This is the call a half-briefed reader cannot make.

6. **Cite by re-opening the source.** A `file:line` reads as though it were the
   finding's proof; it is not. Measured: five wrong rows entered one repository's
   reference cache in two days, four of them wrong the moment they were written,
   and **all five copied from a report rather than re-opened**. So a citation is
   either re-opened at the source or produced by a tool that reads the source —
   never transcribed by hand, including by hand out of a report you asked for.

7. **Cluster to roots before reporting.** A spread of findings sharing one
   underlying gap is **one** finding with the others as evidence under it. Naming
   the root is what makes the pass useful beyond the cases it happened to hit.

8. **Collapse to the root and the cheapest thing that would settle it.** Not a
   checklist. If several roots survive, say which one makes the others moot.

9. **A second reader, only when the stakes justify it, and only by stance.** Same
   material, opposite job: the first hunts gaps, the second tries to **refute**
   them and to break the convergence claim. Because both read everything, each can
   adjudicate a direction, so disagreement between them is information rather than
   an errand.

## The grade table

Every finding carries one. A grade **routes** a finding; it does not discharge it.

| Grade | What the pass is saying | What it costs the reader |
|---|---|---|
| `CONFIRMED` | reproduced, with `file:line` and the path that reaches it | reproduce, then fix |
| `UNADJUDICATED` | the sources cannot settle it — the reference is silent, self-contradictory across its own call sites, or the outlier | a human decision |
| `INERT` | a true observation with no reachable consequence | one line of acknowledgement |
| `DELIBERATE` | matches a contract or an already-recorded decision | one line of acknowledgement |

The last two rows are the ones that pay: a pass that has *already* reasoned its
way to "no action" is handing that reasoning over instead of the errand.

## Rules

- **Never split the material.** One reader over everything. Dividing the corpus is
  the failure this skill exists to prevent, whatever it saves.
- **Never drop a corpus** because the change looks small.
- **One load-bearing reason per finding.** A finding that arrives as a list is
  hedging; if a reason is not load-bearing, drop it.
- **Never average two readers.** Where they split, the answer is the question that
  resolves the split, not the midpoint. Disagreement is the product.
- **Convergence is reassurance, never proof.** Do not report a direction as
  verified, validated, or settled because two same-model reads agreed.
- **A citation is never transcribed.** Re-open it or produce it with a tool.
- **Roots over instances.**
- **Read-only.** Report; do not edit, fix, or file. A finding that failed the
  restatement test is a proposal and is labelled one — never smuggled in as a
  defect.
- **A pass that finds nothing changes nothing.** A clean read, reported as clean,
  is a real result.
- **The trigger is a spike, not a schedule.** A reactive series that keeps
  catching *new* gaps one probe at a time is not bad luck — it is the signal that
  an enumeration is incomplete, and it is what this pass is for.

## Verification

Before finishing:

1. Every finding carries a grade, and every `CONFIRMED` citation was re-opened at
   the source rather than copied out of a note.
2. Every finding was restated without the reference **before** its direction was
   given, and any that could not be is labelled a proposal.
3. Findings sharing one root are reported as that root, with the rest as evidence
   under it.
4. The report names which corpora were read end to end. If one was sampled, say
   which and how far — a partial read reported as a pass is the failure this
   skill's own first rule describes.
5. No wording claims a direction is verified or proved by agreement between
   readers.
