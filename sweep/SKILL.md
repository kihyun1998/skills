---
name: sweep
description: "No substantive change ends at the code. Every surface that describes the behaviour drifts the moment the behaviour moves, and nothing compiles the drift away — public doc-comments ship verbatim and are the last thing describing a fixed bug as a contract; a published changelog entry is never rewritten, only superseded; a decision record whose premise a change falsified is amended in that same change, because a trail only ever read becomes a museum. Reclaim rationale a later change made false. And judge the pass by what it could not see, never by its hit count: a low count means the pattern is clean or the pattern is narrow, and the number cannot tell which — so when a hit turns up, widen the pattern with the phrasing that produced it before fixing it. A newly written rule is itself a hit, and the one most often spent on its own instance: sweep the corpus for what it already covers, and for its inverse. Use once a change is otherwise complete, and after writing any rule."
---

Find every surface that describes the behaviour, and distrust a clean-looking pass.

## Goal

Code compiles. Prose does not. Every surface that **describes** what the code does
goes stale the moment the code moves, and nothing anywhere reports it — so the
drift accumulates until a doc-comment is the last thing on earth still describing
a fixed bug as a contract.

The second half is subtler and costs more: **a pass that found little is
indistinguishable from a pass that looked narrowly.** Both report a low number.
Only one of them is good news.

## Workflow

1. **List the surfaces before searching any of them**, so the pass is judged
   against a roster rather than against whatever it happened to find. The usual
   ones:

   | Surface | What makes it different |
   |---|---|
   | Doc-comments and generated API docs | they ship **verbatim** as the reference; most likely to still describe the old behaviour |
   | Changelog / release notes | where the ecosystem snapshots at publish, **never rewrite a published entry** — open a new one; the repo and the registry must not claim different things for one version |
   | Glossary | if a domain term changed **meaning**, it is updated in the same change |
   | Decision records | a **write** surface, not a read-only one — see below |
   | Examples, demo headers, spike comments | these are specifications; each promises only what it can actually demonstrate |
   | README, quickstart, onboarding | the reader with the least context and the least ability to notice they were misled |

2. **Amend the decision trail, do not just read it.** A change that falsifies a
   record's premise amends **that record** — a status note, a superseded-by line —
   in the same change. A trail only ever read drifts into a museum, and the
   decisions that belonged in it end up scattered across issues and doc-comments
   where nothing cross-checks them.

3. **Reclaim now-false rationale.** Across sequential changes, a justification
   written earlier can be made *false* by a later one, and nobody re-reads it.
   Walk the recent rationale and retract what the new behaviour falsified. The
   reasons that survive are usually the transitive ones.

4. **When a hit turns up, widen the pattern *before* fixing the hit.** The hit is
   evidence about the **pattern**, and spending it on the one instance throws that
   away. Re-search with the phrasing that produced it, across file types you did
   not include, then fix what the wider pass returns.

   **A new rule is a hit too, and it is the one most often spent on its own
   instance.** When a change writes down a rule that did not exist before — in a
   record, a skill, a check — the case that surfaced it is one instance of a
   pattern the rule now covers, and the corpus almost always holds more. Sweep
   for them **in the same change**, and sweep the rule's **inverse** as well: a
   rule about one side of a pair leaves the other side unstated, and unstated is
   where it fails next.

   Measured, on the day each rule shipped: *"a count with an authority is
   deleted"* was applied to one of two inventories and four more copies were
   found later; *"an enumeration cannot be swept for completeness"* was written in
   a change that shipped an enumeration; *"a delegated node's license is its tool
   grant"* left the brief — the other half of the same pair — unexamined, and it
   failed twice within a day. Each was recorded as finished. **The tell is a
   consequence line claiming completion**: *"both counts are gone"*, *"nothing
   regressed"*. Write that sentence only after the wider pass, because it is the
   sentence a later reader trusts instead of re-checking.

5. **Rewrite rather than append where appending preserves the noise.** A surface
   patched repeatedly reads as a changelog of itself. Say what is true now.

6. **Cold-read anything a stranger will read.** Hand the rewritten surface — the
   text alone, not your intent — to someone with no context and ask what they take
   it to mean. Every mismatch is a defect in the surface, not a reader error.

7. **Say what the pass could not see.** Which patterns were evaluated, which file
   types were in scope, what was skipped. A number with no scope is not a result.

## Rules

- **A surface that has merely grown too long is not drift.** Doc-comments and
  headers are on the list above because a change can make them *wrong*; that is
  the only question this pass asks of them. A header that has simply grown past
  the point of being read is `decant`'s pass — name it and stop. Do not widen a
  drift sweep into a comment audit.
- **Judge by coverage, never by hit count.** A clean-looking sweep is the one to
  distrust. Measured: a narrower first pass returned exactly one hit, which read
  as reassurance, while the worse of two live defects sat outside it **on both
  axes** — a different file type and a different phrasing.
- **This applies to scripted checks too**, not only prose sweeps. A path list that
  matches nothing is indistinguishable from a clean diff unless the check reports
  which patterns it evaluated.
- **Never rewrite a published entry.** Supersede it. Two sources claiming
  different things for one version is worse than one of them being out of date.
- **One fact, one home.** If the same statement appears on three surfaces, the fix
  is one owner and two pointers, not three edits. A corrected copy is still a copy.
- **A roster is never copied into prose.** Where a system already answers *"which
  ones exist and which are open"*, restating it creates somewhere for it to
  disagree with itself.
- **Read, don't only grep.** A pattern match catches known shapes and misses
  stale references, dead links, and fact drift. Track how much was actually read.
- **A pass that finds nothing changes nothing**, and reports the scope it covered.

## Verification

Before finishing:

1. The surface roster was written **before** the search, and every entry is
   reported as covered, clean, or out of scope with a reason.
2. Every hit that turned up was used to widen the pattern before it was fixed,
   **including any rule this change wrote down** — its inverse searched too, and
   no consequence line written until after that pass.
3. Any record whose premise the change falsified was amended, not merely read.
4. No published entry was rewritten.
5. Any fact appearing on more than one surface has one owner and pointers.
6. The report says which patterns and file types were evaluated — not just a count.
