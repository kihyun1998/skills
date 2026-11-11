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
- **A worker is started without `--outlive-parent`**, since it would otherwise
  have nowhere to put a question. `hc` ends it when the parent's *program* ends.
  In a Herdr tab that program is the shell (`hc get` on the conductor showed
  `argv: ["/bin/zsh", "-l"]` with `claude` in `foreground`, 2026-11-11), so a
  worker can outlive the conductor's Claude session. A continued run therefore
  looks for its live workers by name prefix before anything else.

## Hardened on 2026-11-11

An adversarial read of the skill against the steps it calls and `hc --skill`
(hc 0.1.20) found these, now in the skill:

- **A worker runs with the conductor's permission flag**, the maintainer's call.
  Started with none, as before, it stops at every edit and command where user
  settings set no mode and allow nothing, which they did on this machine, and the
  person relays each approval. The 2026-11-10 test ran in auto mode and hid this.
- **The tree is checked before every worker and on continuing.** A worker closed
  after `stuck`, `error` or the conductor's end leaves its uncommitted edits, which
  the next worker's review (`git diff HEAD` plus untracked files) and commit would
  take in. The person decides: set aside with `git stash`, hand over, or stop.
- **A `done` report is checked against the commit and the tree before the worker
  is closed**, and a mismatch goes back to the same worker.
- **A turn that ends without a report is handled**, since `hc wait --children any`
  returns on any turn end, not only on a message.
- **Names carry the run id** (`tg-<run id>-<slug>`): `hc` names are unique among
  every live terminal and take only `a-z 0-9 - _`, which an issue file's name or a
  second run on the same number would break.
- **Each worker gets its own run-sheet name** for the skills it calls, since
  `check-it` saves `<run sheet>.review.md` and `.lens.md` and a second worker
  overwrote the first.
- **Carried items are written as they arise**, in the report's `## Carried`, as
  `thegraph` requires of the run sheet, so a compaction in a long worker does not
  lose them. Answers the person gives mid-worker go on the sheet under `## Answers`.
- **A worker's measurements are reproduced or marked as reported** before
  `ask-it`, which counts a subagent's probe as unmeasured until reproduced.
- **The brief names thegraph's path and the closing line**, which it had taken
  from the repo path and from a tracker doc that has no commit rule.
- **Waits run under the shell tool's limit** (`--timeout 100`), and ten silent
  check-ins in a row are told to the person.
- **A continued run after `ask-it`'s *needed, now*** gets a confirm with a model
  proposal per new issue, and the sheet is deleted only after the last `ask-it`.
- **Launch recovery puts the trust prompt to the person** instead of following the
  manual's `hc keys … down enter`.
- **More than four children's models** go to the person in several question calls,
  the tool's limit.

