# ADR-0088 — `/thegraph` takes a cluster, and the tracker decides whether it has one

**Status:** accepted. Extends [ADR-0071](0071-thegraph-is-four-skills-in-order.md)
(the four steps, unchanged) and [ADR-0080](0080-a-run-keeps-a-run-sheet-while-it-lasts.md)
(one run, one run sheet, which now holds a cluster).

> **Extended by [ADR-0089](0089-ask-it-absorbs-envelope-and-byartifact.md).** What a
> cluster run discovers takes one answer at `ask-it` (needed now, needed next run,
> out of scope under its source, needs design, drop), and only "needed" joins the
> cluster.

`/thegraph` given an issue with open sub-issues, or a folder of issue files,
runs a **cluster run**. The issue is the anchor, and the four steps run once per
open child, in blocking order, in one session. There is one confirm stop, at the
start. After it, a child stops the run only when it departs from that plan or
cannot proceed. Each child is committed locally, `ask-it` and the push come once
at the end, and the anchor gets the result. Closing it is asked then.

## The call, and whose it was

The maintainer's, grilled on 2026-10-27 (#41). It came from watching the #36
cluster get worked one `/thegraph #n` at a time, with several stops per run:
the pattern Felix Rieseberg calls being *"a conveyor belt for Claude"*. The
workflow it serves is the maintainer's own: `/grill-with-docs` → `/to-spec` →
`/to-tickets #<spec>`, then `/thegraph #<spec>` once.

Each line below was put to them separately. Every one is theirs except the
order of the children, which is derived:

- **Shape A, not a separate orchestrator.** A skill calling `thegraph` cannot
  exist here: `thegraph` is user-invoked, and a skill cannot invoke a
  user-invoked skill (ADR-0042). Making it model-invoked would load its
  description into every session; copying its order would be a second copy of
  the method.
- **The tracker decides the mode.** Open sub-issues mean a cluster; none means
  one issue, as before. A wrong call is corrected at the confirm stop, so there
  is no mode argument. Titles and labels are not read. This mirrors
  `grill-the-graph` deciding init or update from disk (ADR-0085).
- **One session for the whole cluster.** See *The divergence* below.
- **One stop at the start; after that, only on departure from the plan or a
  child that cannot proceed.** For a child still `needs-grill`,
  `ready-for-human`, or gone unclear, they chose to stop there over the
  recommendation to skip it and batch the question.
- **A local commit per child, one `ask-it` and the push at the end.**
- **A result comment on the anchor; closing it is asked.**

## The divergence, and what it was decided on

`wayfinder` (mattpocock/skills, read raw from the installed copy) resolves
**one ticket per session**, sizing each ticket to a session's context. This
runs a whole cluster in one session. That was decided knowing the rule, on two
grounds. `wayfinder`'s tickets are decisions sized to fill a session, while
`to-tickets` produces implementation slices that are often small (#38 was two
sentences). And the run sheet exists to carry a run through a compaction
(ADR-0080). If clusters overflow in practice, the outcome count below will show
it.

## The run sheet's cluster form, and the trap it avoids

`source` is the anchor. The step list is the current child's, and a `cluster`
step **after it** stays `[~]` until the run ends. The children are listed
**without checkboxes**. `thegraph-panel`'s `parseSheet` (`mods/thegraph-panel/hooks/run.ts`)
reads every `- [ ]`, `- [~]` or `- [x]` line outside `## Carried` as a step. A
checklist of children would therefore draw them as steps, and the first child
whose steps all reached `[x]` would log the end of the run. The issue first
claimed the panel "skips lines it does not know", which is true only of lines
that are not checkbox lines. The `cluster` step goes **last** because the
panel's focus is the first step under way (`focusOf`): placed first, it would
show `cluster` for the whole run. The run ends only when every step, `cluster`
included, is checked.

**One limit the form does not remove.** The panel ends a run when a decide stop
or `ask-it` is answered (`onAnswer`). A child that is an open decision is a
child that cannot proceed, so the run stops there. If the person has it decided
in the run, the panel stops tracking the rest of the cluster, though the run
itself goes on. That is the panel's to fix if it matters in use.

## What the first completeness read changed

An adversarial read by a fresh agent, before this was committed, found five
gaps. Each was re-checked against the source and then fixed as a mechanism:

- The cluster's one stop **replaces each child's confirm stop and nothing
  else**. The first draft said a child stops the run "only" on departure or
  inability to proceed, which contradicted the signals and `check-it`'s returns
  to a person.
- The sheet is deleted once, after the final `ask-it`. The per-run deletion rule
  would otherwise have fired after the first child.
- A local folder has no anchor file. There the result goes in the closing
  report, and each child closes by its own `Status:` line.
- The order is read with the tracker's blocker query, now named in
  `docs/agents/issue-tracker.md`. A blocker finished in the run counts as done
  though its issue stays open until the push.
- A child with open sub-issues runs as one issue. After a stop, the person's
  answer resumes the cluster or ends it with `ask-it` over what is done.

## How it is measured

A stop count was rejected by the maintainer: it improves by asking less,
including asking less of what is the person's. Three counts instead:

- **offloading**: questions measurement or the code could have answered;
- **overreach**: calls made without asking that the person later reversed;
- **outcome**: reverts, reopened issues and correction comments after the
  cluster closes.

The baseline is #37's run: two offloads, no overreach, no rework so far. After
the first real cluster run, a fresh agent classifies that session's questions
and unasked calls, and the maintainer confirms the classification. The results
go on #36. Overreach means the stop condition widens. Rising rework means more
stops.
