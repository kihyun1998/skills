---
name: envelope
description: "Collect everything headed for a human — deferrals, trade-offs, follow-ups — into one batch, and give each item its disposition. Use when anything has accumulated for a human to decide, and before any of it reaches a tracker."
---

Collect everything headed for a human into one batch, and give each item its disposition.

## Goal

Filing is an **outward, durable act**: it puts a claim somewhere other people will
act on. So two failures bracket it.

Below the bar, things **evaporate** — a deferral into a PR body, a trade-off into a
code comment, a residue into an agent report nobody reads after merge.

Above it, things **cascade** — a pass yields a dozen observations, each filed on
sight; working one produces another pass, which files more. The tracker grows
faster than the code, every entry looks equally load-bearing, and the ones that
mattered are hidden among the ones that were merely true.

One batch, each item with its disposition, is what sits between them.

## The seven columns

**An item is presented with its disposition, or it is not ready to present.**

| Column | What it holds | What it may say instead |
|---|---|---|
| **Measured** | what *you* reproduced, with the number | *"not reproduced — would cost X"*. Then it is a **question you are asking**, not a proposal you are making, and say so |
| **Reference** | what the named prior art does, cited | *"no recorded tie-breaker here"* — a real answer, and often the one that says the direction is not yours to pick |
| **Tracker** | already owned · conflicts with · sibling of · nothing — **and which tracker you searched** | never blank; searching by artifact is what fills it. Name the tracker: an item destined for one repository and searched in another gets a true answer about the wrong place, and *nothing* reads identically either way |
| **Direction** | the fix you propose, with its cost | *"undecided, because …"* — an item may hold an open decision, never an unexamined one |
| **Provenance** | where it came from — found while working what, at which step | *"unprompted — hit it while reading X for something else"*. Never blank: an item whose origin you cannot state is one nobody can weigh |
| **Done already** | what you have **already** changed, run, or committed on account of it | *"nothing yet"* — the ordinary answer, and still written, because silence here reads as *a fix is already in the tree* |
| **Still the agreed call?** | whether the direction everyone agreed on survives this item | *"it moved — here is where it diverged"*. Never omitted |

**The first four say whether the item is real; the last three say what has already
happened around it.** The reader was *not* watching the work that produced it, and
none of the last three is recoverable from the defect description — which by
construction describes the code, not the work.

The last column is the easiest to skip and the most expensive to have skipped: a
batch of individually reasonable items can add up to a **different plan** than the
one that was approved, and the presentation is the only place anyone sees that.

## Workflow

1. **Collect, do not file as you go.** Every candidate waits for the batch.
2. **Fill all seven columns**, using the fallback wording where the real answer is
   not available. A fallback is an answer; a blank is not.
3. **Collapse to roots.** Several items that are one gap seen several times are
   **one** item with the others as evidence. Present the root and the cheapest
   thing that would settle it — not a list.
4. **Present once, as a proposal to confirm** — not as a question the reader has
   to compose an answer to from scratch. If they end up writing the sentence you
   should have written, the batch was a question in disguise.
5. **One item, one answer, and the count that remains.** The *once* above is
   opposed to filing as you go, not to sequencing — a reader handed every item at
   the same moment sorts before answering, which is the state verification 6 rules
   out. No summary screen precedes them: the remaining count already carries the
   size, and a table of what is coming is the same dump one step earlier. Where
   an item restates something the reader can already open, compress it to a count
   plus what differs — but keep the count, which is the one thing the compression
   could hide. And **ask it rather than announce it**: use the tool that renders a
   question — `AskUserQuestion` where the harness has one — so the reply has
   somewhere to go. A stop written as prose the reader is expected to answer
   unprompted is the bar-you-remember-at-the-end in a new costume, and this whole
   file has no other mechanism. Where the answer is genuinely open-ended rather
   than a disposition, plain text is right and forcing the tool is worse than not
   having it.
6. **Name the one binding constraint** if the batch has one: which item, decided
   first, changes what the others mean. Sequenced, naming it *is* putting it
   first; an announcement on top of that is a second copy of the same fact.
7. **Record what was dropped and why**, so dropping is itself on the record.

## Rules

- **Only what you verified yourself.** A subagent's probe, a lens report, or your
  own inference is a **candidate**, not a finding. *"The agent found X"* is not
  evidence you may file.
- **Only what is real now.** A consequence needing a hypothetical consumer, a
  feature nobody asked for, a config nobody runs — that is a code comment.
- **The bar is asymmetric.** Reproduction is the price of **acting**, not of
  declining to. Reproductions that end in *"not a defect after all"* are pure loss.
- **To drop, cite the ground** — the prior art at `file:line`, the contract it
  matches, the record that decided it. **Never drop on a feeling.** A dismissal
  with no citable ground and a dismissal that would need original investigation
  are the same case, and neither is a dismissal: both come to the batch.
- **Deciding it alone** is how a real defect gets talked away; **investigating it
  alone** is how the harvest outgrows the change. The batch exists because both
  are worse than asking.
- **Prefer fewer, verified, currently-real items.**
- **Nothing is filed unasked.** Presenting is not filing.

## Verification

Before finishing:

1. Every item has all seven columns filled, fallback wording included — no blanks.
2. Anything not reproduced is presented as a question, and says so in words.
3. Items sharing one root are one item, with the rest as evidence.
4. Every drop names its citable ground, and the drops are reported.
5. The last column is answered for every item, including the ones where nothing
   moved.
6. The reader can act with a short reply. If they would have to assemble the ask
   themselves, the batch was not ready.
