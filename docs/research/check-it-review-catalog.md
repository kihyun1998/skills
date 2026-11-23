# `check-it`'s review catalog: the trials, measurements and costs behind ADR-0102

The measurements, trial runs and cost tables that
[ADR-0102](../adr/0102-check-it-reviews-are-a-catalog-chosen-per-change.md)
was decided on. They are moved here unchanged from the record's amendment
sections when it was folded into a short current record (#125, 2026-11-23); the
record as it stood before the fold is in
`git log -p -- docs/adr/0102-check-it-reviews-are-a-catalog-chosen-per-change.md`.
Each section names the issue that ran it and its date. A section describes the
catalog as it was on that date: the bundled `/review`, `/security-review` and
`/simplify` it names were replaced in #105, and the per-change question in #112.

## The #91 trial and its grounds (2026-11-19)

- **The #91 trial on `e88b0de`** (session-restore's merge dialog), one run each:
  the bundled `/code-review` found five correctness bugs no other review found
  and reproduced none; `check-it`'s reviewer made the only reproduced finding
  and measurements nobody else made; duplication came only from the mattpocock
  skill and `/simplify`, which fixed it ($3.32, 179 s); `/security-review`
  agreed nothing was reachable ($0.33, 34 s). The three lists shared three
  findings of about eighteen.
- **Anthropic's own review** (claude.dev, *How the Claude Code team does code
  review*, 2026-10-15; `docs/research/check-it-subagent-models.md` Part B):
  parallel finders, a separate group that votes on each finding, a separate
  security review, depth matched to risk.
- **This repository's measurement** (Part A): about half of `lens`'s findings
  need no action (INERT 694 and DELIBERATE 352 of 2,114 graded), and the
  reviewer ran a test or build in 191 of 295 runs. A reproduction is stronger
  evidence than agreement, and one agent costs less than a voting group, so the
  proving agent reproduces rather than votes.

## The #91 replay through the always-on reviews (2026-11-19)

`e88b0de` again, replayed through the always-on reviews and `/security-review`
as `check-it` now words them: a scratch worktree at `e88b0de^` with the commit
applied as uncommitted changes, the state a worker's tree is in at check time.
`/simplify` and `lens` were not run: the trial already ran `/simplify` on this
change, and the replay measured the always-on set. One change, one run each.

| Review | Time, cost | What it reported |
|---|---|---|
| reviewer (5) | 253 s, 67 tool calls, 103,139 tokens | rules: ADR-0101 not amended and the prototype choice unrecorded (reproduced: no `docs/adr` diff), `sessions.svg` unused, README's "⟳ button" stale, three duplications (not run), Lucide's ISC notice missing; spec: a merged save's `at` makes its older records "newest" (reproduced with a script), the dialog closes silently when the merge made nothing, ticks stay after a merge; tests 106/106, `herdr-app check` on a copy with fixtures |
| `/review` (6) | 184 s, $0.78 | 8 findings, none run |
| `/security-review` (7) | 96 s, $0.67 | nothing at confidence 8 or above, with a table of the paths checked; it ran in the temporary worktree, on a diff holding exactly the change's 10 files |
| `comment-it` (9) | 54 s | nothing judged: this repository's `CLAUDE.md` has no comment rule |
| proving (11) | 153 s, 49 tool calls, 98,496 tokens | of `/review`'s 8: **5 passed** with a run or a quoted diff line (the silent close, the merged-save "newest", ticks kept, two spaces grouped under one label, the new comments against the user-level rule); **1 dropped** (a half-written file read by the watch: `herdr.d.ts` says writes replace files atomically); **2 unproven** for a person (the dialog inheriting `mod.json`'s `key`/`keep`, a double click opening two dialogs: both need the live window) |

Against the old reviewer's trial report (374 s, 88 tool calls):

- **Kept:** the reproduced spec finding, the unrecorded decision, the unused
  icon, the missing licence notice, ticks kept, and the `key`/`keep` question,
  now carried as *unproven* with how a person would show it.
- **Gained:** a reproduced bug nobody in the trial found (a merged save's
  records win as "newest"; both the reviewer and `/review` found it), the
  duplications, and the stale README line in the reviewer; `/review`'s silent
  close, proved by a run.
- **Dropped with a reason** instead of reaching a person: one finding of eight.
- **Lost against the trial:** the old reviewer's measured watch over other
  mods' stores (29 events a minute) and its "merged saves stay" break at the
  history limit; four of the trial `/review`'s findings (the watch busy loop, the
  failed Make leaving the error only, the delete prompt's count, reused ids) did
  not come back in this `/review` run. One run each cannot tell run-to-run
  variance from a weaker brief.
