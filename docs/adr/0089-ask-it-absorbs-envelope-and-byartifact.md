# ADR-0089 — `ask-it` absorbs `envelope` and `byartifact`, and asks only what is the person's

**Status:** accepted. Retires [`envelope`](../../retired/envelope/) and
[`byartifact`](../../retired/byartifact/) by the move
[ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md) established.
Extends [ADR-0088](0088-thegraph-takes-a-cluster.md) with what a cluster run
does with what it discovers. Closes #43 and #46.

`ask-it` now holds what it used to delegate:

- **What the person is asked.** Naming, scope, direction, spend, writing to a
  tracker, and outward acts such as a push. Nothing else. A technical call is
  measured, decided, and reported with what it was decided on.
- **Five things on every item**: measured, from, tracker, done already, still
  the plan.
- **Decide items arrive with each option's consequences** and a
  recommendation, deferral included.
- **One item at a time**, with the count that remains. Drops come as one list
  with their grounds.
- **A search by artifact before filing**, with the four outs.

In a cluster run, each discovered item takes one answer: needed now, needed next
run, out of scope under its source, needs design, or drop. Only "needed" joins
the cluster. A bug found in a child already pushed and closed is filed as a new
issue, and the closed child is never reopened.

## The call, and whose it was

The maintainer's, grilled on 2026-10-27, #43 and #46 together. Each line above
was put as its own question, and the maintainer took the recommendation on
every one: absorb and retire, the line around what is theirs, five fields,
consequences with a recommendation and no `lens` by default, one answer per
discovered item, and a new issue rather than a reopened one.

Before the grilling, the maintainer had already rejected two alternatives. A
cluster that follows the whole subtree of follow-ups was rejected as unending.
Parenting every discovery to the spec was rejected because the spec would grow
with unrelated work and could not close until that work did.

## What it was decided on

- **The delegation never ran.** Across every session transcript under
  `~/.claude/projects`, `ask-it` was invoked 64 times, and `envelope` and
  `byartifact` were invoked **0** times. Only `ask-it` named them. Its runs
  imitated envelope's shape from a one-paragraph summary.
- **What the imitation kept and lost.** A sampled run (just-admin-page,
  2026-10-23) carried measurements and named the tracker it searched. It also
  put four items in one question, against ADR-0064, and offered a decide item
  as two bare options with a recommendation to defer.
- **The cost of the stops, from this repository's own runs.** #37's run asked
  the person technical questions twice, the judge model and a fixture repair.
  The maintainer then corrected the first. That is the offloading count ADR-0088
  set up.
- **Felix Rieseberg's account of the same failure**: the person ends up
  *"the biggest bottleneck"*. His remedy is to ask only what is theirs and to
  bring the evidence with each question.

## What did not move, and why

- **envelope's Reference and Direction columns** became the decide rule. A
  decide item states each option's consequences, which is where prior art
  bears. Whether such a consequence must be read from an outside source is #47's
  open question. This record does not decide it.
- **byartifact's longer reasoning** (search on naming rather than on deciding,
  the descriptive note that is not a record) stays readable in `retired/`. Its
  rules survive as five lines: the artifact and its neighbours, the four outs,
  conflicts cross-linked both ways, the tracker named, and an empty search that
  rules out only *already exists*.

## What the first completeness read changed

A fresh-agent read before commit found these; each was re-opened and fixed:

- **"needed, now" meant a second `ask-it`**, against ADR-0088's *one `ask-it`
  at the end*. Now the run ends with the **last** `ask-it`, and the push and the
  anchor-close question belong to that one. One limit stays, the same kind
  ADR-0088 names for decide: `thegraph-panel` ends a run when `ask-it` is
  answered (`onAnswer`), so it stops tracking a run that continues after the
  first `ask-it`.
- **The Tracker field said "never blank" while the search ran only for items
  being filed.** Every item that could be filed is now searched before it is
  presented. One proposed as a drop or a decision says so in the field instead.
- **Four envelope rules had gone unnamed**, and they are restored in `ask-it`:
  *not reproduced* now says what settling the item would cost and the cheapest
  way to do it, since spend is the person's call; a subagent's probe or a `lens`
  report is not a measurement until reproduced; a consequence needing a
  hypothetical consumer is a drop; and an open-ended answer is asked in plain
  text, not forced into the question tool.

## One list of what is the person's

The same read found three lists of what is the maintainer's to decide, and they
disagreed. `ask-it` said naming, scope, direction, spend, tracker and push;
`thegraph`'s signal said naming, structure, scope and direction; its habits said
naming, structure, scope, priority and vision. So a structural call was *ask*
in one place and *decide and report* in another. The maintainer chose the
union, **naming, structure, scope, direction, priority, spend, tracker writes
and outward acts**, kept in one place, `thegraph`'s *What holds everywhere*,
with the others pointing at it. They accepted the cost: structural calls are
asked again, so slightly more stops, in exchange for lists that cannot drift
apart.

## The cost, stated

- Two model-invoked descriptions leave every session's listing.
- `ask-it` grows from 148 lines to about 200. That is below the 500-line
  guidance and below where `skill-authoring.md` notes divergence.
- Re-running `scripts/install-skills.sh` prunes the two links from
  `~/.claude/skills`. Until then they still resolve to the moved folders' old
  paths, which no longer exist.
