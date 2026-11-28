# ADR-0102 — `check-it`'s reviews are a catalog of its own fresh agents, picked per change by a decision model

**Status:** accepted. Implements #91; amended for #86, #95, #97, #102, #105,
#112 and #114, folded for #125 on 2026-11-23 into this one current record, and
amended since for #140, #141, #146, #138, #149, #150 and #158.
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
  (#141); the proving agent on Codex gets one (#158, below).
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
- **Each review's model** (#86, #105, #158): fixed for its role and the
  calling product whatever model the calling session runs on, set on the
  `Agent` call or, for a Codex row, passed to `codex exec`, shown at the
  confirm stop, and changed only where the person asks. The table is
  `check-it`'s. A Codex model or effort that `codex debug models` does not list
  is refused before Codex starts and never replaced by another (#158).
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
  saying so. Another CLI is one more runner entry.
- **The runner is keyed to the calling product** (#158, amending the fixed
  runner per role above). Each product completes the check with only its own
  CLI installed, so the table has a column per product, and the row above is
  Claude Code's. From Codex every role runs on Codex through `check-it.mjs run`,
  the decision model and the proving agent included, and a failed run has no
  other product to fall back to, so it is reported as not run, never as
  passed. The proving agent there reproduces in a copy the script makes of the
  files git lists, the one folder the sandbox lets it write, deleted when the
  run ends; the repository stays read-only and the hook unchanged. The Codex
  column's models are proposals until the real runs confirm them (#169).
- **How a Codex review is held** (#146): read-only files in Codex's
  `unelevated` Windows sandbox, with command network on, so a reviewer reads
  its tracker with the person's own login; only the core environment, so no
  token variable reaches a command; and Codex's sub-agent tool and connectors
  off.
  `check-it-reviewer`'s decision script runs as a Codex `PreToolUse` hook on
  every shell command and refuses what it refuses for a Claude review: an AI
  CLI, a kill by image name, a non-read inside the repository or naming a path
  inside it from anywhere (#147), any `gh`
  or `glab` command but a known read, and a write to a run's ledger but an
  append (#138), for either runner: an allowlist, as the
  repository rule is (#143), since a list of writes missed aliases, unlisted
  verbs and a `-R` between subcommand and verb at the first review. The issue's text also reaches every review through the prompt: the
  caller writes its body and decision comments to a file at the confirm stop,
  and `check-it.mjs` puts it at the prompt's end. **Known gap, accepted by the
  maintainer**: a command or a script that reads a stored credential (`gh auth
  token` reached through a variable, another interpreter, an encoded command or
  a script file) and calls a model API, a tracker's write API or any other host
  itself is held by no check, since the network is open and the hook reads only
  the command's text. **Two more known gaps, accepted by the maintainer at
  #147**, both Codex's own behaviour as its hooks documentation states it (read
  2026-11-24, not measured): `write_stdin` into a shell already started does not
  run `PreToolUse` again, so input sent to a running shell is not read by the
  hook; and a `PreToolUse` error, timeout or malformed answer lets the command
  run. Files stay read-only through the sandbox in both. Where the hook command would
  need quoting, the review falls back to Claude as any Codex failure does.
- **One report, one question** (#105): after the proving agent, every finding
  goes into one numbered report, and one question offers *fix as pre-ticked*,
  *fix nothing* or *pick by number*; no answer fixes nothing. A refactoring
  proposal is pre-ticked only where the change re-made something that already
  existed and the fix changes no behaviour, even where the fix edits a file
  outside the diff, the question naming each such file; any other refactoring
  proposal, and one the repository's `docs/agents/refactoring.md` settles
  against, is not (#149, #150). `thegraph-herdr`'s `done` check accepts a file outside what the
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
  failed on its proxy at `127.0.0.1:9`, while `claude --version` ran (#146
  then measured that this held only for programs that honour the proxy); a
  timed-out run leaves no child process behind on Windows. At the check-it
  question the maintainer chose that the proving agent also takes the Codex-run
  spec and rules reviewer's and `comment-it`'s findings, that any Codex failure
  falls back, and the 30-minute limit. Not measured: how
  a Codex review compares with a Claude review of the same change. Codex out
  of usage was seen once in #146: the error text the script reads, exit 1.
- **For the sandbox** (#146, at `/grilling 143, 144, 146` and three questions
  during the build, 2026-11-24, codex-cli 0.171.0, Windows 11 build 26200).
  The legacy read-only sandbox (`-s read-only`) sent `glab` to the dead proxy,
  so the spec reviewer could not read its issue, and a Node script in it
  reached `api.openai.com` directly (HTTP 401), so turning the network off had
  never held model runs for a program that ignores the proxy. Tried and left: the MXC
  sandbox with a tracker-host allowlist blocked the APIs but refused to change
  directory into the read-only tree, so `git diff` and `git status` failed;
  the elevated sandbox (one UAC setup) ran git, but its allowlist held nothing
  (`api.openai.com` answered with `Server: cloudflare`, through the proxy and
  with `--noproxy`), and with network off it blocked every host but once
  failed to start on Windows error 1909; tracker CLIs could not log in in
  either. Shown those, the maintainer chose the network on, read-only files,
  the tracker-write rule, the issue text and the hook, and accepted the gap
  above. Measured for the choice: with `inherit="core"`, `gh auth status`
  (keyring) and `glab auth status` (config file) still log in and `gh issue
  view 146` reads, the environment drops from 109 variables to 38 with none
  named for a token or key; in a real `codex exec` with the runner's
  arguments the hook refused `gh issue comment`, `codex --version` and a
  write in the repository while `gh issue view` and `git diff` ran. The hook
  loads from `-c` only with `--dangerously-bypass-hook-trust`, denies only
  through its JSON answer, and does not run when its command is quoted (Codex
  runs it through PowerShell, inferred). A hook in the reviewed tree's
  `.codex` does not load: under `--ignore-user-config` no saved project trust
  is read, so that layer stays disabled (0.171.0 source), and a run with the
  runner's arguments in a temporary repository listed as trusted showed it:
  its `.codex/hooks.json` SessionStart and PreToolUse hooks wrote nothing. Not measured: macOS and Linux.
- **For the calling product** (#158): #154's grilling (2026-11-27) decided
  that each product completes alone, that independent reviews and the decision
  model run as headless processes behind `check-it.mjs`, since a fresh process
  cannot share the author's context and in-session sub-agents inherit the
  parent's write permissions, and that each product gets a model column
  proposed from its CLI's own listing. At #158's confirm stop the maintainer
  chose the proving agent on Codex reproducing in a copy the script makes over
  a static proving agent whose findings would all stay unproven. Measured at
  build (2026-11-28, codex-cli 0.172.0, macOS, no model run): `codex debug
  models` lists each model with its efforts in 0.19 s, and under `codex
  sandbox` the profile with that copy as its one `write` path let a write and
  `git init` run there and refused one in the repository, the run folder and
  `/tmp`. Not measured: a real review run from Codex, and Windows.
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
- The real Codex runs (#169) refusing a proposed model, or the proving agent's
  copy failing on a platform's sandbox.
- #96's measurements, or a later trial, showing a Codex review missing what a
  Claude review of the same change caught, or Codex out of usage printing what
  the script does not read as out of usage.
- A bundled review gaining what removes the ground for replacing it:
  `/simplify` or `/security-review` a report-only mode that reads uncommitted
  and untracked files, or `/review` a way to leave out its rules and cleanups.