- `comment-it` judged nothing, while `/review` and the proving agent held the new
  comments to the user-level rule in `~/.claude/CLAUDE.md`. `comment-it` reads
  only the repository's own rule by design (#75).

## Each review's model (#86, 2026-11-19)

The table #86 decided, as it stood then:

| Review | Model, effort |
|---|---|
| spec + rules reviewer | Opus 5.5, `high` |
| `/review` | Opus 5.5, `high` |
| `/security-review` | Opus 5.5, `high` |
| `lens` | Opus 5.5, `high` |
| proving agent | Opus 5.5, `medium` |
| `/simplify` | Opus 5.5, `medium` |
| `comment-it` | Sonnet 5.5, `medium` |

**The call is the maintainer's**, grilled on 2026-11-19 and recorded on #86:
fixed per role rather than "never below the worker", which would put every review
on Fable 5.2 for a Fable worker (Anthropic's defect search: $563 against $236 at
Opus `high`); the table above; shown at the confirm stop. Grounds as given there:
diff review peaks at Opus `high`, `xhigh` lower (Qodo F1 56.8 against 54.0);
defect search Opus `high` 0.850, Sonnet 0.760 (Anthropic); classification against
a list holds on a small model (Kodus, Haiku agreeing with Opus on 249 of 252). The
proving agent's and `/simplify`'s `medium` are unmeasured, chosen from the work's
kind. Whether a review's model changes what it catches in this method is not
measured.

