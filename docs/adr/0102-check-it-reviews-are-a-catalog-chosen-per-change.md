# ADR-0102 — `check-it`'s reviews are a catalog: built-ins where they exist, its own reviewer for spec and rules, a proving step, and the risky ones chosen per change

> **Amended for #86 on 2026-11-19** (*Each review's model*, below). Each review
> now runs on a model fixed for its role, whatever the worker runs on, and the
> built-ins' processes take `--model` and `--effort`. *Not decided here*'s first
> item is decided there. This amends ADR-0091, ADR-0095 and ADR-0098 where they
> say a review inherits the session's or the worker's model.
>
> **Amended for #95 on 2026-11-19** (*Every review is choosable*, below). The
> reviews marked *always* are recommended by default and run unless the person
> drops them; every review is asked in a call of its own, with this change's
> evidence on each option.
>
> **Amended for #97 on 2026-11-19** (*Asked again, and `/simplify` outside the
> change*, below). `check-it` asks once at its start for an offered review the
> diff now gives a signal, and keeps a `/simplify` refactor tied to the change
> in files outside it, listed with why. *Not decided here*'s second and third
> items are decided there. It amends ADR-0098's `done` check: a file so listed
> as kept is not sent back.
>
> **Amended for #102 on 2026-11-20** (*A project's verify skill*, below). Where
> the repository has a verify skill and the diff touches a file its coverage
> record names, `check-it` runs that skill's check as a default review.

**Status:** accepted. Implements #91 (anchor #94). Amends
[ADR-0090](0090-four-delegates-retire-into-their-callers.md),
[ADR-0091](0091-lens-runs-in-a-fresh-agent.md) and
[ADR-0095](0095-check-it-reviews-in-a-fresh-agent.md) in the parts named below;
the rest of each stands. #79, the wider disagreement between those records and the skills,
stays deferred.

On every code change, `check-it` runs its own spec and rules reviewer, Claude
Code's bundled `/review` for bugs, `comment-it`, and one proving agent last. On
a prose change only the reviewer always runs. `/security-review`, `/simplify`
and `lens` are offered: recommended from the change's risk, and run where the
person chose them. The bundled reviews run in a `claude -p` process each.

