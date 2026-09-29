---
name: promote
description: "When the same model keeps being re-decided one case at a time, write the rule down instead. Five triggers are observable rather than felt: deciding a pair already decided in a different combination; working an item that another item's pass surfaced, which was itself surfaced that way; measuring an earlier item's stated premise false before work could start; the prior art unable to arbitrate; two artifacts inside the project requiring opposite things. One is bad luck — two or more and the model being re-decided is one nobody has written down. A record earns its place by deriving decisions already taken, not by listing them, and it keeps the rule while the cluster keeps its roster; a hand-copied roster inside a record went stale in five places within three days. Use when two or more of those triggers have fired in one cluster, or when a rule is being applied that nothing has written down."
---

Stop deciding one combination at a time; write the rule that resolves all of them.

## Goal

Some state spaces are combinatorial, and a series of individually reasonable
decisions walks one without ever naming it. Each new combination arrives as a
fresh decision, each one quietly reinterprets the last, and nothing anywhere holds
the model they all imply.

This does **not** run per change. It runs on the cluster's clock, and its usual
answer is *"not yet"*.

## The five triggers

Observable, not felt. Count them.

1. You are deciding a **pair of participants you have already decided before**, in
   a different combination.
2. The item you are working was **surfaced by another item's pass** — and *that*
   one was too. A chain, not an edge.
3. You measured an earlier item's stated **premise false** before you could start.
4. The **prior art cannot arbitrate** — silent, self-contradictory across its own
   call sites, or the outlier.
5. Two artifacts **inside this project require opposite things** — two tests, two
   modules, a document and a pin.

**One is bad luck. Two or more and you are re-deciding a model you have never
written down.**

## Workflow

1. **Count the triggers.** Fewer than two: stop, and say so. That is the ordinary
   outcome and it is a real answer.

2. **Write the rule as a record that makes every combination resolvable by
   construction** — not the ones you happened to meet. An item records one
   decision with its rejected alternatives; it structurally cannot hold a rule
   spanning decisions. A doc-comment pins that rule to one branch of the code.

3. **Derive, do not list.** A record earns its place by **deriving** the decisions
   already taken. If it only restates the answers you gave, it is a filing cabinet
   and the next combination will still need its own decision.

4. **Check it against the existing tests.** The ones it **reproduces** are its
   evidence. The ones it **contradicts** are its findings — adjudicate each one
   openly; do not quietly flip a test to fit the rule you just wrote.

5. **Re-file the current item as a conformance item under the record**, and close
   the cluster's old home with a pointer to it. Later items in the area arrive
   under the record. **Leaving both open is the one failure this exists to
   prevent** — two homes for one throughline, each holding half the roster.

6. **Copy the roster into the record's *context*, never into the record as a
   list.** The record keeps the **rule**; the cluster keeps **who is on the list**.
   And copy it through the cluster's exclusion list, never off the raw subtree: a
   subtree is provenance and may hold more than the cluster, and this is the one
   moment where skipping that filter makes the padding permanent.

## Rules

- **Two triggers or nothing.** A record per pass is the same failure as an item
  per observation, one level up and harder to undo.
- **Escalate the specific to the class.** A rule that only fixes the reported case
  leaves the same failure everywhere nobody pointed. The case that raised it is
  **evidence**, not the rule.
- **A rule wants an immutable home; a roster wants a mutable one.** Measured: a
  hand-copied roster inside a record went stale **in five places within three
  days**, while the rule's own clauses needed no edit at all — and the staleness
  landed on the artifact everything else is graded against.
- **Only a decision record preempts a cluster's home.** A descriptive
  cross-cutting note is not one, however similar it looks.
- **Never flip a contradicting test silently.** It is a finding.
- **The record says what it did *not* cover.** A rule read as covering its
  neighbours is how the next pass finds them already decided.

## Verification

Before finishing:

1. The trigger count is stated, with each trigger named — not summarised as
   *"this keeps happening"*.
2. The rule resolves combinations nobody has met yet, demonstrated on at least one
   that was not among the triggers.
3. Every existing test the rule touches is classed as evidence or finding, and
   every finding is adjudicated in the open.
4. Exactly one home holds the throughline afterwards, and the other points at it.
5. The record carries the rule and **not** the roster, and what it does not cover
   is written down.
6. **The corpus was swept for what the new rule already covers, and for its
   inverse, before any consequence line claimed the change was finished.** The
   triggers are instances the rule was *derived* from; they are almost never all
   of them, and a rule about one side of a pair leaves the other side unstated.
   This is `sweep`'s pass, run here on the rule rather than on a behaviour — see
   its step 4, which carries the measurements. Skipping it is how a record comes
   to say *"both counts are gone"* while two remain.