**Measured on the change**, 2026-11-19, Claude Code 2.1.328, one run: a worker
started with `claude -p --model claude-sonnet-5-5 --effort medium` followed this
branch's `check-it` on a two-file change in a scratch repository with an
`origin`, every offered review chosen (695 s, $1.57 for the worker and its
subagents, the built-ins' processes not counted). Each transcript's assistant
`model` and `effort`, read message by message:

| Review | `.meta.json` | Ran on |
|---|---|---|
| worker | — | Sonnet 5.5, `medium` |
| reviewer | `model: opus`, `effort: high` | Opus 5.5, `high` (20 messages) |
| proving agent | `model: opus`, `effort: medium` | Opus 5.5, `medium` (11) |
| `lens` | `claude-opus-5-5` | Opus 5.5, `high` (14) |
| `comment-it` | `claude-sonnet-5-5` | Sonnet 5.5, `medium` (4) |
| `/review` | its process's agent: `claude-opus-5-5` | Opus 5.5, `high` (11); the command arrived as `/code-review high` |
| `/security-review` | its process, in the temporary worktree | Opus 5.5, `high` (7) |
| `/simplify` | its process and four agents: `claude-opus-5-5` | Opus 5.5, `medium` (28, and 6 to 15 each) |

`lens` and `comment-it` ran as copies named `lens-86` and `comment-it-86` in
the scratch project, identical but for the name: the installed skills link to
the main checkout, and a personal skill outranks a project skill of the same
name. A `web-fetch` agent `lens` started ran on Haiku 5.5, that agent type's
own model; the table names the reviews, not the agents a review starts.

`check-it` on this change found the recipe's order matters: with the prompt after
`--allowedTools`, the flag took `/review high` as one of its values and the run
exited 1 (`"/review high" was read as a value of --allowedTools`). The prompt goes
before the flags.

## Every review choosable (#95, 2026-11-19)

**Measured on the change**, 2026-11-19, read-only: a fresh Opus 5.5 agent,
given this branch's `thegraph-herdr` step 2 and `check-it` and told to start no
worker, ask nothing and file nothing, wrote out the question-tool calls its
confirm stop would make on two open issues of this repository. One run each, on
the final text:

| Issue | Route | Review call | Default question | Offered question |
|---|---|---|---|---|
| #88 (`wiki-it` capture, a masking script and its test) | code | the third call, after the reading, the models and the permission mode (one call) and the placement (one call) | the reviewer, `/review`, `comment-it`, the proving agent; all recommended, each with what it would read in #88 and its cost from this record | `/security-review`, `/simplify`, `lens`; all recommended, each naming its signal (`gh` and secrets; a new script and `blog-it`'s shape; the enumeration of secret kinds); none left out, `origin/HEAD` checked |
| #93 (`lens` writes nothing in the reviewed tree) | prose | the third call, as above | the reviewer, run or drop, run recommended; the proving agent, `comment-it` and `sweep` named as left out, with why | `lens` recommended (prior art in the reviewer's temp-folder rule, a probe left in the tree costs more than a wrong number); `/security-review`, `/simplify` and `/review` each *no signal* with why, not recommended |

Every review was an option or named as left out, a recommendation came only with
a named signal, and the reviews sat in a call of their own. An earlier run of the
same probe on a first draft, which counted `sweep` as a review, put five default
reviews in two questions on #88; that draft is what `check-it`'s reviewer
found against #95's four. Not measured: a person answering the calls, and a
`thegraph` (not `-herdr`) or direct `/check-it` stop.

## Asked again, and `/simplify` outside the change (#97, 2026-11-19)

**Measured on the change**, 2026-11-19, Claude Code 2.1.328, one run each, in
scratch repositories:

- **`/simplify` outside the change.** A repository with `src/invoice.js`
  holding a private `isoDay()` and `src/legacy.js` holding an old smell (a loop
  in place of `toUpperCase()`); the change added `src/report.js` with `isoDay`'s
  body copied inline. The change, listed before the run: `src/report.js`.
  `claude -p "/simplify src/report.js" --model claude-opus-5-5 --effort medium
  --permission-mode acceptEdits --allowedTools Edit Write "Bash(git:*)"
  "Bash(node:*)"` (138 s) moved `isoDay` into a new `src/dates.js`, made `src/invoice.js`
  import it, and made `src/report.js` call it; it left `src/legacy.js` alone.
  A fresh Opus 5.5 agent, given that list, `/simplify`'s report, the tree and
  the final text of `check-it`'s *What `/simplify`'s edits keep*, wrote the
  result's list: `src/dates.js` (added) and `src/invoice.js` (edited), both kept,
  each with the duplication it merged as the reason; nothing reverted, and
  `src/legacy.js` untouched. Run after it:
  `reportHeader('Q1', new Date(2026,0,5))` gave `Q1 (2026-01-05)` and
  `invoiceLine` `ACME due 2026-01-05`. A first run, where the original was
  already exported, only added an import to the changed file and edited nothing
  outside it, so it did not measure the rule. Not measured: the revert path
  (`/simplify` touched no unrelated code in either run), the conductor's
  `done` check passing a listed file, and the list shown at `ask-it`.
- **Asked again at the start.** A fresh Opus 5.5 agent, given this branch's
  `check-it` as a `thegraph-herdr` worker whose confirm stop chose `lens` and
  not `/security-review` or `/simplify`, on a diff adding
  `execSync('git log -1 --format=%s -- ' + path)` in a clone with `origin/HEAD`:
  it wrote one question to the report file, *run `/security-review`?*, naming
  the signal (a shell command, an argument from outside) and the diff line,
  recommended; it did not ask about `/simplify` (no signal) or `lens` (chosen).
  Not measured: a diff with no new signal, where nothing should be asked.

## A project's verify skill (#102, 2026-11-20)

**Measured on the change**, 2026-11-20, in justssh at `6caf14d`, with
`verify-broker-tokens` and `crates/justssh-broker/verify/` untracked; one run
each, a fresh Opus 5.5 agent (`medium`) given only the new *A project's verify
skill* section of `check-it`:

| Scratch diff | Signal | What ran |
|---|---|---|
| one blank line appended to `crates/justssh-broker/src/tokens.rs` | on: `tokens.rs` is in the diff and in the skill's covered files | the skill's `git diff 6caf14d -- …` step (the hunk is after `mint()`, which the skill lists as not covered), then `bash crates/justssh-broker/verify/tokens/check.sh`: exit 0 in 64 s, `pins.cfg` and `launch.cfg` pass, the two `finding-*` configs violate the invariants the skill expects |
| one blank line appended to `README.md` | off: neither `tokens.rs` nor `caller.rs` is in the diff | nothing |

The first agent's notes changed the section before the second ran: the coverage
record has no heading of its own in justssh's skill, the check runs even when the
touched function is not covered, `statechart` was written as person-invoked, and
the cost on record was 43 s against 64 s here. The second agent asked whether
the untracked model files count as covered; the section now says they do not.
The spec and rules reviewer reproduced both rows in a copy of justssh without
`.git` (62 s, exit 0). The re-read of the revised section walked a diff that
removes the `issued.frozen` check from `Tokens::authorize`: the repository's
model passes; a copy with the model's `/\ ~frozen` (`BrokerTokens.tla:142`)
removed to match the new code gave `pins.cfg` `got NoGrantWhileFrozen …
UNEXPECTED`, exit 1, in 1 s, a counterexample every step of which the new code
allows, so the change goes back to `make-it`. Not measured: the whole run on a
copy, reading it with `statechart`, and a person reading the drift report; the scratch diffs were removed and justssh's tree
left as found.

## The review strength, and what each review cost (2026-11-20)

The strength question and the rejection of a Haiku layer below were reversed by
#112; the cost line in the result and the uncapped proving agent stand.

**The call.** It is the maintainer's, made at the ask-it of the `/thegraph-herdr 78` run. The maintainer said `check-it` uses a great deal, uncounted, and asked whether to choose fewer reviews, or to say first what a change should get. Two changes came out of it, and one was deferred:

- **Each review's cost goes in the result.** Each review gets one line with its time and, where the harness reports them, its tokens and cost. An `Agent` call reports `subagent_tokens` and `duration_ms`. A `claude -p` process run with `--output-format json` reports `total_cost_usd`, `duration_ms` and `modelUsage`; one call was measured, 2026-11-20. A forked `Skill` reports neither, so its line gives the time only.
- **The review strength opens the review call.** It has three options. *light* ticks the reviewer, plus `/review` at `medium` on code. *usual* ticks the default set as it was, and is recommended. *thorough* ticks the usual set plus every offered review that meets its signal. Every review can still be ticked or unticked after the strength is picked.
- **A cap on the proving agent was not set.** At first the conductor proposed ten minutes a finding. It then withdrew that: on #100 the long probes were the ones that found real defects (the janitor's EPERM cleanup, a kill sent to a pid that had already exited), and a capped finding goes to a person who can reproduce it less easily. So the proving agent records the time each finding took, and a cap is decided from those times, with #96's week of measurement.

**Rejected.** A Haiku layer that reads the person's intent and picks the reviews and their models. Choosing is one question and costs little; the cost is in running the reviews. A model picked by a model also runs against "a person picks every model" (`thegraph-herdr`) and against #86's rows changing only where the person asks.

**What it did not cover.** Which reviews *light* holds on a prose change beyond the reviewer, and whether the strength should also lower an effort other than `/review`'s. Both wait for the recorded costs.

## The bundled reviews read, and `check-it`'s own reviewers measured (#105, 2026-11-20)

Read from the prompts bundled in Claude Code 2.1.329:
`/simplify` always applies its fixes and has no report-only mode; `/review`
reports only, but also reports `CLAUDE.md` rules and cleanups, overlapping the
reviewer and `/simplify`, with no flag to turn that off; `/security-review`
reads only commits, excludes markdown, and treats command-line arguments and
environment variables as trusted, while `check-it` offered it on prose and named
"arguments" and "shell" as signals.

**Measured on the change**, 2026-11-20, Claude Code 2.1.329, one run: a
headless worker (`claude -p --model claude-opus-5-5 --effort medium`) ran this
branch's `/check-it` on a scratch Python repository whose uncommitted change
added `parse_duration` with four planted faults: an empty string returning 0
where the issue asks for `ValueError`, a re-made `hours_to_seconds`, a comment
the repository's rule forbids, and an import inside the function. Every review
was chosen; the prompt told it to write its one question to a file and take
*fix nothing* as the answer (280 s, $3.47 for the worker and its agents).

| Review | Model, read from its transcript | Time | Tokens |
|---|---|---|---|
| refactoring (4) | `claude-opus-5-5`, `medium` | 39.1 s | 26,554 |
| spec and rules (5) | `claude-opus-5-5`, `high` | 50.5 s | 27,068 |
| bug (6) | `claude-opus-5-5`, `high` | 39.8 s | 27,015 |
| security (7) | `claude-opus-5-5`, `high` | 39.5 s | 26,310 |
| `lens` (8) | `claude-opus-5-5`, `high` | 106.2 s | 40,793 |
| `comment-it` (9) | `claude-sonnet-5-5`, `medium` | 7.2 s | 23,152 |
| proving (11) | `claude-opus-5-5`, `medium` | 137.7 s | 39,706 |

- **No review edited.** No agent's transcript holds an `Edit` or `Write` call,
  and the hash of `git diff HEAD` plus the untracked list was the same before
  the run and after it.
- **The findings went through the proving agent** and into one report of 12:
  group 1 held the empty string (found by the reviewer, the bug reviewer and
  `lens`), the comment (the reviewer, `lens`, `comment-it`) and five refactoring
  proposals; group 2 a trailing newline and non-ASCII digits being accepted,
  which the issue does not settle, and the single test; three drops with
  grounds. The security reviewer found nothing, with the path `text` takes.
- **The question appeared** with the three options, the report's path and
  group 1 listed; *fix nothing* left the tree as the reviews found it.
- **#87 did not recur**: the `lens` and `comment-it` agents' prompts held their
  skill's body (`lens`'s opening line and `comment-it`'s heading found in the
  prompt), neither called `Skill`, and both returned a report.
