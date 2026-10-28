# ADR-0095 — `check-it`'s review and harm checks run in one fresh agent, on every code change

**Status:** accepted. Implements #49. Extends [ADR-0091](0091-lens-runs-in-a-fresh-agent.md)
from `lens` to the review, and amends ADR-0090 and ADR-0092 on who asks harm and
how review reads the diff.

On a code change, `check-it` starts one fresh agent, given the whole diff, the
issue and the repository's own records. It answers three questions, reported
apart: does the change hold up against what the repository wrote down, does it do
what the issue asked, and is it open to someone who means harm. *"Nothing here to
reach"* is that agent's answer, not the writing session's. It is briefed and
handled as `lens` is: read-only, its report saved beside the run sheet
(`<run sheet>.review.md`), and its `violation` findings re-opened at the source
before anyone acts on them. A skip is reported with its reason. A prose change runs
neither, as before. Cost (5) stays with the writing session, which has to measure
it.

## The call, and whose it was

The maintainer's, grilled on 2026-10-28:

- **one agent** for review and harm together, rather than one per axis or folded
  into `lens`;
- **always, on the code route**;
- **the session's model**, as for `lens`. Felix Rieseberg's *attackers one tier
  down* is not measured here;
- **an instruction in `check-it`, not a new skill**, so nothing retired in
  ADR-0092 comes back;
- **measured by replaying past changes** before trusting it.

## What it was decided on

A fresh agent read all 32 `check-it` runs from 2026-09-28 to 2026-10-28, all
under the older text in which review was `assay` and harm `security-review`.
Of the 26 code runs:

| | Review | Harm |
|---|---|---|
| a spawned subagent | 10 | 3 |
| the writing session | 6, mostly one line | 4 |
| skipped | 10 | 19 |

- **Subagent reviews found a defect the writer had missed, in 9 of 10.** The
  inline reviews recorded none in 6.
- Only 2 of the 10 used one reader per axis. 7 used a single reader for both axes,
  and found defects just as well, which is why one agent was chosen.
- The skill never said the readers were fresh agents, so each run chose for
  itself.

## Measured on the change

The new brief, as `check-it` now words it, was run on three past code changes
whose review had been inline or skipped. The three named at the confirm stop
could not be used: each had fixed its defect before commit, so the shipped diff
no longer held it.

| Change | Review then | What the fresh agent found |
|---|---|---|
| justpdf `6295486` (#99) | skipped | An ambiguous reference that shipped: the `modify` doc-comment says encryption is set *"through `inner_mut()`"*. `Modifier::inner_mut()` can (its type has `set_encryption`); `Document::inner_mut()` cannot. The sentence still stands at justpdf's HEAD |
| just_tooltip `33fd94e` (#65) | skipped | An undecided side effect, untested: with `interactive: false`, a tap on a body clamped over its own child reaches that child and toggles the tooltip closed |
| flutter_syntax_highlight `82e8a29` (#27) | inline, one line | An untested edge: switching `wheelMotion` to `null` mid-glide drops the remaining distance on the next notch (the dependency's behaviour) |

Each agent took about 55,000–63,000 tokens and under two minutes. No finding was
wrong on the facts, though the justpdf one reads as a defect only one way; every
harm answer said what is reachable and why it is bounded. Three is a small sample: it shows the brief finds what an inline or
skipped review let through, not how often.
