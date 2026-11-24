# ADR-0102 — `check-it`'s reviews are a catalog of its own fresh agents, picked per change by a decision model

**Status:** accepted. Implements #91; amended for #86, #95, #97, #102, #105,
#112 and #114, folded for #125 on 2026-11-23 into this one current record, and
amended since for #140 and #141.
The amendment history is in git:
`git log -p -- docs/adr/0102-check-it-reviews-are-a-catalog-chosen-per-change.md`
shows the record before the fold.
The measurements, trials and cost tables it held are in
[docs/research/check-it-review-catalog.md](../research/check-it-review-catalog.md). It amends
[ADR-0066](0066-there-are-no-gates.md),
[ADR-0090](0090-four-delegates-retire-into-their-callers.md),
[ADR-0091](0091-lens-runs-in-a-fresh-agent.md),
[ADR-0095](0095-check-it-reviews-in-a-fresh-agent.md) and
[ADR-0098](0098-thegraph-herdr-runs-one-worker-terminal-per-issue.md) in the
parts their banners name.

The live rule is in [`check-it`](../../check-it/SKILL.md); this record says what
was decided, on what, and what would reopen it.

## What is decided

- **The catalog** (#91, #105). `check-it`'s reviews are its own refactoring
  reviewer, spec and rules reviewer, bug reviewer and security reviewer,
  `lens`, `comment-it` and the proving agent. Each is a fresh agent started
  with `Agent`, or on another CLI from the same prompt where its row's runner
  says so (#141), briefed by its prompt alone, and none edits. Claude Code's
  bundled `/review`, `/security-review` and `/simplify` are not run. `lens`
  and `comment-it` get their skill's body in the prompt and are not started
  through `Skill`.
- **The proving agent reproduces; it does not vote** (#91). It takes each
  finding of the refactoring, bug and security reviewers and `lens`, and
  returns it passed, dropped with why, or unproven for a person, saying whether
  this change introduced it. The spec and rules reviewer's and `comment-it`'s
  findings carry their own evidence and do not go through it, except where they
  ran on Codex, read-only, which cannot make the copy a reproduction needs
  (#141).
- **A decision model picks the reviews** (#112). No review is asked per change.
  A Haiku 5.5 agent at `medium` answers six fixed questions about the change,
  each with the lines that ground the answer or the search that found nothing,
  **yes where it cannot tell**, and picks the reviews with one line of reason
  each. It runs at the confirm stop on the planned change, its pick one line in
  the reading question that the person changes in words, and again at
  `check-it`'s start on the diff, where a review it adds is added unasked and
  nothing chosen is removed.
- **The floor** (#112): the spec and rules reviewer always runs, and the
  proving agent whenever a review it proves runs, which includes the spec and
  rules reviewer and `comment-it` on Codex. A person may remove any
  review in words, the floor included, and `check-it`'s start adds back nothing
  the person removed.
- **Each review's model** (#86, #105): fixed for its role whatever the calling
  session runs on, set on the `Agent` call or, for a Codex row, passed to
  `codex exec`, shown at the confirm stop, and
  changed only where the person asks. The table is `check-it`'s.
- **Each review's runner** (#141): the table also names the CLI each review
  runs in, changed at the confirm stop as a model is. The spec and rules
  reviewer and the bug reviewer default to Codex `gpt-6.1-sol` and
  `comment-it` to Codex `gpt-6-luna`; the refactoring and security reviewers,
  `lens`, the proving agent and the decision model stay on Claude. A Codex
  review runs from the same prompt through `check-it.mjs run`, as `codex exec`
  held read-only with the prompt on stdin, is a static review whose findings
  the proving agent reproduces, reports its tokens and wall time with no
  dollar figure, is stopped after 30 minutes, and falls back unasked to its
  row's Claude model when Codex is out of usage or fails otherwise, the result
  saying so. Its sandbox, not the agent type's hook, keeps it from starting a
  model run. Another CLI is one more runner entry.
- **One report, one question** (#105): after the proving agent, every finding
  goes into one numbered report, and one question offers *fix as pre-ticked*,
  *fix nothing* or *pick by number*; no answer fixes nothing. A refactoring
  proposal that changes behaviour or edits a file outside the diff is not
  pre-ticked. `thegraph-herdr`'s `done` check accepts a file outside what the
  confirm stop left alone where a fix the person picked touched it, listed with
  its finding's number.
- **The verify check is part of check (1), not a review** (#102, #105): where a
  project's verify skill covers a file the diff touches, its check runs unasked.
- **The briefs are files, and the fixed steps a script** (#114). Each brief is a
  file under `check-it/reviewers/`, and `check-it/scripts/check-it.mjs` prints
  each prompt, names each report, lists the diff's range and matches the verify
  coverage, stopping with an error where a piece is missing; CI runs its tests
  on macOS and Windows. **The instructions an agent reads are in markdown; the
  script makes paths, order, labels, headings, fixed values and the change's
  listing line (`changeLine`)**, which depends on the diff's file list and in markdown would
  need a conditional in the template (#140). The confirm stop's paragraph for
  the decision model is a section of `check-it/reviewers/decision-model.md`
  (#125).
- **Each review's cost goes in the result** (2026-11-20): its time and tokens,
  from its `Agent` call, or from the `turn.completed` events of a Codex run
  (#141), one line per review and per call of the decision model.

What a review copies, builds or starts follows `clean-it/RULES.md`
([ADR-0103](0103-what-a-step-makes-it-deletes.md)), and no review starts a model
run ([ADR-0053](0053-a-delegated-nodes-license-is-its-tool-grant-not-its-brief.md), #131).

## What it was decided on

Each call above is the maintainer's, made in a grilling or at a confirm stop or
`ask-it` and recorded on its issue: #91 (four rounds, 2026-11-19), #86, #95,
#97 and #102 (2026-11-19 to 20), #105 (two grillings), #112 and #114
(2026-11-20). What was derived at build is in the commits that made it. The
maintainer was shown:

- **For the catalog and the proving agent** (#91): a trial on `e88b0de` in
  which each review found what the others did not and the three lists shared
  three findings of about eighteen; Anthropic's own review practice, with
  separate finders, a separate group judging each finding, a separate security
  review and depth matched to risk; and this repository's measurement that about
  half of `lens`'s findings need no action. A reproduction is stronger evidence
  than agreement, and one agent costs less than a voting group.
- **For the models** (#86): published comparisons in which diff review peaks at
  Opus `high` and classification against a list holds on a small model. The
  `medium` rows are chosen from the work's kind, and whether a review's model
  changes what it catches in this method is not measured.
- **For replacing the bundled reviews** (#105): their prompts, read from Claude
  Code 2.1.329. `/simplify` always applies its fixes, and in a
  `thegraph-herdr` run its edits went through the checks with no person in
  between; `/review` also reports rules and cleanups, with no way to turn that
  off; `/security-review` reads only commits, skips markdown, and trusts
  arguments and environment variables. A skill per reviewer was weighed and not
  taken: each has one caller, and a model-invoked skill's description loads in
  every session (ADR-0090).
- **For the decision model** (#112): asking every review per change (#95) and a
  strength question (2026-11-20) had both been run; running one review too many
  costs less than missing one. It reverses the strength question's rejection of
  a Haiku layer, the maintainer's call reversed; it picks reviews, not models.
- **For the runner** (#141): one trial of the bug prompt on `codex exec`
  (codex-cli 0.171.0, 2026-11-23, on the issue's decision comment): 60 s,
  136,205 input tokens (95,104 cached), 1,994 output, no bug reported; writes
  refused inside and outside the tree; every command refused until
  `windows.sandbox` was set again under `--ignore-user-config`. Gemini's CLI
  was looked at and not taken. Measured at build (2026-11-24): no console
  window opens from the script's spawn (a visible-window watcher); from inside
  the read-only sandbox, `curl.exe` to `api.openai.com` and `api.anthropic.com`
  failed on its proxy at `127.0.0.1:9`, while `claude --version` ran; a
  timed-out run leaves no child process behind on Windows. At the check-it
  question the maintainer chose that the proving agent also takes the Codex-run
  spec and rules reviewer's and `comment-it`'s findings, that any Codex failure
  falls back, and the 30-minute limit. Not measured: how
  a Codex review compares with a Claude review of the same change, and Codex's
  exit and output when out of usage, read instead from the error text in its
  binary.
- **For the script** (#114): `check-it` had grown to 673 body lines against the
  repository's 500-line guidance, an agent not following the prose had twice
  been answered with more prose (#87, #92), and #87 measured a quarter of
  `lens` runs and 30% of `comment-it` runs doing nothing, nearly all of them
  started through `Skill` with an empty brief
  ([docs/research/check-it-subagent-models.md](../research/check-it-subagent-models.md),
  Part A).

The runs, times, tokens and costs behind each are in
[the research document](../research/check-it-review-catalog.md), and #87's in
[docs/research/check-it-subagent-models.md](../research/check-it-subagent-models.md).

## Left open

- **The security reviewer is not on the floor**, while text in the issue or the
  diff reaches the decision model and could steer it. Left open by the
  maintainer at #112's `ask-it`: the changes reviewed here are mostly the
  maintainer's own, two injection probes on Haiku 5.5 were resisted, and the
  security reviewer on the floor would cost every code run about 193 s and 85k
  tokens, the estimate given at that `ask-it`, whose source is not in the
  repository.
- **Whether the new reviewers catch what the bundled ones caught**, and whether
  the proving agent gets a time cap: each finding's time is recorded for #96's
  measurements to decide.

## What would reopen it

- `check-it` reviewing changes written by someone else, which removes the
  ground for leaving the security reviewer off the floor.
- #96's measurements showing a review missing what the bundled reviews caught,
  or a pick costing more than the reviews it saves.
- #96's measurements, or a later trial, showing a Codex review missing what a
  Claude review of the same change caught, or Codex out of usage printing what
  the script does not read as out of usage.
- A bundled review gaining what removes the ground for replacing it:
  `/simplify` or `/security-review` a report-only mode that reads uncommitted
  and untracked files, or `/review` a way to leave out its rules and cleanups.