- Seen and not from this change: `clean-it` had no link in `~/.claude/skills`
  on this machine (`scripts/install-skills.sh` had not run since it was added),
  so `../clean-it/RULES.md` did not resolve and the worker wrote the cleanup
  rules into each brief itself; it wrote its
  shared brief text to `/tmp/checkit`, outside the run folder; and it read the
  README and docstring itself rather than calling `sweep`.

Not measured: a code change through `thegraph-herdr`, where the question goes
through the conductor; a person answering by number; a fix and the checks
after it.

## The decision model measured (#112, 2026-11-20)

**Measured on the change**, 2026-11-20, four calls of the decision model through
`Agent` (`model: "haiku"`, `effort: "medium"`), each given *Choosing the
reviews*' quoted text as `check-it` now writes it and the change; every
assistant message in the four transcripts names `claude-haiku-5-5`. Two
changes:

- **Code**: a scratch Python repository in the run folder whose issue asks for a
  `--json` flag on `report.py`, the text output kept. The diff did that and also,
  unasked, read amounts from a feed file named by `REPORT_FEED` when none are
  given, with a comment and a `# noqa: SIM115` on the new function.
- **Prose**: this change, #112: at the confirm stop from #112's body and the two
  statements of its brief, and at the start from `git diff HEAD` over
  `check-it`, `thegraph`, `thegraph-herdr`, `GLOSSARY.md` and `README.md`
  before this section was written.

