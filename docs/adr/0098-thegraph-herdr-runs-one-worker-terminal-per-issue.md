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

## Not measured

- A real issue through `make-it` and `check-it` in a worker.
- `--label herdr.space=<id>` placing a worker in the window: the test ran hidden.
- A tool permission prompt in a worker. The test ran in auto mode and raised none.
- Whether a cluster gains anything from this over one session. ADR-0088's three
  counts (offloading, overreach, outcome) still apply.

## Consequences

`thegraph-panel` acts only on the skill named `thegraph`, so it does not follow
this skill's runs; progress shows in Herdr's sidebar. A change to the sections this
skill reads in `thegraph` changes this skill too.
