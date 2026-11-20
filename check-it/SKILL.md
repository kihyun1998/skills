---
name: check-it
requires: [lens, sweep, comment-it, review, security-review, simplify, statechart]
description: "Measure a finished change before anyone calls it done, cheapest check first. Use once a change is written and before it reaches a person."
---

# check-it — measure it before anyone calls it done

`make-it` wrote it. This measures it, and the two are separate on purpose:
**the hand that shaped a thing is the worst judge of whether it is finished.**

Nothing here fixes anything. It measures, attributes, and hands the result on.
The one exception is `/simplify` (4), which applies its own fixes where the
person chose it, and keeps them as *What `/simplify`'s edits keep* says.

## What gets measured, cheapest first

| | What it answers | Call | Code change | Prose change |
|---|---|---|---|---|
| 1 | Did every check actually run, and pass | — | the project has checks | — |
| 2 | Did the files land where the rule said they would | — | the change added or moved a file | the same |
| 3 | Does it work against something real | — | the change compiles or runs | — |
| 4 | Does it re-make what the repository already has, or could it be simpler | `/simplify`, which applies its fixes | offered | offered |
| 5 | Does it do what the issue asked, and keep what the repository wrote down | the spec and rules reviewer, a fresh agent | always | always |
| 6 | What bugs does it carry | `/review` | always | offered |
| 7 | Is it open to somebody who means harm | `/security-review` | offered, where there is an `origin` remote | the same |
| 8 | What is missing | `lens`, forked by `Skill` | offered | offered |
| 9 | Do the new comments and lint suppressions keep the repository's comment rule | `comment-it`, forked by `Skill` | always | — |
| 10 | Will it get slower | `benchmark.md`, when it applies | the change adds state, loops, or I/O | — |
| 11 | Does a property the project's verify skill proved still hold | the verify skill's own check, run in this session | always, where a verify skill covers a file the diff touches | — |
| 12 | Which findings of 6, 7 and 8 hold | the proving agent, a fresh agent | always | over what ran of 6–8 |
| 13 | Which surfaces now describe it wrongly | `sweep` | always | always |