| Change, moment | 1 | 2 | 3 | 4 | 5 | 6 | Picked | Time | Tokens |
|---|---|---|---|---|---|---|---|---|---|
| code, confirm stop | yes | yes | yes | yes | no | no | bug, security, `lens` | 24.5 s | 39,928 |
| code, start | yes | yes | yes | yes | yes | yes | refactoring, bug, security, `lens`, `comment-it` | 20.9 s | 39,894 |
| prose, confirm stop | yes | yes | yes | yes | yes | no | refactoring, bug, security, `lens` | 24.8 s | 45,103 |
| prose, start | yes | yes | yes | yes | yes | no | refactoring, bug, security, `lens` | 33.5 s | 64,334 |

- **Every answer carried its lines**: file and line from the diff at the start
  (`report.py:15`, `prose.diff:202-203`), and the sentence of the issue or
  statement at the confirm stop (*"The text output stays as it is."*). Every
  review had one line of reason, picked or not.
- **The start added two reviews on the code change**, with reasons: the
  refactoring reviewer for the new `load_rows` and `--json` tested in two
  places, and `comment-it` for the new comment and the `noqa`. Question 2's
  ground moved from `argv` to `REPORT_FEED` and the feed file's content. The
  prose change's start added nothing, which is the ordinary case.
- **Seen**: at the code confirm stop question 2 went yes on the program's own
  `argv`, under *cannot tell*; the two code calls answered in Korean and the two
  prose calls in English, the user-level instructions asking for Korean, with
  the shape held in all four.

Not measured: a confirm stop run by `thegraph` or `thegraph-herdr` itself, with a
person changing the pick in words; the run sheet and brief lines; a call that
fails.

## The briefs as files and the script (#114, 2026-11-20)

**Measured on the change**, 2026-11-20: `check-it`'s body is 497 lines with the
frontmatter excluded, from 673 at `7edfcd8`; `node --test
"check-it/scripts/*.test.mjs"` passes 37 of 37 on Node 24.11.1, macOS, and 37 of
37 on a copy with every `.md` turned to CRLF; each of 21 mutations to the
script turned at least one test red; `windowsHide` removed turned none red,
since no test here can see a window. Every review prompt of #114's own
`check-it` was printed by the script and handed to `Agent` as printed.

- *Done when*'s replay of a past change: the script, run on #112's `e1b5e7c`
  applied uncommitted to a scratch clone of its parent, listed that commit's
  nine files, assembled the `spec-rules`, `bug`, `lens` and `pick` prompts
  (3,369 to 12,810 bytes) with no placeholder left and no maintainer paragraph,
  named the `pick` report in the run folder, and stopped on a `--covered` path
  not in the tree. No review was run on it.

Left unproven: a prompt over about 30,000 characters reaching the model as a
preview (#96 watches it), and whether a Windows short temp path breaks a CLI
test (the job's first Windows run shows it).