| Review | Runs as | Code change | Prose change |
|---|---|---|---|
| bug review | bundled `/code-review`, called `/review` | always | offered |
| spec review + rules review | `check-it`'s own reviewer, a fresh agent, reproduction per finding, no harm question | always | always |
| `comment-it` | as is | always | — |
| proving | one fresh agent: reproduces each finding of `/review`, `/security-review` and `lens`; passed, dropped with why, or *unproven* for a person | always | over what ran |
| security review | bundled `/security-review`, where there is an `origin` remote | offered on risk | offered |
| design review | bundled `/simplify`, which applies its fixes; the earlier checks run again on them | offered on risk | offered |
| `lens` | as is | offered on risk | offered |
| performance review | the worker's conditional measurement (`benchmark.md`) | when its condition holds | — |
| verify review (#102) | the project's verify skill's own check, run in the working session | default where a verify skill covers a file the diff touches | — |

Order: `/simplify` first, then the cheap checks again, then the reading reviews at
the same time, the proving agent last. The offered reviews are asked at
`thegraph`'s and `thegraph-herdr`'s confirm stop, the second handing the answer to
the worker in its brief, or once at the start of a direct `/check-it`.

## What it amends

- **ADR-0091**: *"`check-it` runs it on every change"*. `lens` is now offered,
  recommended on its own Use-when. The caller re-opening every `CONFIRMED`
  citation is now the proving agent's work, and the caller re-runs a passed
  finding's reproduction before acting on it. The fork, the brief as its
  argument, and the caller saving the report stand.
- **ADR-0095**: *"one agent for review and harm together"*. The reviewer keeps
  the rules and spec questions; harm leaves it for `/security-review`, which is
  offered, so where the person does not choose it nothing asks harm. *"A prose
  change runs neither"* is replaced: a prose change always runs the reviewer.
  The fresh agent, its brief and reproduction per finding stand.
- **ADR-0090**: *"`security-review` leaves `check-it`'s `requires:`"*. It is
  back, as the bundled skill run in its own process.

## The call, and whose it was

**The catalog, which reviews are always on and which offered, and the signals a
review is recommended on are the maintainer's**, grilled on 2026-11-19 in four
rounds recorded on #91: built-ins where they exist (round 1), `/simplify` as the
design review and the reviewer kept for spec and rules (round 2), a proving step
rather than a vote, and the mandatory and offered split (round 3), and the direct
run's question and the recommendation signals (round 4). Accepted with it:
`/simplify` is the most expensive review in the trial, and its edits do not
pass the proving step. Asking at the confirm stop rather than in `check-it` was
decided earlier on #91, for one stop with the issue already read.

**The order is a technical call** (round 3): `/simplify` edits, so it goes
before anything that reads the diff.

**How the built-ins start is a derivation**, made at build on these facts, all
read or measured on 2026-11-19 with Claude Code 2.1.328:

- `Skill({skill: "review"})` answers `Unknown skill: review`, and `Skill` with
  `code-review` reaches the installed mattpocock skill, which replaces the
  bundled `/code-review` but not its `/review` alias (`code-review-local.md`,
  *Replace the command*; `skills.md`, *Resolve skills that share a name*). So
  `/review` runs as `claude -p "/review"`. `/security-review` and `/simplify`
  are in a session's skill list and were not tried through `Skill`; they run
  the same way for one recipe, the one the #91 trial measured, and a process
  that never saw the writing session. #86 moves them to `claude -p --model`;
  nothing here picks a model.
- Git Bash rewrites a leading `/` into a Windows path unless
  `MSYS_NO_PATHCONV=1`, and `-p` denies `gh` and test commands unless they are
  in `--allowedTools` (the #91 trial).
- The bundled `/review` reads `git diff @{upstream}...HEAD` (or `main...HEAD`),
  and also `git diff HEAD` when there are uncommitted changes (its prompt, read
  from `claude.exe`). So a branch's earlier commits are in its scope, and
  untracked files are not: new files are marked `git add --intent-to-add`
  first and unmarked after, since a marked file makes `git stash` exit 1
  (reproduced in a scratch repository). `/simplify` shares that prompt's diff
  step, so it gets the same marking and the change's paths as its target.
- `/security-review` needs the `origin/HEAD` ref, not only an `origin` remote
  (`errors.md`, *`/security-review` fails without `origin/HEAD`*), so it is
  offered where `git rev-parse --verify origin/HEAD` succeeds.
- The bundled `/security-review` reads `git diff origin/HEAD...` (its prompt,
  read from `claude.exe`): commits only. A probe untracked file did not appear
  in it, and this branch's unpushed commits did. So it runs in a temporary
  worktree where the change is committed. Its diff there also holds the branch's
  commits not yet on `origin`, and it takes no target to narrow that.

Found by `check-it` on this change and settled at build, each a derivation: a
run of `claude -p` gets a 15-minute timeout (the replay's runs took up to 184 s,
past a shell's two-minute default); what `/simplify` names and leaves unfixed
goes to the proving agent with the other reading reviews' findings, so it is not
lost; a passed finding is still routed by `check-it`'s *Going back* table, so a
pre-existing one or one asking a decision reaches a person; a file `/simplify`
adds takes its home from `/simplify`'s report; in a `thegraph` cluster the
choice is kept per child in a `## Reviews` section of the run sheet.

## What it was decided on

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
- ADR-0091 and ADR-0095 chose one reader on measured runs that did not have a
  pipeline like Anthropic's in view, so on this point they were untested rather
  than settled.

## Measured on the change

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

## Not decided here

- Each review's model and effort, and moving the built-ins to `claude -p
  --model`: #86. Without an effort level `/review` reuses the last one the
  person typed, in any session. (Decided for #86 in *Each review's model*,
  below.)
- Asking again mid-run: the offered reviews are chosen before the change is
  written, and a change that turns risky while it is written (an outside command
  added, a gap that keeps reopening) has no way back to the question. Round 4
  did not cover it. (Decided for #97 in *Asked again, and `/simplify` outside
  the change*, below.)
- `/simplify`'s fixes against `check-it`'s *not fixed here*: an altitude fix
  can move a cause into a layer the change did not own, and in
  `thegraph-herdr` an edit outside what the confirm stop said is left alone is
  sent back. Its target narrows what it reviews, not every file it may edit.
  (Decided for #97 in *Asked again, and `/simplify` outside the change*,
  below.)
- Whether a fresh agent's result that arrives in the background is read: #92.
  (Decided for #92 in `check-it`'s *Briefing the fresh agents*: it is waited
  for and read where it arrives, and one that never came back is not run.)
- Where `lens` writes: #93.
- How often the always-on set catches what the old reviewer did: one change is
  a first look. #91's *Done when* asks for past changes of different risk.

## Each review's model (#86, 2026-11-19)

Each review runs on a model fixed for its role, whatever model the worker or the
session calling `check-it` runs on. `check-it`'s *Each review's model* holds the
table, shown at `thegraph`'s and `thegraph-herdr`'s confirm stop beside the
offered reviews, and changed only where the person asks.

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

**Where each is set is a derivation**, from the Claude Code docs read raw on
2026-11-19 (Claude Code 2.1.328):

- `lens` and `comment-it`: `model` and `effort` in their frontmatter. With
  `context: fork` each "sets the forked subagent's" model or effort level instead
  of the turn's (`skills.md`, *Frontmatter reference*). The full IDs
  `claude-opus-5-5` and `claude-sonnet-5-5` pin the version the table names.
- The reviewer and the proving agent: `model` and `effort` on the `Agent` call.
  The per-invocation `model` comes first in the subagent model order and takes
  an alias only, so `opus`; the per-invocation `effort` overrides a
  definition's (`sub-agents.md`, *Choose a model*, *Choose an effort level*,
  v2.1.292 or later). A subagent on another model than the session's does not
  take the session's effort, so the effort is always passed.
- The built-ins: `--model claude-opus-5-5` and `--effort` on their `claude -p`
  process (`cli-reference.md`). `/simplify`'s four agents are subagents on the
  process's model, and a subagent on the main model runs at the `--effort`
  level (`model-config.md`, *Effort level of subagents and teammates*).
  `/review` also gets its level as the command's argument, `/review high`: with
  none typed it reuses the last level typed in any session, and a level passed in
  a `-p` run is not remembered (`code-review-local.md`, *Tune effort and
  arguments*).

**What the decision did not cover**, recorded so the next pass does not read it
as decided:

- A changed row for `lens` or `comment-it` cannot apply within a run: their
  model is frontmatter, `Skill` takes no model, and calling them through an agent
  is what #87 measured empty. `check-it` reports such a change as not applied.
- `CLAUDE_CODE_EFFORT_LEVEL` outranks every effort set here, and
  `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` every subagent model; both unset on this
  machine on 2026-11-19. With the `opus` alias on an `Agent` call, a session on
  another Opus version, a worker or a session a person started, runs the
  subagent on its own version (`sub-agents.md`, *Which version a model alias
  selects*), and an `Agent` call takes no full model ID to prevent it.
- `lens`'s and `comment-it`'s frontmatter holds for every caller, not only
  `check-it`: `lens` over the options on an open decision, under a Fable 5.2
  conductor, now runs on Opus 5.5 too.
- A request a cyber classifier flags on Opus 5.5 is retried on another model
  (`model-config.md`), so a review of such a change can run off its row without
  a sign in the table.
- ADR-0098 rejected a Sonnet 5.5 code row partly because "the reviewer would
  inherit Sonnet". That ground no longer holds; the row is not reopened here.

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

## Every review is choosable (#95, 2026-11-19)

**The call is the maintainer's**, made on #95 on 2026-11-19 after two
`thegraph-herdr` runs that day (acra-client, gltree) showed the review question
as it stood: folded into one call with the permission mode, the placement and a
leftover-files question; only the three offered reviews as options; all three
recommended, `/security-review` included for a change to one `-verbose`
condition; no option saying *not recommended*, and no cost shown. The conductor
of #94 once showed three options and left `/security-review` and `/simplify`
out without saying so, since the question tool takes two to four options a
question.

It changes this record's *always*:

- **Every review is choosable, the always-run ones too.** A review `check-it`'s
  table marks *always* is recommended by default and runs unless the person drops
  it; one they drop is reported as dropped by the person, not as a skip.
- **The reviews are asked in a call of their own**, after the reading, the
  models, the permission mode and the placement, per issue. The question is
  split so every candidate is an option: the default set in one question, the
  offered ones in another.
- **Each option carries this change's evidence**: the signal it meets, read from
  what the change will do, or *no signal* with why, in which case it is not
  recommended; and its cost where one is on record. A candidate left out of the
  options is named in the question with why.

**What counts as a review is a derivation**: the reviews this record's catalog
names, which are `check-it`'s rows 4 to 11 marked *always* or *offered*. On a
code change the default set is the four #95 names (the reviewer, `/review`,
`comment-it`, the proving agent), and it fits one question; on a prose change
it is the reviewer alone, asked as run or drop, since a question takes at least
two options, and the proving agent runs over what ran of 6 to 8 there, so it is
not a candidate. `sweep` is not a review here: this catalog does not name it,
and ADR-0055 has `thegraph` keep the surfaces a rule leaves wrong in line
through it, so it stays *always*. The conductor's own questions for #95 offered
`sweep` in the default question; #95 names four, and this follows #95. The
gates, where the files landed, the proof against something real and the
benchmark run on a condition and are not asked.

**How an answer reads is a derivation**, from *dropped only where the person
drops them*: the ticked options run; a default review left unticked in an
answered question is dropped by the person, who saw it recommended; a question
left unanswered keeps its defaults. A dropped proving agent sends the findings
of 6 to 8 to a person as *unproven*, never to be acted on as facts, which is
where `check-it` already sends a finding no run here could show.

**What the decision did not cover**:

- `/review` on a prose change has no recommendation signal on record, so under
  *no signal, not recommended* it is never recommended unless the person names
  one.
  *Settled at #94's ask-it (2026-11-19), the maintainer:* recommended where the
  change puts a command or a recipe to run into a document (`check-it`).
- What a dropped reviewer leaves: nothing asks whether the change does what
  the issue asked. `check-it` reports it dropped; nothing stops the drop.
- The proving agent's option is answered in the same call as the reviews it
  proves, against ADR-0064's *an answer that changes what a later question means
  goes first*; its option says it runs over whichever of 6 to 8 are chosen,
  rather than spending a second call on it.

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

**Both calls are the maintainer's**, made in `/grilling` on 2026-11-19 and
recorded in #97's decision comment.

- **`/simplify`'s edits outside the change.** A refactor tied to this change's
  code is kept, existing files included: merging a duplication the change made
  with its original, changing an existing helper so the change's code can use
  it, and the new file that results. Checks 1 to 3 run again on it. Only a
  cleanup unrelated to the change's code is reverted and goes to a person as
  *not fixed here*, with what it tried. Every file outside the change that
  `/simplify` edited is listed in `check-it`'s result with why;
  `thegraph-herdr`'s conductor does not send a commit back for a file so
  listed, and shows the list at `ask-it`. Ground as given: a refactor needs to
  touch existing files. The first proposal, *only files the change touched*,
  would have blocked exactly that, and was rejected. Accepted with it: *tied to
  this change's code* is a judgement, not a file list, so the result carries the
  reason and a person reads it.
- **Asked again mid-run.** At its start `check-it` holds the real diff against
  the signal table; an offered review not chosen at the confirm stop that now
  meets a signal is asked once, through the conductor where there is one and
  directly otherwise. A review already chosen whose signal is gone still runs.
  Grounds as given: the confirm stop reads what the change will do, the diff is
  what it did; asking only on a changed signal adds no question in the ordinary
  case; running it unasked would undo #95's *the person chooses*.

**Derivations made at build**, the later ones from `check-it` on this change
(`/review`, `lens`, the proving agent):

- *The change* is the files `git diff HEAD` and the untracked list name just
  before `/simplify` starts, written at the top of its saved report then, since
  its edits change that answer and a compaction would lose it. A deletion or a
  rename outside the change counts as an edit.
- A reverted cleanup takes only its own hunks where the same file holds a kept
  refactor, and checks 1 to 3 run again on the tree the reverts leave, since a
  partial revert can break what the kept hunk calls. The revert applies in
  files outside the change only, as the decision is about those.
- A direct `/check-it` asks nothing again, since its one question already read
  the diff. *The signal table* includes `/review`'s prose signal below it,
  which #94's `ask-it` settled as a recommendation signal like the rest.
- The answer to a re-ask is kept where the confirm stop's is (the run sheet, or
  the conductor's `## Answers` and a later brief), so a second start on the
  issue does not ask again.
- The conductor passes a listed file only where the list marks it kept and the
  saved `/simplify` report names it: `thegraph-herdr` already holds that *a
  report is a claim until the commit and the tree have been read*, and a file
  marked reverted should not be in the commit at all.
- The list is carried to `ask-it` as one item, shown with the answer it bears
  on (ADR-0064: material that needs no reply travels with one), so it reaches a
  person in `thegraph` too, where a sheet with nothing carried is deleted when
  `check-it` ends.
- A file `/simplify` added is marked `--intent-to-add` before `/review` like the
  change's own, or `/review`'s diff leaves it out.

**What the decision did not cover:**

- A default review the person dropped at the confirm stop is not asked again
  when the diff gives it new evidence: the decision names offered reviews not
  chosen, and a default one was dropped while recommended.
- A `/simplify` cleanup unrelated to the change but inside a file the change
  touched: the decision is about files outside the change, and such an edit is
  kept as it was before.
- A change whose route turns from prose to code while it is written: `/review`
  and `comment-it` become default reviews nobody was asked about. The re-ask
  covers offered reviews only. *Settled at #97's ask-it (2026-11-19), the
  maintainer:* the start-of-run re-ask also asks those two, as recommended
  defaults (`check-it`).
- `ask-it` has no row of its own for the list; it rides along as material
  under ADR-0064, and whether a person can undo a kept refactor before the push
  is not said.

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

**The call is the maintainer's**, made in `/grilling` on #78 and filed as #102
on 2026-11-20: where the repository has a verify skill (`GLOSSARY.md`, the kind
`create-formal-verification-skill` writes) and the diff touches a file its
coverage record names, `check-it` runs that skill's check as a **default**
review, droppable at the confirm stop like every review since #95. The signal is
the diff's files against the coverage record. A failure is reported as a bug or
as drift, as the verify skill's own steps tell, and drift across commits names
`/maintain-formal-verification-skill`, which stays user-invoked.
`create-formal-verification-skill` is not wired in: the 37 minutes of building
a check are spent only when a person asks. Ground as given: one run took 43 s in
the #78 trial, and a proved property that silently stops holding after a change
is the case this guards against.

**Derivations made at build**, the later ones from `check-it` on this change
(the reviewer, `/review`, `lens`, the proving agent):

- It is row 11 of `check-it`'s table, among the reading reviews, and waits for
  the benchmark (10) where that runs, since TLC takes every core (`-workers
  auto`) and a benchmark wants a quiet machine. The proving agent becomes 12
  and `sweep` 13. It gives the proving agent nothing: it is a run with its own
  pass rule.
- Its prose column is empty: the files it covers are code, and a diff that
  reaches code takes the code column, where the start-of-run re-ask already
  asks a default review nobody was asked about.
- It runs in the working session and has no row in *Each review's model*.
- A verify skill is found by reading each `.claude/skills/*/SKILL.md` of the
  repository, committed or not, for the files it covers and its sync commit. The
  generated format fixes no heading for either, so finding them is a reading;
  the comparison with the diff is the mechanical part. The diff's files come
  from `git diff HEAD --name-only --no-renames` and the untracked list: without
  `--no-renames`, a covered file moved with `git mv`, or one marked
  `--intent-to-add`, shows only its new path and the signal stays off
  (reproduced by `lens` and the proving agent, git 2.50.1). A file whose
  coverage is some of its functions counts as a whole file; the check runs
  either way.
- A check on a model rather than the code cannot go red from a code change
  alone: justssh's `check.sh` reads only `BrokerTokens.tla` and its configs.
  The first draft therefore sent a change that removed a guard to a person as
  drift, never back to `make-it` as a bug (`lens`, passed by the proving
  agent). So where the verify skill's own test says the change touches the
  verified code and the model no longer describes it, the session brings the
  model in line, the first step of the skill's section for an intended change
  and no further (its later steps run the check until it is green and move the
  sync commit), in a copy in the OS temp folder, and runs the check there once.
  That the model needed it is drift, reported whatever the copy's run gave; the
  run itself reads as pass, a bug when every step of the counterexample can
  happen in the code, a recorded finding now passing, or a modelling error. The
  repository run is the baseline where no commit after the sync commit touched
  the covered files. The re-read of the revision found the first wording made a
  copy's pass read as both pass and drift, and keyed the copy to a mapped
  function where the skill's own test also counts a new step that takes the
  lock. `create-formal-verification-skill`,
  `maintain-formal-verification-skill` and the generated skill all update the
  model to the code before running; the copy keeps `check-it`'s *nothing here
  fixes anything*, and the repository's model and sync commit are left alone.
- A recorded finding that now passes is a result of its own: the change fixed
  it, and it goes to a person with the skill's steps for moving the property.
- *Drift across commits* is read as the covered files having changed in commits
  after the sync commit (`git log <sync commit>..HEAD -- <files>`), not as a
  count of commits, since none was measured, and the result says the drift *may*
  be older, since those commits need not be what drifted.
- `statechart` is model-invoked since #100, so the session invokes it even where
  an older verify skill, such as justssh's, says a person runs it; only on a
  failed run, since it reruns TLC with one worker and `pins.cfg` holds 11.6
  million states (#78). A passing run is read from its own output.

**What the decision did not cover:**

- A diff that touches a verify skill's own files (its model, its script, its
  `SKILL.md`) but no covered code does not turn the review on.
- Several verify skills covering the same diff each run; their cost adds up, and
  no repository has two yet.
- Whether the reading, which on a model check is where the review happens, runs
  in a fresh agent rather than the session that wrote the change (`lens`,
  unadjudicated): that needs a model row, which is the maintainer's (#86).
- The generated verify skills say to read every result with `statechart`,
  passes included; `check-it` reads only failures with it. The family's rule is
  not changed here.

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

**The call.** It is the maintainer's, made at the ask-it of the `/thegraph-herdr 78` run. The maintainer said `check-it` uses a great deal, uncounted, and asked whether to choose fewer reviews, or to say first what a change should get. Two changes came out of it, and one was deferred:

- **Each review's cost goes in the result.** Each review gets one line with its time and, where the harness reports them, its tokens and cost. An `Agent` call reports `subagent_tokens` and `duration_ms`. A `claude -p` process run with `--output-format json` reports `total_cost_usd`, `duration_ms` and `modelUsage`; one call was measured, 2026-11-20. A forked `Skill` reports neither, so its line gives the time only.
- **The review strength opens the review call.** It has three options. *light* ticks the reviewer, plus `/review` at `medium` on code. *usual* ticks the default set as it was, and is recommended. *thorough* ticks the usual set plus every offered review that meets its signal. Every review can still be ticked or unticked after the strength is picked.
- **A cap on the proving agent was not set.** At first the conductor proposed ten minutes a finding. It then withdrew that: on #100 the long probes were the ones that found real defects (the janitor's EPERM cleanup, a kill sent to a pid that had already exited), and a capped finding goes to a person who can reproduce it less easily. So the proving agent records the time each finding took, and a cap is decided from those times, with #96's week of measurement.

**Rejected.** A Haiku layer that reads the person's intent and picks the reviews and their models. Choosing is one question and costs little; the cost is in running the reviews. A model picked by a model also runs against "a person picks every model" (`thegraph-herdr`) and against #86's rows changing only where the person asks.

**What it did not cover.** Which reviews *light* holds on a prose change beyond the reviewer, and whether the strength should also lower an effort other than `/review`'s. Both wait for the recorded costs.
