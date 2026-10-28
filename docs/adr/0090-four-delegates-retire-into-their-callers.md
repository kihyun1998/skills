# ADR-0090 — `redden`, `spine`, `bare` and `boundary` retire into the steps that already did their work

**Status:** accepted. The first cut of #44's catalog audit. Retires four skills by
the move [ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md)
established. This reverses part of [ADR-0042](0042-a-nodes-method-leaves-its-bound-stays.md),
which extracted them as methods *"borrowed back"* by the steps; measured, the
steps never borrowed them.

> **Amended by [ADR-0095](0095-check-it-reviews-in-a-fresh-agent.md).** Harm is no
> longer asked by `check-it` itself: one fresh agent, the reviewer, asks it with review.

The rules that bound now sit where the work happens:

| Retired | Into | What moved |
|---|---|---|
| `redden` | `make-it`'s test section, and the signal in `thegraph` | name the assertion first; turn the change off and see it go red for the right reason, side conditions included; mutate the predicate, not only the placement; confirm the mutation landed; restore and re-run the baseline in the same pass; never loosen the target; a surviving mutation is classified by the five patterns, each with its repair, and closed at the root |
| `spine` | `read-it`'s cluster read | from the siblings, the shared root, what each established and rejected, and what is still open; the anchor's root is a hypothesis, and a falsified one is recorded; the roster is the tracker's relation; with no anchor, re-deriving a neighbour's reasoning is the sibling signal, carried |
| `bare` | `check-it`'s check 1, and `pub-ready` step 4 | the list from CI or the named gate list; each gate run bare with no pipe; every result read; no threshold moved, no scope narrowed, no hook bypassed; a skipped gate reported; three failed fixes go to a person |
| `boundary` | `thegraph`'s first signal, `make-it`, `check-it` | ask whose invariant broke and which layer can hold it correct before asking which is upstream; then a person decides |

`security-review` is a platform skill, so it cannot be retired. It leaves
`check-it`'s `requires:`, and its question, *who could reach this, what they
control, what it exposes*, is asked in the same review as check 4.

## The call, and whose it was

The maintainer's, on 2026-10-27 (#44). They first set the bar: *cost without
use*, meaning a model-invoked description loaded in every session and rarely
used, rather than *no evidence*. After seeing the audit's table, they chose to
retire the high-confidence verdicts first. `assay`, `silt`, `sweep` and
`firsthand` wait for the next cut. `lens` is kept and goes to #39.

## What it was decided on

Three fresh agents read every `check-it`, `read-it` and `make-it` run on this
machine from 2026-09-28 to 2026-10-27, excluding the session that made this
change. For each run they asked whether the delegate applied, whether the caller
did its work without loading it, skipped it, or loaded it, and whether a skip
cost anything.

- **`redden` (high confidence):** 23 of 29 test-writing runs mutated inline,
  and 6 loaded it. 0 runs left a test never seen failing. Every surviving
  mutation was caught inline.
- **`spine` (medium-high):** 40 of 44 runs with a parent read the cluster
  inline, and 2 loaded it. 2 skipped it, and no correction about a cluster was
  found across 25 sessions' prompts and answers.
- **`bare` (medium-high):** 25 of 26 runs with checks ran them inline, and 1
  loaded it. Two piped gates went uncaught, and neither was red. The one red
  that escaped did so outside `check-it`.
- **`boundary` (medium):** 0 loads. The defensive-line question was asked
  inline. The one guard nobody questioned was the consumer's legitimate job,
  checked against Flutter's own `Scrollable`.

The pattern is ADR-0089's: a step names a delegate as owning its work, the
delegate's description sits in every session's listing, and the step does the
work from its own summary. Felix Rieseberg's point that a skill's half-life is
short, and that removing one can leave output unchanged or better, is what
prompted measuring it.

## What did not move

The completeness read before commit found two rules that had been left behind
and that something live still relied on: `redden`'s five patterns, which the
glossary still assigned to the step, and `spine`'s sibling-signal trigger,
which `read-it` and `ask-it` still carry. Both moved. The rest did not move,
because nothing live relied on it: `redden`'s cold read; `bare`'s *do not watch
CI during the work* and its list of what a top-level command misses; `spine`'s
briefing rules (last human touch, outcome voice), which no step ever called it
for; and `boundary`'s seam-naming workflow, which never loaded. They stay
readable in `retired/`. The harm question is asked by `check-it` itself after
check 4, not by 4's readers.

## What is not decided here

- **Behaviour is expected to be unchanged, and that is not measured.** #37's
  suite stops at the confirm stop, so it reaches only `read-it`'s cluster
  paragraph. A suite run on this change is a spend for the maintainer to approve.
- **`thegraph-panel` still lists `redden` and `boundary`** as signal skills
  (`mods/thegraph-panel/hooks/run.ts`, `SIGNAL_SKILLS`). They will no longer be
  invoked, so the entries are inert. The mod is not changed here: changing a
  mod is its own work under `mods/ENGINE-NOTES.md`.
- *"No cost found"* means none within each run's window, plus spot checks. It
  was not traced across later sessions.
