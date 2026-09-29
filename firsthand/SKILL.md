---
name: firsthand
description: "Read the real thing before guessing at it, and never promote ignorance into fact. Fetch raw source and grep the actual lines — never a summarizing fetch, because summary drops method bodies and a handler that is there reads as absent. A feature being new never excuses skipping its mechanism layer, which the reference almost always has. Pin a runtime value with a throwaway probe and record the number; reading code is not observing what it does. Then enumerate the hidden state the real thing tracks that a first-principles model omits, and hold the exit guard: unconfirmed is a gap, not an absence — re-confirming costs one fetch, guessing wrong costs days. When a worry is cleared, record the condition the clearance holds under. Use before writing against any reference, API, or external fact."
---

Read it firsthand, enumerate what it knows that you would not have guessed, and never turn "I could not confirm it" into "it is not there".

## Goal

Two failures share one root, which is why they share one skill.

The first is **reading a summary and calling it the source**. A summarizing fetch
silently drops method bodies from large files, so a handler that *is* there reads
as absent, and you build on a void with full confidence.

The second is **promoting a gap into an absence**. A fact a search did not show is
a fact you have not found. Treating it as a fact that does not exist is the same
error one step later, and it is worse because nothing about the output looks
different.

Both are cured by going to the real thing, and by being honest about what you did
not reach.

## Workflow

1. **Fetch raw and grep the actual lines.** Whole files, then the specific lines —
   never a summarizing fetch, and never a recollection of what the source says.

2. **Read both layers: concept and mechanism.** A capability has a concept layer —
   the whole feature, which may be genuinely novel and absent from the reference —
   and a **mechanism layer**, its sub-components, which almost always *do* exist
   somewhere in the reference's parsing, buffering, or state handling. **A feature
   being "new" never justifies skipping the mechanism reference.**

3. **Treat external facts and secondhand statements as targets too.** Registry
   state, a published API's shape, a rate limit, a version floor — check the real
   source, not a sentence somebody wrote about it. **The rationale *you* are about
   to write** is subject to this: a wrong reason committed to the record gets
   believed and built on long after the code is right.

4. **Verify in both directions.** Could the thing you are about to call absurd,
   impossible, or novel actually be real and long-established? Could the thing you
   are about to call obvious be false? Checking only the surprising half catches
   half the errors. The trigger is **metacognition, not knowledge**: the moment
   you are about to assert a checkable fact from a feeling, check it instead.

5. **Pin a runtime fact with a throwaway probe.** When the fact is a real runtime
   value — a coordinate, a call order, an actually-emitted event, a timing — write
   a disposable probe that prints it, read the number, delete the probe, and
   **record the number**. Reading the code is not observing what it does.

6. **Enumerate the hidden state.** Before writing anything, list the state the
   real implementation tracks in this area — the kind a first-principles model
   omits because its own design "looks correct". This is the systematic catch for
   code that passes a naive test and corrupts a real round-trip.

7. **Removal is the mirror image.** A value read *incidentally* elsewhere — feeding
   a boolean, gating a branch, being counted — is unpinned the moment you delete
   it. Grep every read site, **including ones that only compute something from
   it**, before removing anything.

8. **Exit on the guard, not on fatigue.** Everything unreached is named, as below.

## The exit guard: unconfirmed ≠ absent

> A fact a search **did not show** is a **gap**, not an absence.

Never promote *"I could not confirm it"* into *"it does not exist"* and build on
the void. It becomes an open question or a candidate for someone to decide — never
a premise.

This bites hardest exactly where the assumption carries the most weight **and**
confirming it by experiment would itself be harmful: deliberately tripping a rate
limit to "check" it can earn a ban. **The asymmetry is the whole point** —
re-confirming costs one fetch, and guessing wrong costs days.

**And the inverse.** When you *clear* a worry, record the **condition the
clearance holds under** — *"…as long as X stays true"*. A bare *"no problem here"*
makes the next person re-run the same investigation from scratch, and breaks
silently the day X changes, with nothing pointing at why.

## Rules

- **Never a summarizing fetch**, and never a source read from memory.
- **A summarized source is an index, not evidence.** A documentation site, a
  search result, or a generated overview can point you at something; it can never
  be the thing you cite. Anything resting on one carries forward as *needs
  raw-source confirmation*.
- **Record the number, not the impression.** A probe you ran and did not write
  down is a probe someone runs again.
- **Every unreached fact is named.** A pass that says "checked" without saying
  what it could not reach has hidden the only part that matters.
- **A pass that finds nothing new changes nothing** — and reporting that the
  reference confirms your model is a real result, not a wasted read.

## Verification

Before finishing:

1. Every cited fact traces to raw source you opened, a probe you ran, or an
   external source you fetched — none to a summary or a memory.
2. The mechanism layer was read, not only the concept layer, or it is stated why
   there is none.
3. Every runtime value claimed is a number that was actually printed.
4. Nothing unconfirmed is stated as absent; each is named as a gap.
5. Every cleared worry carries the condition it holds under.
6. Before any removal, every read site was grepped, computed uses included.
