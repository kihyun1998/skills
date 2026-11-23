---
name: ask-it
description: "Put everything that has been carried in front of a person, once, and file only what they keep. Use at the end of a change, once anything has accumulated for a person."
---

# ask-it — put it to a person, once

Everything the earlier steps carried instead of acting on arrives here: the
sibling signal, the gap nobody could confirm, the defect seen in passing, the
patch that stood in for a deeper fix, the finding the adversarial read could not
settle, the correction the person made, what the release will oblige.

**This is the only door.** Nothing reaches a tracker without a person having been
asked, and nothing may evaporate into a pull-request body or a code comment on
the way — those are buried on merge.

**In a cluster run it runs at the end**, over what every child carried. Where
the person answers *needed, now* for anything, the run continues and ends with
another `ask-it`. **The push, and the question of closing the anchor, belong to
the last one.** No child's issue closes before the person has seen every batch,
and the anchor is not offered for closing while work under it is still in hand.

## What goes to the person, and what does not

**Only what is theirs**, which is the one list `thegraph` keeps under *What holds
everywhere*. A technical call is not on it. Measure it, decide it, and report it
with what it was decided on.
A reported call that the person later reverses is **overreach**, and it is
counted ([ADR-0088](../docs/adr/0088-thegraph-takes-a-cluster.md)'s measure), as
is a technical question asked of them, which is **offloading**.

**A small, measured follow-up is done, not offered for filing.** Where the
cause is found and the fix's shape is known, do it now as its own commit and
report it; *"file it"* is not an option beside it. The context that makes it
cheap is loaded now, and a filed item pays the reading again. Filing is for an
item a judgement still holds open.

**Collect, and do not file as you go.** Several sightings of one gap are one
item, with the rest as evidence under it. **Only what is real now**: a
consequence that needs a hypothetical consumer or a feature nobody asked for is
a drop, with that as its ground.

## Every item carries five things

| | What it holds | Where there is no answer |
|---|---|---|
| **Measured** | what you reproduced, with the number. A subagent's probe, a `lens` report or your own inference is not this until you have reproduced it | *"not reproduced; settling it would cost X"*, with the cheapest thing that would. The item is then a question you are asking, said in words |
| **From** | which child and which step it came from | *"unprompted, while reading X"*. Never blank |
| **Tracker** | which tracker was searched, for what, and what came back | *"not searched: proposed as a drop"* or *"…as a decision"*. Every item that could be filed is searched before it is presented (see below) |
| **Done already** | what you changed, ran or committed on its account | *"nothing yet"*, written out, since silence reads as *a fix is already in the tree* |
| **Still the plan?** | whether the agreed direction survives this item | *"it moved: here is where"*. Never omitted, since a batch of reasonable items can add up to a different plan from the one approved |
| **Why not now** | for an item proposed for filing, the judgement that still holds it open: a call that is the person's, or a design nobody has settled | *"none"* means it is not filed: it is done now, as *a small, measured follow-up* says, and reported as done. Several items in one filed issue each carry their own |

**A decide item arrives with each option's consequences and a
recommendation.** That includes deferring: where deferring is recommended, say
what deferring costs. An option listed without its consequences is not ready to
present.

## Asking

**One item, one answer, and the count that remains**
([ADR-0064](../docs/adr/0064-a-human-stop-asks-one-reply-at-a-time.md)), put
with the tool that renders a question. Present each as a proposal to confirm, so
that the person replies rather than composing the sentence you should have
written. Where the answer is genuinely open-ended rather than a disposition,
plain text is right.

## Group by kind before you sequence

**Sequence by where the items came from.** What arrives here has dispositions that share no vocabulary:

| Kind | What the reader is being asked |
|---|---|
| something to **file** — a defect, a follow-up, a deferral, each with its *why not now* | file it, or drop it |
| a **check candidate** — a repeated correction a check could hold, carried with where it was already written, or a constraint taken out of a comment | build it now through `encode-it` where its shape is known; otherwise file it as an issue that `/thegraph` builds through `make-it` and `encode-it`; or drop it |
| a **first correction** to record as a rule — carried with where the rule would go and a draft line | write the line there as drafted or reworded and commit it before the push, or drop it |
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
A ground is citable (the record, the contract, the measurement). A drop that
has none, or that would need fresh investigation to justify, is not a drop: it
comes to the person as an item.

## Before opening anything, find out whether it has a home

**For every item that could be filed**, before it is presented, since whether it is filed is the person's answer. An item proposed as a drop or a decision needs none.

**Search by the artifact, not the feature name**: the file, the symbol, the wire
field, the config key, the error string, and their neighbours. A related issue
was named after somebody else's symptom, so the feature name is the one
vocabulary it does not use. Then take one of four outs, and name it:

- **It already exists.** Comment on it, and read what it decided and rejected
  before proposing anything.
- **It conflicts** with an issue this change would break. Cross-link both ways
  in the same act, and say which comes first.
- **It shares a root.** File under the root's home where one exists.
- **Nothing.** A real answer.

**Name the tracker searched, and the terms.** An item bound for one repository
and searched in another gets a true answer about the wrong place. A defect in
the method is filed where the method lives: derive that address from the
installed skill's own checkout, and say *"could not check"* where there is none.
**An empty search rules out "it already exists", never "it conflicts"**, since
no query finds a conflict.

## In a cluster run, the goal decides what joins it

Each item a cluster run discovered takes **one answer**, which settles filing,
scope and timing together:

| Answer | Filed under | Worked |
|---|---|---|
| **needed, now** | the anchor | in this run, which continues and ends with another `ask-it` |
| **needed, next run** | the anchor | by the next `/thegraph` on the anchor |
| **out of scope** | the child it came from | later, by `/thegraph` on that child |
| **needs design** | `needs-grill`, under its source or the anchor | after grilling, a spec and tickets |
| **drop** | — | listed with its ground |

Outside a cluster run the first two do not apply. **The tree records where a
thing came from; only the person's "needed" widens the cluster.** Following the
subtree instead would chase follow-ups of follow-ups without end.

**A bug in a child already pushed and closed** is filed new, never fixed by
reopening the child: under the anchor where its goal needs it. If the anchor is
already closed, ask whether to reopen it.

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

## Before the push

**A push sends every local commit ahead of the remote, not only this run's.**
A commit this step makes (a rule recorded, a small follow-up) names the files it
commits, as `thegraph`'s *A run alongside another* says, and goes on the run
sheet's `commits` line when it lands, as `thegraph`'s run sheet says. That
section also says how it claims and releases its files in the main tree, and
that in a worktree run it is made in the worktree and merged by the same steps
as an issue's commit: the rebase, the fast-forward, and the new hash written on
the `commits` line. Before
the push is put to the person, run `git fetch <remote>` and list what it would
send, `git log --format='%h %s' <remote>/<branch>..<branch>` in the main tree,
`<remote>` and `<branch>` being where the push goes (`origin` and `main` in
most runs); where `<branch>` is not on the remote yet, list against the branch
it started from. **A run that worked in a worktree pushes from the merged
branch**: each of its commits is merged into the main tree's branch first, as
`thegraph`'s *A run alongside another* says, and the hashes on its sheet are the
merged ones. A commit still only on its `tg-<run id>` branch is not in the list
and does not go out: say so with its hash, and the issue it closes stays open.
Hold each hash against the run's commits on its sheet, the `commits` line and
the hashes on its `## Children` lines, two short hashes matching where one
starts with the other.

**A run that made a commit comes here even when `check-it` carried nothing**:
its sheet is kept for this question (`thegraph`'s run sheet), and the push is
the only thing put.

**The push is the person's either way**, and the list decides only what the
question offers. Where every commit listed is the run's, the question is the
push of those commits. Where any one is not, show those commits, each with its
hash and subject, and offer:

- *push them too*: they go out with this run's.
- *push up to this run's last commit*. Offered only where the order allows it:
  every commit between `<remote>/<branch>` and that one is the run's, and only
  commits after it are not. Those stay local.
- *do not push*: nothing goes out; the run's commits stay local, and an issue
  they close stays open.

**Push a hash from the list, never `HEAD`**: `git push <remote> <hash>:refs/heads/<branch>`
(a bare `<hash>:<branch>` is refused where `<branch>` is not on the remote yet),
`<hash>` being the newest commit listed for *push them too* or where every one
is the run's, and the run's last commit for *push up to*. A commit that lands
while the question is open is then not sent unseen.

A run whose sheet is gone or holds no commits has nothing to hold the list
against: every commit counts as not the run's.

## What this does not do

**It does not file anything the reader did not keep.** Presenting is not filing,
and an item shown and not kept is recorded as dropped with its ground — so a
candidate this change declined does not simply disappear.

**It does not decide whether this repository uses branches or pull requests.**
That is the project's own convention and none of this method's business.

**It does not send a bare reminder.** *"Check your consumers"* hands the whole job
back to memory at the moment attention is lowest. Every item arrives with what was
measured and what has already been done about it, or it is not ready to arrive.