**The signals for `high` were defined**, the maintainer's call on 2026-11-11, after
the first runs: three of six model questions proposed Opus `high`. Two rested on a
cause read as unconfirmed only because it had not been reproduced, though
`read-it` had traced it to the code path (just-tooltip #111, flutter-table-plus
#225), and #225 gave its other ground only in that repository's own term. A cause
traced to a code path that explains every symptom now counts as confirmed, since
the signal guards against a worker chasing the wrong cause and `make-it`'s first
failing test checks the trace. A test that passes regardless counts as no test.
Each model question names its row in the table's words.

Known and kept: every code worker relays `tdd`'s seam confirmation at least once,
and a visual choice `design-it` would show cannot pass through a report file.

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

- **A person picks every model.** The conductor proposes each worker's model at
  the confirm stop, by question, with the recommendation first. Nothing starts on
  a model without an answer.
- **The conductor is the session the person invoked the skill in**, on the model
  they started it on. The skill names the issues worth conducting on Fable 5.2 (a
  root cause nobody has confirmed in a change across several layers, a large
  refactor, a migration or an architecture decision, or an earlier attempt that
  failed) and Opus 5.5 `medium` otherwise, for the person to settle before
  invoking.
- **"Judging is for Opus" applies to code review.** `check-it`'s reviewer and `lens`
  inherit the worker's model, so a code worker stays on Opus 5.5. The statement in
  ADR-0087 was made about an eval's judge; this extends it.
- **Workers:** route `prose` proposes Sonnet 5.5 `medium`; route `code` proposes
  Opus 5.5 `medium`, or `high` on a checkable signal with Fable 5.2 `medium`
  offered beside it. A large refactor, a migration or an architecture change
  proposes Fable 5.2 `medium` first, with Opus 5.5 `high` beside it. `xhigh` is
  not proposed. A worker's model and effort are always passed explicitly, since the
  user-level default would otherwise decide them.
- **A worker that falls short is offered the steps in order:** a way to check its
  own work, where it has none; one effort level up on the same model, as far as
  `high`; then the next model up, one effort level below the level that fell short.

### Revised on 2026-11-11

The maintainer's, after reading Anthropic's
[Which Claude model should you build with?](https://claude.dev/blog/which-claude-model-should-you-build-with/)
(2026-11-09) and weighing quality beside the weekly limit:

- **The conductor question and its new tab were removed.** Until this revision the
  run began by asking which model conducts, on a Haiku recommendation and a rule of
  `fable` at two or more open sub-issues, and opened a different choice in a new
  tab with a way back at the end. The post's default is Opus 5.5 `medium`, and its
  Fable rows are the hardest technical work, Opus at `high` falling short, and
  leading many subagents; it advises against a lead and workers for one chain of
  dependent steps, and workers here run in sequence. On Anthropic's defect search,
  Fable 5.2 as orchestrator in Opus 5.5's place cost 19% more for the same score.
  So most runs answered the question with the session's own model, while the
  person had already chosen a model by starting the session. A switch before
  invoking costs little, since the post's switching cost is rewriting the
  conversation into the new model's cache, and no worker exists yet to end with
  the session.
- **Fable 5.2 `medium` sits beside Opus 5.5 `high`.** On Anthropic's internal
  agentic coding, Opus 5.5 `high` is about 88.4% at about $1.39 per attempt
  (derived from the advisor row: 90.1% less 1.7 points, $2.92 over 2.1), and Fable
  5.2 `medium` 88.9% at $1.34 in a single run. On defect search Fable 5.2 `medium`
  scores F1 0.877 against 0.850, 2.7 points (1.5 to 3.8), for 1.6 times the cost.
  Opus `high` stays first on the signal row to spare Fable's share of the limit.
- **The escalation order** is the post's: self-verification, then effort, then the
  next model at lower effort.
- **Rejected:** a Sonnet 5.5 row for well-scoped code, which the post suggests for
  cost. On SWE-bench Pro Sonnet 5.5 `high` solves 87.6% at $0.11 per solved task
  against Opus 5.5 `medium` at 92.8% and $0.22, and the reviewer would inherit
  Sonnet. Opus 5.5 `high` as the code default (+2.5 points on SWE-bench Pro for
  about 1.4 times the cost) was weighed and left at `medium`. A Haiku `Explore`
  for workers: the post suggests one for cheap exploration, while Haiku subagents
  cost 4.2 points (1.3 to 7.1) on Anthropic's coding tasks. Checked on 2026-11-11
  in Claude Code 2.1.322 on a subscription: a Fable 5.2 session's built-in
  `Explore` ran on Opus 5.5, so it is not left on Fable.

All figures are Anthropic's, from the post and
[Optimizing for cost and intelligence](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence);
none is measured on this method.

Derived, on Anthropic's own figures, none measured on this method: SWE-bench Pro
over 463 problems has Opus 5.5 at 93.1% and $0.22 per solved task at its default,
95.5% and $0.30 at `high`, 96.5% and $0.75 at `xhigh`, and Fable 5.2 `high` at 96.3%
and $1.39. Internal defect search, on planted defects at 22M tokens, scores F1 0.760
for Sonnet 5.5, 0.827 and 0.850 for Opus 5.5 `medium` and `high`, and 0.909 for
Fable 5.2 `high`. Cost in a subscription's limit per model is not published, so
list prices stand in for it.

Checked on 2026-11-10: `hc run … claude --model opus --effort medium` started a
terminal showing Opus 5.5 at medium effort.

## Not measured

- Whether the conductor's model changes how well an issue is read. Count the
  readings corrected at the confirm stop, by conductor model.
- Whether a Fable 5.2 worker on the signal row needs less rework than Opus 5.5
  `high`.
- Whether the signals for `high` predict the issues that go `stuck` or need rework.
- What one worker uses of the weekly limit, by model.
- A real issue through `make-it` and `check-it` in a worker.
- `--label herdr.space=<id>` placing a worker in the window: the test ran hidden.
- A worker started with the conductor's permission flag, end to end.
- That a worker outlives a Herdr tab's Claude session: inferred from `hc run
  --help` and the conductor's `argv`, not run.
- Answering a question dialog in a worker with `hc keys`.
- Whether a cluster gains anything from this over one session. ADR-0088's three
  counts (offloading, overreach, outcome) still apply.

## Consequences

`thegraph-panel` acts only on the skill named `thegraph`, so it does not follow
this skill's runs; progress shows in Herdr's sidebar. A change to the sections this
skill reads in `thegraph` changes this skill too.
