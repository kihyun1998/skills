# ADR-0102 — `check-it`'s reviews are a catalog: built-ins where they exist, its own reviewer for spec and rules, a proving step, and the risky ones chosen per change

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
  person typed, in any session.
- Asking again mid-run: the offered reviews are chosen before the change is
  written, and a change that turns risky while it is written (an outside command
  added, a gap that keeps reopening) has no way back to the question. Round 4
  did not cover it.
- `/simplify`'s fixes against `check-it`'s *not fixed here*: an altitude fix
  can move a cause into a layer the change did not own, and in
  `thegraph-herdr` an edit outside what the confirm stop said is left alone is
  sent back. Its target narrows what it reviews, not every file it may edit.
- Whether a fresh agent's result that arrives in the background is read: #92.
- Where `lens` writes: #93.
- How often the always-on set catches what the old reviewer did: one change is
  a first look. #91's *Done when* asks for past changes of different risk.
