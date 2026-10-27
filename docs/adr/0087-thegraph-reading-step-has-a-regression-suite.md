# ADR-0087 — `/thegraph`'s reading step has a regression suite, beside the step it measures

**Status:** accepted. Amends [ADR-0074](0074-the-evaluations-directory-is-deleted.md),
which left this repository with no evaluation at all.

`read-it/evals/` is a test plugin and five cases run with `claude plugin eval`.
Each case is a closed issue whose outcome is known, with the repository rebuilt
at the commit before work on it started. A run sends `/thegraph <issue>`, and an
`llm` grader reads the confirm stop's reply: does it raise the wrong premise, or
leave a sound issue alone? Every case also runs with no plugin loaded, so a
score says what `thegraph` added and not only that the run passed.

## The call, and whose it was

The maintainer's, on 2026-10-27, while weighing whether `read-it` needed a
separate premise check (#40): *"테스트 환경을 먼저 만드는게 중요할거같은데"* —
measure before writing. Then four choices, each put to them:

- **Location**: beside the step it measures, so it retires with it. Not a
  revived root `evaluations/`.
- **Cases**: closed issues from this repository and the other repositories
  `/thegraph` has run in, three where the premise was wrong and two sound.
- **Under test**: `thegraph` and its steps, invoked as `/thegraph`, not `read-it`
  alone.
- **Models**: Opus for the agent under test and for the judge. Their correction
  to a recommendation of Sonnet for the judge: *"조사는 낮은모델 판단은 opus가
  하는게 맞는거아냐"*. A cheaper model may do the searching, but not the
  judging, and the agent under test is the thing measured, not the research.

## What it was decided on

- **The tool exists now.** `claude plugin eval` (Claude Code 2.1.311, read raw
  from code.claude.com/docs/en/plugin-evals.md) runs each case as an isolated
  `claude -p` session with a temporary home, no `CLAUDE.md`, no user skills and
  the eval directory hidden from the agent. Each case runs three times and again
  with no plugin.
- **It closes most of 0074's isolation findings by construction.** The baseline
  arm has no plugin, so it can neither find the skill nor read its description.
  Nothing needs a flag flipped mid-turn. One run is no longer the unit. 0074's
  findings about criteria still bind and were applied: habits, not vocabulary,
  and the baseline expectation written before the run (`expected_outcome`).
- **A spike on 2026-10-27 settled three unknowns.** A plugin whose skills are
  symlinks loads them. A `scaffold_script` can clone a local repository at a
  past commit. In `-p` mode the run ends at the confirm stop with a question,
  which is what gets graded.
- **Cases came from transcripts.** About 90 past `/thegraph` runs were read. Every
  wrong premise found had been raised by `read-it` itself at the confirm stop.
  A second pass over 95 runs looked for misses (reverts, reopened issues,
  corrections) and found one, which did no harm. So this suite guards a level
  `read-it` already reaches; it is not built to show a gap.

## The shape, and what each part prevents

| Part | Prevents |
|---|---|
| The issue is copied in as `.scratch/issues/<number>.md` | the case name (`…-premise-wrong`) reaching the run |
| `_fixture.sh` deletes every ref but one, the remote, and the reflog, then prunes | the run reading what happened after the commit; a later merge is unreachable |
| The issue body is a file in the case | `gh`, which is not authenticated inside a run |
| `model: claude-opus-5-5` in each case, `--judge-model claude-opus-5-5` on the command | a model rollout reading as a regression. An alias such as `opus` would move with the rollout |
| The plugin symlinks each `SKILL.md` **file**, not the skill directory | nothing, measured. The run is told the skill's base directory, which is inside `read-it/evals/`. What keeps the graders and this record out of reach is the run's sandbox: a probe on 2026-10-27 had `Read` denied on this repository and on `/Volumes/T7`, and `ls` denied on this repository. `ls` on `/Volumes/T7` succeeded, so with broad Bash a run could list the original clones; with `Bash(git:*)` it cannot |

## Measured

First case, one run per arm (2026-10-27): **with 1.0, without 1.0, Δ 0.** The
no-plugin Opus baseline also found that #43's experiment had left
`getLastError();` in place. Both arms ran `claude-opus-5-5`, read from the
trace. Cost: $0.74 for the two runs, plus $0.04 for the judge.

Full suite, three runs per arm (2026-10-27, $10.21, 455 s at `-j 4`; folderview-109 re-run with its sources the same day):

| Case | With | Without | Δ |
|---|---|---|---|
| x509-43, premise wrong | 1.00 | 0.67 | +0.33 |
| folderview-109, premise wrong | 1.00 | 0.33 | +0.67 |
| admin-44, conflicts with a record | 1.00 | 1.00 | 0 |
| x509-34, sound | 1.00 | 1.00 | 0 |
| admin-17, sound | 1.00 | 1.00 | 0 |

**On three of the five, Opus with no skill does as well as `/thegraph`.** The
two sound cases show neither arm attacking a sound issue. Δ is positive only on
the two premise-wrong cases that need the most reading. folderview-109 first scored 0.33 against
0.00: two of the three with-arm runs said they were blocked from the template's
0.3.0 source in the pub cache and from parent issue #98, both of which the
original run had read. Its fixture now supplies both: the source is copied under
the run's own temporary `~/.pub-cache`, and #98's body (last edited before #109
was filed) goes beside the issue. The case was re-run alone ($5.32), and every
run in both arms read both. Those are the scores in the table.

**The graders can fail.** Two mutants, each run once: x509-43 told to accept its
premise, and x509-34 told to call its premise false. Both verdicts went FAIL
3/3.

## The cost, stated

- **It runs only on this Mac**, with `/Volumes/T7` mounted: the fixtures clone
  local repositories, and one (`just-admin-page`) is private.
- **A run is not a real session, and the gap is wider than a missing
  `CLAUDE.md`.** `CLAUDE.md` is read as a file rather than loaded, and no
  other user skills are listed. `git` does not run at all: `/usr/bin/git` is
  the xcrun shim, which cannot write its cache inside the sandbox, and putting
  the real binary first on `PATH` did not reach the run. The pub cache and
  everything else under the home directory are unreadable, and there is no
  `gh`. So the with-arm reads the issue without commit history, without the
  cluster and without package sources, and it never writes its run sheet. A
  case whose answer needs one of those has to supply it in its fixture, as
  folderview-109 now does.
- **A full run costs about $10** at three runs per arm on Opus ($10.21 measured). It counts
  against the plan.
- **Where Δ is 0, the case measures the model, not `thegraph`.** It still guards
  the with-arm against a regression; it says nothing about what the skill adds.
