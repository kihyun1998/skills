# ADR-0098 — `thegraph-herdr` runs one worker terminal per issue

**Status:** proposed.

`thegraph-herdr` is a separate, user-invoked skill for runs inside Herdr. The
session the person talks to is the **conductor**: it runs `read-it`, the one
confirm stop, the run sheet and `ask-it`. Each issue goes to one **worker**, an
interactive agent in its own `hc` terminal, which runs `make-it` and `check-it`,
commits locally and reports back. Workers run one at a time.

## The call, and whose it was

The maintainer's:

- **A separate skill.** `thegraph` is left as it is, as `thegraph-codex` is a
  separate skill. ADR-0088 rejected a separate orchestrator on two grounds: a skill
  cannot invoke the user-invoked `thegraph`, and copying its order is a second copy
  of the method. This skill does not invoke `thegraph`. It writes a short order of
  its own, and reads `thegraph`'s signals, rules and habits from its `SKILL.md` at
  run time.
- **One worker per issue**, not per step. It was recommended because `check-it`
  already reviews in fresh agents (ADR-0091, ADR-0095), and a failed check is fixed
  in the session that wrote the change.

Derived:

- **It calls the four steps directly.** They are model-invoked; `thegraph` is not.
  So no worker needs `/thegraph`, and no per-issue confirm stop or `ask-it` returns.
- **Workers run in sequence**, on one working tree. A later issue is written on the
  earlier one's local commit (ADR-0088), so parallel workers would need worktrees
  and a merge step.
- **Only the conductor talks to the person and writes the run sheet**, so there is
  one list of carried items and one writer.
- **A worker ends with its conductor**, since it would otherwise have nowhere to
  put a question.

## What it was decided on

One test worker in a throwaway repository, on Windows, `hc` 0.1.19, `herdr-app`
0.1.14, Claude Code 2.1.321, on 2026-11-10, started without a window label:

- `make-it` and `check-it` were in the worker's skill list.
- A question tool call was reported by `hc wait --children any` as `blocked`, with
  `kind: question` and the question text.
- The worker committed, wrote its report, and `hc send` reached the conductor as a
  tagged message, ending the wait with `reason: message`.
- The folder trust prompt in a new directory was **not** reported as blocked: the
  wait returned `timeout` with the worker at turn 0.

## Which model sits where

The maintainer's, on 2026-11-10, with the weekly usage limit as what is being
protected. The facts behind it are in
[`docs/research/thegraph-herdr-models-context.md`](../research/thegraph-herdr-models-context.md).

- **A person picks every model.** Haiku and the conductor propose, by question,
  with the recommendation first. Nothing starts on a model without an answer. This
  adds a question before `read-it`, on top of the one guaranteed stop.
- **The conductor is Fable 5.2 or Opus 5.5, at `medium`, by question.** A Haiku
  subagent recommends from the issue's text and its count of open sub-issues, since
  nothing has been read yet. The plain rule (`fable` at two or more open
  sub-issues) is recorded beside it, to show whether Haiku adds anything to it.
- **"Judging is for Opus" applies to code review.** `check-it`'s reviewer and `lens`
  inherit the worker's model, so a code worker stays on Opus 5.5. The statement in
  ADR-0087 was made about an eval's judge; this extends it.
- **Workers:** route `prose` proposes Sonnet 5.5 `medium`; route `code` proposes
  Opus 5.5 `medium`, or `high` on a checkable signal. `xhigh` and Fable are not
  proposed. A worker's model and effort are always passed explicitly, since the
  user-level default would otherwise decide them.

Derived, on Anthropic's own figures, none measured on this method: SWE-bench Pro
over 463 problems has Opus 5.5 at 93.1% and $0.22 per solved task at its default,
95.5% and $0.30 at `high`, 96.5% and $0.75 at `xhigh`, and Fable 5.2 `high` at 96.3%
and $1.39. Internal defect search, on planted defects at 22M tokens, scores F1 0.760
for Sonnet 5.5, 0.827 and 0.850 for Opus 5.5 `medium` and `high`, and 0.909 for
Fable 5.2 `high`. Cost in a subscription's limit per model is not published, so
list prices stand in for it.

Checked on 2026-11-10: `hc run … claude --model opus --effort medium` started a
terminal showing Opus 5.5 at medium effort, and one Haiku 5.5 subagent returned a
recommendation and its reason for a real issue. A tab opened with `herdr-app do
tab.new --argv`, whose first message was `/thegraph-herdr <issue file> Conductor
chosen: …`, ran the skill, skipped step 0, wrote the `conductor` line, ran `read-it`
and stopped at the confirm question, reported by `hc` as `blocked` with `kind:
question`. Started without that line, on a no-op issue, the skill put the conductor
question with Haiku's recommendation first. Answered with the session's own model
(Opus) it went on in the same tab. A Sonnet session answered with Opus opened a new
tab on Opus 5.5 at medium effort and ended, and that tab reached the confirm stop.

**A different conductor opens in a new tab**, not by `/model` in the session: the
chosen model then runs from its first token, and a `hc` child would end with the
session that started it.

**The first tab is left open, and the way back is asked at the end.** The
maintainer's, on 2026-11-10. A run on a different model ended in the new tab, with
nothing leading back to the tab it started in. `tab.close` ends every terminal in
a tab and the skill does not know what else is in the first one, so the only tab
it closes is the one it opened. The new tab receives the first tab's id and, as
its last act, asks whether to go back and close, go back and keep, or stay. It is
asked rather than done on its own because a person answering is at the window and
has read the closing report, where a screen moved unasked could send typing to the
wrong tab. `hc send` to the first tab was set aside: an idle session would spend a
turn of the weekly limit on being told.

Checked on 2026-11-10 with a throwaway tab running a script in the same space:
`tab.select` to the first tab returned `ok`, `tab.close --confirmed true` of its own
tab returned `ok` and ended the script, and `herdr-app ls` then showed the first
tab active in its space and the throwaway tab gone. An unknown tab id returned `no
such tab` and exit 1. The window was on another space during the check, so what it
showed was not seen, and whether `tab.select` also changes the shown space is not
known. The run needs only the same space, since step 0 opens the tab there.

## Not measured

- Whether the conductor's model changes how well an issue is read. Count the
  readings corrected at the confirm stop, by conductor model.
- Whether Haiku's recommendation differs from the plain rule.
- Whether the signals for `high` predict the issues that go `stuck` or need rework.
- What one worker uses of the weekly limit, by model.
- A real issue through `make-it` and `check-it` in a worker.
- `--label herdr.space=<id>` placing a worker in the window: the test ran hidden.
- A tool permission prompt in a worker. The test ran in auto mode and raised none.
- The way back at the end of a real run, from a Claude session in the new tab.
- Whether a cluster gains anything from this over one session. ADR-0088's three
  counts (offloading, overreach, outcome) still apply.

## Consequences

`thegraph-panel` acts only on the skill named `thegraph`, so it does not follow
this skill's runs; progress shows in Herdr's sidebar. A change to the sections this
skill reads in `thegraph` changes this skill too.