Every row from 4 to 12 marked *always* or *offered* is a review the person
chooses for this change (*Choosing the reviews*); `sweep` (13) is not one, since
the surfaces a change leaves wrong are kept in line through it (ADR-0055). *Always* means it is recommended by default and
runs unless the person dropped it; one they dropped is reported as dropped by
the person, and any other skip is reported with its reason. *Offered* means it
runs where the person chose it. One they did not choose is reported as not
chosen, and neither of those is a skip (ADR-0102, amended for #95).

**The order is cost, then what each step needs.** A red gate makes every
expensive pass below it a waste, so 1 to 3 go first. `/simplify` (4) goes next,
because it edits; 1 to 3 run again on its edits. Then 5 to 11 run at the same
time: they read the same diff and ask different questions, which is not
splitting material but the opposite. The one exception is 11, which waits for
10 where 10 runs (*A project's verify skill*). The proving agent (12) runs last of the
reviews, since it works on their findings. `sweep` (13) runs on the change as it
stands once the findings acted on are fixed.

**A prose change runs 5 and 13, plus 2 where it added or moved a file, and the
offered reviews the person chose, with 12 over what ran of 6 to 8; the reviewer
does not run where the person dropped it.** There are no gates to run and no round trip to prove. A run that reports those as passed has
reported on work it did not do.

**Running the checks (1).** The list is the project's CI workflow, or the gate
list its guidance names where CI gates nothing, plus whatever those do not
reach. Run each one **bare**: no pipe, no `| tail`, no filter, since a
pipeline's exit status is the last command's and a red check reads green
through it. Read every result. **The repository's own property, fuzz and
benchmark lanes are part of the list**, nightly-only ones included: reproduce
them locally, as long as the repository's own workflow runs them. A fuzz lane
never ends by itself, so it is the kept inputs replayed, or the time the
workflow gives it. A benchmark has no pass or fail of its own, so it is read
through (10). Never move a threshold, narrow a scope or bypass a hook to turn
one green, and report a check not run, with why. **The same
failure surviving three fixes stops the repairs** and goes to a person as a
design question.

### Choosing the reviews

`thegraph` and `thegraph-herdr` ask which reviews run at their confirm stop,
and the answer reaches this step on the run sheet or in the worker's brief. **A
direct `/check-it`, with no confirm stop before it, asks once, at its start.**
Every review from 4 to 12 this change's column marks *always* or *offered* is a
candidate, and the person may drop any of them (ADR-0102, amended for #95).

**The reviews are asked in a call of their own**, after everything else the stop
asks, once per issue. The question tool takes two to four options a question,
so the candidates are split until every one is an option: the default set (the
column's *always*) in its own question or questions, the offered ones in
another, each with several answers allowed (`multiSelect`). On a code change
the default set is four reviews and fits one question; where a verify skill
covers a file the change touches (11), it is five, split over two. On a prose
change it is the reviewer alone, put as a question with two options, run it or
drop it; the proving agent there runs over what ran of 6 to 8 and is not a
candidate, and the verify review is not one either, since the files it covers
are code. Where no verify skill covers a file the change touches, the verify
review is not a candidate and the question does not name it; the result says it
was looked for. A
candidate left out of the options is named in the question with why, such as `/security-review` where there is no
`origin/HEAD` (below).

**Each option carries this change's evidence**, read from what the change will
do (which file, which behaviour) at a confirm stop, or from its diff at a direct
run, and its cost where one is on record (ADR-0102's measurements):

- **A default review** is recommended, with what it would read in this change.
  The proving agent's option says it runs over whichever of 6 to 8 are chosen.
  The verify review's names the verify skill, the covered files the change
  touches, and the run time its skill records (ADR-0102 has justssh's).
- **An offered review** is recommended only where it meets a signal in the table
  below, and the option names the signal and the evidence for it. Where none is
  met it says *no signal* with why, and is not recommended.

| Review | Recommended where the change |
|---|---|
| `/security-review` (7) | touches input from outside the process (network, user files, arguments), authentication or permissions, running a shell or an outside command, secrets, or deserialization |
| `/simplify` (4) | adds a module, component or helper, makes something the repository already has a shape for, or is a refactor |
| `lens` (8) | is an enumeration, a new feature with siblings or prior art to hold it against, or one where a bug would cost more than a wrong number |

On a prose change, `/review` (6) is offered too, recommended where the change
puts a command or a recipe to run into a document, such as a skill or a README:
on #86 it found such a recipe that exited 1. That is one run, the maintainer's
call on it (2026-11-19). Row 7's prose
column reads *the same*, so it is offered there too. No size of change
recommends a review: no line-count threshold has been measured.
`/security-review` is not offered where `git rev-parse --verify origin/HEAD`
fails: it diffs against that ref, which a repository without an `origin`, or
one whose `origin` was added rather than cloned, does not have.

**Asked again at the start, where the diff carries a new signal.** A confirm
stop chose from what the change would do; the diff is what it did. So at its
start, before (1), `check-it` holds the real diff (`git diff HEAD` plus every
untracked file) against the signals above: the table, and on a prose change
`/review`'s in the paragraph below it. **An offered review the confirm stop did
not choose that now meets a signal is asked once**, with the signal and the diff
lines that carry it: through the conductor where there is one (in a
`thegraph-herdr` worker, the brief's `## Question` and its `hc send` line), and
directly otherwise. **A change confirmed as prose whose diff now runs** (it adds
or changes code) takes the code column: each review that column marks *always*
and the prose one did not, `/review` and `comment-it`, is asked in the same
question as a default, recommended. **A diff that touches a file a verify skill
covers, where the confirm stop did not offer the verify review**, asks it in the
same question, as a default, recommended, with the files. Where none does,
nothing is asked, which is
the ordinary case. **A review already chosen whose signal is gone still runs**: the person
chose it, and the diff does not unchoose it. The answer is kept where the
confirm stop's is, so a later start of `check-it` on the same issue does not ask
again: on the run sheet's `confirm` or `## Reviews` line, or, in a
`thegraph-herdr` worker, with the conductor, who writes it under `## Answers`
and puts it in any later brief for the issue. A direct `/check-it` reads its
diff for its one question already, so it asks nothing again (ADR-0102, amended
for #97).

**How the answer reads.** The ticked options run. A default review left unticked
in a question the person answered is dropped by the person, since they saw it
recommended and left it. A question left unanswered, or answered with text that
names no review, keeps its defaults and chooses none of its offered ones, and
the result says so. A dropped proving agent leaves the findings of 6 to 8
unreproduced: each is carried to a person as *unproven* with what would show it,
and none is acted on as a fact.

### Each review's model

**Each review runs on a model fixed for its role, whatever model the session
calling this runs on** (ADR-0102, amended for #86): a session on a smaller model
would otherwise hand its reviews that model too.

| Review | Model, effort | Where it is set |
|---|---|---|
| the spec and rules reviewer (5) | Opus 5.5, `high` | `model: "opus"` and `effort: "high"` on the `Agent` call |
| `/review` (6) | Opus 5.5, `high` | `--model claude-opus-5-5 --effort high` on its process, and `high` as the command's level |
| `/security-review` (7) | Opus 5.5, `high` | `--model claude-opus-5-5 --effort high` on its process |
| `lens` (8) | Opus 5.5, `high` | `model` and `effort` in `lens`'s frontmatter |
| the proving agent (12) | Opus 5.5, `medium` | `model: "opus"` and `effort: "medium"` on the `Agent` call |
| `/simplify` (4) | Opus 5.5, `medium` | `--model claude-opus-5-5 --effort medium` on its process, whose four agents run on its model and effort |
| `comment-it` (9) | Sonnet 5.5, `medium` | `model` and `effort` in `comment-it`'s frontmatter |

The verify review (11) has no row: it runs the project's own command in this
session, and its reading follows that project's skill.

`thegraph` and `thegraph-herdr` show this table at their confirm stop, beside
the reviews, and a direct `/check-it` shows it with its question. **A
row changes only where the person asks**, and the changed row reaches this step
the way the chosen reviews do. A row set on a call or a process takes the
change for that run, except that an `Agent` call takes only a model alias
(`sonnet`, `opus`, `haiku`, `fable`), so a model with none cannot go on the
reviewer's or the proving agent's row, and a session on another Opus version
runs those two on its own version. `lens`'s and `comment-it`'s rows live in
their frontmatter, which a run cannot change: `Skill` takes no model, and calling
them through an agent is what left a quarter of them empty (#87). The confirm
stop says so when it shows the table, and a change asked anyway that cannot
apply is reported as not applied, with the reason.

### The spec and rules reviewer (5)

One fresh agent, given the **whole** diff, the issue, and what this repo wrote
down: its `CLAUDE.md`, decision records and conventions. It is briefed and
handled as `lens` is (*Briefing the fresh agents*), and it answers two
questions, reported apart, each with its own worst finding and never merged into
one ranking:

- **Rules: does it hold up** against what this repo wrote down? Where it wrote
  nothing, the baseline is the well-known code smells (Fowler's catalogue).
- **Spec: does it do what the issue asked?** What is missing, what crept in that
  nobody asked for, and what looks done but is done wrongly.

Each finding is graded **violation** (cite the rule), **judgement**, or **already
decided** (a record settled it; one line), and carries its reproduction: the
exact command, the output it printed, and the output the intent requires. A
finding a run could show and nobody ran is left out; one no run here can show,
such as a smell, is kept and marked *not run*, with why. The report ends with
`lens`'s safety line (*Verification*, item 6), for the fact the change's safety
rests on. A clean answer is a result.

Who could reach the change and what it exposes is `/security-review`'s question
(7), not this reviewer's. Where 7 did not run, nothing asked it, and the result
says so.

### The built-ins (4, 6, 7)

`/simplify`, `/review` and `/security-review` are skills bundled with Claude
Code. `/review` is the alias of the bundled `/code-review`, and it is called by
the alias because an installed skill named `code-review` replaces the bundled
command while the alias keeps running the bundled one.

**Each runs as its own `claude -p` process at the repository root.** `Skill`
cannot reach `/review`: it answers `Unknown skill: review`, and `Skill` with
`code-review` reaches the installed skill. `/security-review` and `/simplify`
are in a session's skill list, but they run the same way, so there is one recipe,
the one the #91 trial measured, and a process that never saw this session.

- From Git Bash, set `MSYS_NO_PATHCONV=1`, or the leading `/` is rewritten into
  a Windows path and the review never runs.
- Pass `--allowedTools` naming `git`, `gh` and the commands of (1), so the
  review can read the issue and run the tests. Without them `-p` denies both,
  and it reviews by reading alone. `/simplify` also needs `Edit` and `Write`.
- Put the command first, before the flags: `--allowedTools` takes every word
  after it as a value, so a prompt placed after it is read as a tool name and
  the run exits 1.
- Start it in the permission mode this session runs in: the same
  `--dangerously-skip-permissions` or `--permission-mode` flag. A `-p` process
  cannot ask, so under a mode that asks, `--allowedTools` is what lets it run
  anything.
- Do not append the issue to the command: everything after `/review` and its
  flags is read as the review target (`code-review-local.md`). The review reads
  this repository's `CLAUDE.md`; the issue reaches the reviewer (5) and the
  proving agent (12), which judge against it.
- Start each with its row's `--model` and `--effort` (*Each review's model*),
  and give `/review` its level as the command's first word (`/review high`):
  with no level typed, `/review` reuses the last level the person typed in any
  session, and a level passed in a `-p` run is not remembered.
- Give the command a timeout of 15 minutes. The longest measured run took about
  three minutes, past a shell's usual two-minute default, after which the
  command moves to the background.
- Their diff leaves out untracked files. Mark each new file with `git add
  --intent-to-add` before `/simplify`, and each file `/simplify` added too
  before `/review`, and once the
  built-ins are done, `git reset -q --` those files, so the index is as it was:
  a file left marked makes `git stash` fail.
- `/simplify` and `/review` read this branch's commits ahead of its upstream
  (or `main`) as well as the uncommitted change, so in a run that committed
  earlier issues those are in their scope too. Pass `/simplify` the changed
  files' paths as its target, so it reviews this change; the target narrows
  what it reads, not every file it may edit (*What `/simplify`'s edits
  keep*). Where `/review`'s scope held earlier commits, say so.
- `/security-review` reads only commits (`git diff origin/HEAD...`). Add a
  temporary worktree (`git worktree add --detach`), apply there the patch `git
  diff HEAD --binary` gives once new files are marked, commit it, run the review
  there, and remove the worktree, which takes the commit with it. Its diff also
  holds this branch's commits not yet on `origin`; where there are any, say so.

Their findings name a file, a line and a failure scenario in words, and are not
run. That is what the proving agent (12) is for.

### What `/simplify`'s edits keep (4)

**The change** is the files `git diff HEAD --name-only` and `git ls-files
--others --exclude-standard` list just before `/simplify` starts. Write that
list at the top of `/simplify`'s saved report (`<run sheet>.simplify.md`, or the
OS temp folder where there is no run sheet) before it starts, since its edits
change the answer. A file `/simplify` edits, adds, deletes or renames that is not
on the list is **outside the change**.

- **A refactor tied to this change's code is kept, existing files included**:
  merging a duplication the change made with its original in an existing file,
  changing an existing helper so the change's code can use it, and the new file
  that results. A refactor needs to touch existing files, so the list does not
  bound it. Checks 1 to 3 run again on it, as on every edit of `/simplify`'s.
- **A cleanup unrelated to the change's code, in a file outside the change**
  (an old smell in a module the change does not reach) **is reverted**: that
  edit's hunks alone where the same file holds a kept one, the file restored
  where it holds nothing else. Checks 1 to 3 run again on the tree as the
  reverts leave it. It goes to a person as *not fixed here*, with what
  `/simplify` tried (*Going back, and stopping*).
- **`check-it`'s result lists every file outside the change that `/simplify`
  edited, added, deleted or renamed**, each marked kept or reverted, with why:
  which code of the change the refactor serves, or what the reverted cleanup
  was. *Tied to this change's code* is a judgement, not a file list, so the
  reason is what a person reads. The list is carried to `ask-it` as one item,
  shown with the answer it bears on, so it reaches a person in every run.

`thegraph-herdr`'s conductor does not send a commit back for a file so listed
as kept, once the saved report bears it out, and the list reaches `ask-it` with
the worker's carried items (ADR-0102, amended for #97).

### A project's verify skill (11)

A **verify skill** is defined in `GLOSSARY.md`: the project-local skill
`create-formal-verification-skill` writes, under the repository's
`.claude/skills/`, committed or not. Nothing here builds one or calls that skill
(#78).

**The signal is mechanical**: the files the diff touches (`git diff HEAD
--name-only --no-renames`, which names both paths of a move, and every
untracked file) against the files each verify skill names as covered: the code
its check describes, not every file the skill mentions (its model, its scripts
and the files it lists as not covered are not covered files). A file in both
turns the review on for that skill; at a confirm stop, the files the change will
touch stand in for the diff. A skill that covers only some functions of a file
still counts the file: whether the change reaches a covered function is the
verify skill's own first step, and the check runs either way. The candidates are
found by reading each `.claude/skills/*/SKILL.md`: one that names the files it
covers and the commit it was confirmed at (its sync commit) is a verify skill,
wherever in it it writes them, and one without both is not.

**Running it.** It runs after (10) where (10) runs, since a check such as TLC
can take every core and a benchmark wants a quiet machine, and beside 5 to 9
otherwise. It runs in this session. Follow the verify skill's steps for whether
the change touches the verified code and for running its command, run bare as
(1) runs a check. Save the output, as `<run sheet>.verify.md` or in the OS temp
folder. A check that cannot run here, such as one whose tool is not installed,
is reported as not run, with why, and never as a pass.

**Where the check runs on a model rather than on the code, a code change cannot
turn it red by itself.** So where the verify skill's own test says the change
touches the verified code (a mapped function, or a new step of the kind its
model makes an action) and the model no longer describes the new code, bring the
model in line with the new code, as the first step of the skill's section for an
intended change says, **in a copy in the OS temp folder**, and run the check
there once, with its own temporary folder, so its logs do not replace the
repository run's. Only that first step: the copy is not changed again until it
passes, and the repository's model, the skill and its sync commit are left as they are,
since nothing here fixes anything. The repository run is the baseline *Whose is
it* compares against, where no commit after the sync commit touched the covered
files.

**Reading the result.** A failed run's counterexample is read with the tool the
verify skill names, `statechart` for a TLA+ check, which this session invokes
itself since #100, even where an older verify skill says a person runs it; a
passing run is read from its own output, since `statechart` reruns the check.
The result says, as the verify skill's steps tell a real bug from a modelling
error:

- **Whether the model needed bringing in line.** Where it did, that is drift,
  and it goes to a person with the functions and the model change the copy
  needed, whatever the copy's run gave. Where the covered files also changed in
  commits after the sync commit (`git log --oneline <sync commit>..HEAD --
  <covered files>` lists any), the drift may be older than this change, and the
  result names `/maintain-formal-verification-skill`, which a person invokes.
- **What the run gave**, on the repository's model where it still describes the
  code, or on the copy:
  - **pass**;
  - **a bug**: a property fails, and every step of the counterexample can happen
    in the new code. One this change introduced goes back to `make-it`; one the
    tree without it also fails on goes to a person (*Going back, and
    stopping*). A finding the skill already records is an expected failure in
    its check;
  - **a recorded finding now passes**: the change fixed it. It goes to a person
    with the skill's steps for moving that property, not back as a defect;
  - **a modelling error**: a step of the counterexample cannot happen in the
    code. It goes to a person as drift, with that step and the code it maps to.

### The proving agent (12)

One fresh agent, briefed as the reviewer is, given every finding of 6, 7 and 8
as each report gave it, with its grade or severity, and each finding `/simplify`
named and left unfixed. For each one it reproduces the finding: it runs the
command that shows it, with the output it printed and the output the intent
requires, or, for a finding about text such as a citation or a missing case, it
re-opens the source and quotes it. Each finding comes back as one of three:

- **passed**: reproduced, with that evidence;
- **dropped**: shown not to hold, or to need no action, with why;
- **unproven**: no run here can show it, because it needs a live screen,
  another machine or a person to drive it. It says what would show it, and it
  goes to a person. It is never passed and never dropped.

A passed finding still goes where *Going back, and stopping* sends it: one this
change did not introduce, or one that asks for a decision, goes to a person.
`/simplify`'s edits do not go through it: they are made already, and 1 to 3 ran
on them. The reviewer's findings (5) and `comment-it`'s (9) carry their own
evidence and do not go through it either.

**Cost (10)**: no defect without a number. A slowdown that was measured, with
something to compare it against, is a defect. A shape nobody measured is a
question, and it is asked as one. **Read [benchmark.md](benchmark.md) when** the
change claims a performance effect, a review flags a possible slowdown, or the
repository's build guidance names the path as needing a benchmark; otherwise it
is not read. The reviews run beside this check, so where a finding of theirs is
the first to flag a slowdown, run (10) again with the method once it arrives.

**Comments (9)** come back as findings, and the working session acts on them in
this change, through `make-it`: a comment outside the repository's list is
deleted; where it explained a workaround or a surprise in this repository's own
code, the code is fixed instead, and a fix outside this change's scope is carried
to `ask-it`, never written back as a comment. A constraint on our own code —
*do not remove*, *talk to X first* — is deleted and carried to `ask-it` as a
check candidate for `encode-it`. A suppression of a correctness or safety rule
goes back to `make-it`. A report of contributor mode or of a missing rule is
passed on as it came.

### Where the files landed

`make-it` wrote the home for every new or moved file down as **concrete paths**, read
against the tree as it is, the layout rule `CLAUDE.md`, `GLOSSARY.md` or a decision
record states, and the folder-structure reference. This is where that answer gets
checked: list what the diff actually added or moved, and match it.

**A file in the wrong place produces no error, no failing test and no warning** —
which is the whole reason the answer was written down rather than carried. A
mismatch is this change's own defect and goes back to `make-it`.

A file `/simplify` (4) added has no answer from `make-it`; its report is the
answer, matched against the layout rule like any other.

**No written answer at all is itself the finding.** The call was made and left
unrecorded, so nothing can check it — report that rather than reconstructing the
reasoning from where the files happen to be, which only ratifies them.

### Proving it works

**Start from the way to the real thing the repository already records.** The
build's references (`docs/agents/thegraph.md`) and the territory map can name
one: a real machine and a procedure for comparing against another client, a
black-box judge, a harness note. Use what reaches what this change touched,
within what its record says it proves, before working out a proof of your own,
and report which one was used, or why none applied. One that needs a machine,
another client or server, an OS, or a person to drive it, none of them reachable
here, is reported as chosen and not run, and the run goes on with the proof it
can reach.

**A fake backend or a demo is a smoke test, not proof.** A fake can pass while
the real thing differs, and the whole reason to reach past it is that the
difference is exactly where the bugs are.

Two traps, both of which look green:

- **A headless run proves only what it consumed.** Where a change has a visible
  or structural effect — focus, scroll, reveal, a rendered value — a run
  asserting only the proxy it happened to read has not verified the effect.
  Assert the state directly, or drive the real thing.
- **A check that can only confirm what it assumes.** A fixture produced or
  normalised by the thing it grades, or a measurement that misreads itself the
  same way the code does, agrees with anything. Nothing lists this project's
  own; name each one **in the decision record it belongs to** as you meet it.

**A lane the repository already runs is something real**, unless it takes its
expected value from the code it grades. A fuzz target or property that covers
the changed code, run against the change, or a kept input replayed against it,
is evidence a hand-written example is not. Where the change added a case to such
a lane, check that it was watched failing (`make-it`); where it touched covered
code and added none, say so.

**The strongest proof runs in a real consumer.** Link this build into something
that actually uses it and run **its** suite. The best evidence there is a
consumer test that had **pinned the old bug as its expected value and is now
failing** — a symptom somebody else independently observed and froze has
disappeared.

**And the artifact a proof reads from needs the same gate the tests got.** A
recorded fixture, golden or capture that cannot fail reads as coverage and proves
nothing. Put it through `make-it`'s test bar, mutated until the assertion that
reads it goes red, not just the assertion itself.

## Whose is it — the question that runs through all of it

Three findings, one question, one method.

| The finding | The question |
|---|---|
| a check went red | is this red mine |
| something is broken | did this change introduce it, reveal it, or is it unrelated |
| defensive code appeared | is this mine, or am I carrying somebody else's problem |

**Measure it, do not reason about it.** Take the tree as it stands **without this
change**, run the one command or reproduce the one case, and compare.

**Compare the failure, never the exit code.** A baseline tree can be red for its
own reason — a fresh checkout with nothing installed is the ordinary case, not an
exotic one — and then every red compares `1` against `1`, reads as *not mine*,
and the attribution inverts itself silently on exactly the branch that stops
work. Compare what the failure **says**.

| The baseline | The verdict |
|---|---|
| green | **this change's** |
| red, the same failure | **not this change's** |
| red, a different failure | **unmeasured** — the baseline is broken for its own reason and the comparison says nothing |

**Unmeasured is an answer and it is not a licence.** It sends nothing back and
stops nothing; it goes to a person as a question naming which tree was red, which
single command, and why the baseline could not answer. Repairing the baseline to
get the measurement is a legitimate next move and somebody else's to authorise,
because it is work this change did not ask for.

## The shape nobody will have marked

One thing here is hunted **assuming the person who wrote it left no help at
all** — no note, no comment, no entry in any list. Because the case worth
catching is the one they did not notice, and somebody who did not notice could
not have written it down.

**Ask it of the line, not of the author.** For each defensive-looking line the
diff added — a conditional, a fix-up, a default, a retry, a re-format, a swallowed
error:

> **What would have to be true for this line to be unnecessary?**

If the answer is *"if X, which I did not change, behaved correctly"*, then **X is
where it belongs**, and what is here is a patch standing in the place you happened
to be standing.

Ask whose invariant broke, and which layer can actually hold it correct, before
asking which layer is upstream. **Then stop and take it to a person**
— do not fix it here, and do not quietly file it. Patching may well be the right
call; what matters is that somebody decided it rather than an invisible
conditional deciding it for them.

**Some defensive code is legitimately the consumer's own job** — validating input
you are right not to trust. That does not answer *"if X behaved correctly"*, so it
does not fire. Anything genuinely ambiguous goes out as a question, not a verdict.

## Briefing the fresh agents

**The reviewer (5), the proving agent (12), `lens` and `comment-it` each run in a
fresh agent** that never saw this session (ADR-0091, ADR-0095, ADR-0102), and
the built-ins in a process of their own. That is the point: the hand that shaped
the change is the worst judge of it. So the brief is all it gets: for `lens`, the
skill's argument; for `comment-it`, the argument naming the repository's root
and the same diff as the scope; for the reviewer and the proving agent, the
prompt of a newly started general-purpose agent (not a fork of this
conversation, which inherits it), started on its row's model and effort, told to edit nothing and write no file outside
the OS temp folder. A probe that can only run inside the tree runs in a copy
made in the OS temp folder without its `.git`, with `git init` where it needs
git, as `lens` says (#93): a worktree, or a copy that keeps `.git`, writes into
this repository's gitdir. That prompt names the diff as `git diff HEAD` plus every
untracked file, so a new file is in it, and it points at the issue and this
repo's records. The reviewer's prompt quotes (5)'s two questions and the
paragraph after them as written here; the proving agent's quotes (12) as written
here, and every finding it is to prove.

**Save each report** beside the run sheet, as `<run sheet>.<name>.md` with the
name `simplify` (4), `spec-rules` (5), `review` (6), `security` (7), `lens` (8),
`comments` (9), `verify` (11) or `proving` (12), or in the OS temp folder when there is no run
sheet, so a compaction does not lose it. Then **re-run each command the
reviewer's kept findings carry, and each passed finding's reproduction, before
acting on it**: a finding is a candidate until it was reproduced here. An
*unproven* finding is carried to a person with what would show it. A skip, such
as a two-sentence change with nothing for the reviewer to read, is reported with
its reason, never silent.

**A check started in the background is waited for, and its report read, before
the run moves on** (#92). An `Agent` call made from a script can come back at
once with `status: "async_launched"` and an `outputFile`. That file stays
empty: measured on 2026-11-19 on Claude Code 2.1.328 (#92), it was still 0
bytes after the agent had finished. The report arrives only in the task
notification naming that agent, as its `<result>`. A built-in whose `claude -p` process outlived its shell's timeout runs on, its
output going to the file the shell names. Any other check whose call returns
before its report is the same case. Wait for each report where it arrives, and
save the report itself, never the launch receipt, as the file named above. The
run does not move past the reviews, to the proving agent, `sweep` or the
result, until every check it started has its report read or is reported not
run. **A check whose report never came back is reported as not run**: the
notification says it failed or was stopped, or the process ended with no
report. The result names what was waited on and where, and it is never a pass.

**Call `lens` and `comment-it` with `Skill` directly, the whole brief in
`args`, and never through an agent started to call them.** Both are `context: fork`
skills, which is not a fork of this conversation: such a skill never sees its
caller's conversation or prompt, and from the caller only `args` reaches it.
Measured (#87, `docs/research/check-it-subagent-models.md` Part A): a quarter
of `lens` forks and 30% of `comment-it` forks did nothing, 85 of those 89
under a general-purpose agent that held the brief in its own prompt; the calls
sampled show it calling `Skill` with no `args`, or with `"see task message"`.
**A reply saying the brief was empty or missing is that check not run**, and it
is reported as not run, with that reply as the reason. It is never a pass, and
a pass done by some other agent in its place is not that check either.

`lens` needs three things or it reports a divergence on a layer where the
reference has no vote at all — and reports it as urgent, because from inside the
brief it is:

- **this repo's siblings** — the features that already solve the adjacent problem
- **the named prior art** — read as sources, in full, never sampled
- **what this project diverges from on purpose** — read from the **decision
  records**, where the record that decided each one already lives. Where the code
  plainly diverges and no record says why, that absence is itself a finding.

And the sentence that settles a clash: **this project's own measurement wins, and
an unmeasured preference does not. Where a record has already settled a
particular clash, the record governs.**

## Going back, and stopping

| What happened | Where it goes |
|---|---|
| a real defect **this change introduced** | back to `make-it`. Re-read only if the fix **opened a surface the pass did not walk** — otherwise it is covered by that pass's own claim, and say which of the two it was |
| a red the baseline does not produce | back to `make-it` |
| the same failure surviving three fixes | **a person**, as a design question, not a fourth repair |
| a defect this change **revealed or did not touch** | **not fixed here.** To a person, with the measurement |
| a patch standing in for a deeper fix | **not fixed here.** Where it belongs, then a person |
| a `/simplify` cleanup unrelated to the change's code, in a file outside the change | **not fixed here.** Reverted, then a person, with what it tried (*What `/simplify`'s edits keep*) |

**Fixing somebody else's defect inside this ticket puts it on a budget sized for
this change's own repairs.** Three attempts later the ticket is over, the defect
is half-fixed, and nobody planned either.

## What this does not do

It does not open a branch, write a pull request, or file anything — those are
acts on the outside world and they go through the one door that asks first.

It does not report a pass it did not run. A check skipped for a reason is
reported with the reason; a check skipped silently and a check that does not
exist are the same thing to everyone who reads the result later.
