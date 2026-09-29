---
name: ask-it
requires: [envelope, byartifact]
description: "Put everything that has been carried in front of a person, once, and file only what they keep. Collects what the earlier steps set aside, gives each item the seven columns, and searches by the artifact before opening anything — but groups by kind first, since a thing to file, a thing to decide and a thing that belongs in another repository share no vocabulary and interleaving them makes the reader sort before answering. A follow-up is parented through the tracker's own relation in the same act as filing it; a release's obligations are the consumer tests that actually broke, named. Nothing reaches a tracker unasked. Use at the end of a change, once anything has accumulated for a person."
---

# ask-it — put it to a person, once

Everything the earlier steps carried instead of acting on arrives here: the
sibling signal, the gap nobody could confirm, the defect seen in passing, the
patch that stood in for a deeper fix, the finding the adversarial read could not
settle, what the release will oblige.

**This is the only door.** Nothing reaches a tracker without a person having been
asked, and nothing may evaporate into a pull-request body or a code comment on
the way — those are buried on merge.

## Collecting and presenting

**`envelope` owns this**, and it is most of the job: collect rather than file as
you go, give every item its seven columns, collapse several sightings of one gap
into one item with the rest as evidence, present once as a proposal to confirm
rather than a question the reader has to compose an answer to, one item at a time
with the count that remains, and record what was dropped and on what ground.

Two of its columns are filled from what happened earlier and cannot be
reconstructed from a defect description: **what has already been done about it**,
where *"nothing yet"* is written rather than left silent — silence reads as *a
fix is already in the tree* — and **whether the plan everyone agreed on still
stands**, which is the easiest to skip and the most expensive to have skipped.

## Group by kind before you sequence

**This is the part `envelope` cannot know**, because it depends on where the
items came from. What arrives here has dispositions that share no vocabulary:

| Kind | What the reader is being asked |
|---|---|
| something to **file** — a defect, a follow-up, a deferral | file it, or drop it |
| something to **decide** — an adversarial finding the sources could not settle, a patch standing in for a deeper fix | a judgement, not a filing |
| something that belongs to **another repository** — a defect in the method itself rather than in this code | it is filed elsewhere, and this repository is the wrong tracker to search |
| something the **release will oblige** | consumer work, dated by a release that has not happened |

Interleaved, the reader classifies each item before answering it — which is
exactly the sorting that presenting one at a time was bought to remove. Group
them, and say which group an item belongs to as it arrives.

**Drops are one group and one confirmation.** A drop carries its ground, and a
ground is a record rather than a decision, so they arrive as a list, once, asking
only whether the grounds hold. Sequencing them item by item spends the reader's
attention on exactly the items already declined.

## Before opening anything, find out whether it has a home

**`byartifact` owns this, and it only runs for items actually being filed.** An
item the reader drops, or decides, never needed a search.

What it adds here: **which tracker you searched goes in the column.** An item
destined for one repository and searched in another gets a true answer about the
wrong place, and *nothing found* reads identically either way. A defect in the
method is filed where the method lives — derive that address from the installed
skill's own checkout rather than storing it, and say *"could not check"* where
there is no checkout to ask.

And its fourth out is the one to carry forward honestly: **a search that returned
nothing has ruled out "it already exists" and not "it conflicts with something".**
No query finds a conflict.

## A follow-up is parented in the same act as filing it

An issue produced by working another issue is **enrolled through the tracker's
own parent/child relation**, at the moment it is created. A *"came out of X"* line
in the body is the fallback for a tracker with no such relation, never a
substitute for one that has it: the relation is what renders the tree and reports
each node's state, and it answers the question no amount of re-reading answers a
month later — **what came out of this** — because every issue describes a defect
and none describes the shape of the work that found it.

**Whether it also joins the cluster is a separate judgement.** What a follow-up
shares with its parent is *provenance*; whether it shares the **root** is a
different claim, and only that one routes. Two cases pull in opposite directions:

- **Same provenance, different root** — it stays a child of its parent, because
  the lineage is the true thing about it, and the anchor's body records the
  exclusion. Do not lift it out to keep a roster tidy; that trades a fact for a
  neat list.
- **Same root, provenance from outside the cluster** — its parent would land it
  in an unrelated subtree, so parent it to the **anchor** and put the lineage in
  its body.

**Getting this wrong is not symmetric.** Missing a real sibling costs a
reconstruction later. Counting an adjacent one **corrupts the roster** — and a
roster is what anyone later copies almost verbatim, so a padded one launders
provenance into evidence for something nobody tested.

## Write back to the anchor

Where the change belonged to a cluster, the anchor is a surface nobody reaches by
walking the repository, and it is the one place the work's own result lands: the
suspected root **confirmed or falsified**, the numbers actually measured, any new
sibling, and what is still open.

Judgements go in the body, where they read as current state. Evidence goes in a
comment, which is append-only because it is a record of what was believed. A new
sibling is **enrolled into the tree** rather than announced in prose — and the
roster never enters the body at all, since the tracker already answers which
siblings exist and which are open.

## What the release will oblige

**Only where this project publishes something other projects use.**

This discovers nothing. If the proof step linked this build into a real consumer
and ran its suite, **the tests that broke there are the list** — especially any
that had pinned the old bug as their expected value, since a symptom somebody
else independently froze has now disappeared.

It runs now rather than after the release, because the obligation is *dated* by
the release and the knowledge is not: afterwards the branch is merged, attention
has moved, and the one person who could say whether a given workaround was
bug-avoidance has stopped looking.

Per consumer test that broke: **name it**, not *"consumers may be affected"*. Then
the direction — remove the workaround, or **keep it** because it was never
bug-avoidance, with the reason recorded so nobody later mistakes it for stale.
And a purely additive release obliges consumers **nothing**, which is an answer
worth writing rather than an empty section.

**Derive the consumer list when you act; never store it.** Grep the sibling
manifests for this package's name. A stored roster is a derivable fact that rots
the day a consumer changes.

## What this does not do

**It does not file anything the reader did not keep.** Presenting is not filing,
and an item shown and not kept is recorded as dropped with its ground — so a
candidate this change declined does not simply disappear.

**It does not decide whether this repository uses branches or pull requests.**
That is the project's own convention and none of this method's business.

**It does not send a bare reminder.** *"Check your consumers"* hands the whole job
back to memory at the moment attention is lowest. Every item arrives with what was
measured and what has already been done about it, or it is not ready to arrive.
