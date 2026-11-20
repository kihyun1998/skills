---
name: check-it
requires: [lens, sweep, comment-it]
description: "Measure a finished change before anyone calls it done, cheapest check first. Use once a change is written and before it reaches a person."
---

# check-it — measure it before anyone calls it done

`make-it` wrote it. This measures it, and the two are separate on purpose:
**the hand that shaped a thing is the worst judge of whether it is finished.**

Nothing here fixes anything. It measures, attributes, and hands the result on.
No review edits: each is a fresh agent of this skill's that reports, and a
person picks which findings are fixed (*One report, one question*).

## What gets measured, cheapest first

| | What it answers | Call | Code change | Prose change |
|---|---|---|---|---|
| 1 | Did every check actually run, and pass; does a property the project's verify skill proved still hold | — ; the verify skill's own check, run in this session | the project has checks; the verify check where a verify skill covers a file the diff touches | — |
| 2 | Did the files land where the rule said they would | — | the change added or moved a file | the same |
| 3 | Does it work against something real | — | the change compiles or runs | — |
| 4 | Does it re-make what the repository already has, is it simpler, wasteful, rightly general, easy to maintain | the refactoring reviewer, a fresh agent | picked | picked |
| 5 | Does it do what the issue asked, and keep what the repository wrote down | the spec and rules reviewer, a fresh agent | always | always |
| 6 | What bugs does it carry, in whatever it makes run | the bug reviewer, a fresh agent | picked | picked |
| 7 | Can untrusted input reach it, or does it mishandle authentication, permissions or secrets | the security reviewer, a fresh agent | picked | picked |
| 8 | What did it leave out or do differently from its siblings and the prior art | `lens`, a fresh agent given its skill's body | picked | picked |
| 9 | Do the new comments and lint suppressions keep the repository's comment rule | `comment-it`, a fresh agent given its skill's body | picked | picked |
| 10 | Will it get slower | `benchmark.md`, when it applies | the change adds state, loops, or I/O | — |
| 11 | Which findings of 4, 6, 7 and 8 hold | the proving agent, a fresh agent | whenever 4, 6, 7 or 8 runs | the same |
| 12 | Which surfaces now describe it wrongly | `sweep` | always | always |

Rows 4 to 9 and 11 are the reviews, and none of them is asked per change
(*Choosing the reviews*). *Always* and *whenever 4, 6, 7 or 8 runs* are the
floor; *picked* means it runs where the decision model picked it, or a person
added it in words. `sweep` (12) is not a review, since the surfaces a change
leaves wrong are kept in line through it (ADR-0055), and the verify check is not
one either, since it is part of (1). A review the person removed in words is
reported as removed by the person, one not picked as not picked with the
decision model's reason, and any other skip with its reason; neither of the
first two is a skip (ADR-0102, amended for #112).

**The order is cost, then what each step needs.** A red gate makes every
expensive pass below it a waste, so 1 to 3 go first. Then 4 to 10 run at the
same time: they read the same diff and ask different questions, which is not
splitting material but the opposite. The proving agent (11) runs last of the
reviews, since it works on their findings. Then every finding goes into one
report and one question (*One report, one question*), the findings the person
picks are fixed, and `sweep` (12) runs on the change as it then stands.

**What each review cost goes in the result**, one line per review that ran,
and one per call of the decision model: its wall-clock time and its tokens.
Every review and every pick is an `Agent` call, whose completion reports
`subagent_tokens` and `duration_ms`. A person weighs the pick against these
numbers, so a line left out is a call whose cost nobody can weigh.

**A prose change has no gates to run and no round trip to prove**: it runs 2
where it added or moved a file, its reviews, and 12. A run that reports those as
passed has reported on work it did not do.

**Running the checks (1).** The list is the project's CI workflow, or the gate
list its guidance names where CI gates nothing, plus whatever those do not
reach. Run each one **bare**: no pipe, no `| tail`, no filter, since a
pipeline's exit status is the last command's and a red check reads green
through it. Read every result. **The repository's own property, fuzz and
benchmark lanes are part of the list**, nightly-only ones included: reproduce
them locally, as long as the repository's own workflow runs them. A fuzz lane
never ends by itself, so it is the kept inputs replayed, or the time the
workflow gives it; what the run adds that the repository does not keep (new
corpus entries, crash artifacts) goes as [`clean-it`'s rules](../clean-it/RULES.md) say.
A benchmark has no pass or fail of its own, so it is read through (10). Never move a threshold, narrow a scope or bypass a hook to turn
one green, and report a check not run, with why. **The same
failure surviving three fixes stops the repairs** and goes to a person as a
design question. **Where a verify skill covers a file the diff touches, its
check is on the list**, run without being asked, as *A project's verify skill, in (1)*
says.

### Choosing the reviews

**No review is asked per change.** A fresh agent, **the decision model**,
answers six fixed questions about the change and picks the reviews from them;
the floor is added to its pick (ADR-0102, amended for #112). It runs twice:

- **At the confirm stop**, from the planned change. `thegraph` and
  `thegraph-herdr` start it for each issue once ② is written, with the issue
  and the two statements as its change, and wait for its answer as for any
  check started in the background (*Briefing the fresh agents*). Where `read-it`
  asks ① alone first, the pick waits for ②; a correction to ① that rewinds the
  reading runs it again on the new statements. The pick is shown as one line
  inside the question that carries ②, and the person can change it there in
  words. Nothing else about the reviews is asked. The pick as the person left
  it reaches this step on the run sheet or in the worker's brief.
- **At this skill's start**, before (1), on the real diff: `git diff HEAD` plus
  every untracked file. A review it picks that is not already chosen is added
  without asking, and the result names it with the decision model's reason.
  **Nothing chosen is removed**, the person's additions and a review whose
  question now answers no included. A review the person removed at the confirm
  stop is not added back; the result names it with the reason it was picked
  again. **What it adds is written where the confirm stop's pick is kept**: on
  the run sheet's `confirm` or `## Reviews` line, or, in a `thegraph-herdr`
  worker, in its result, which the conductor writes under `## Answers` and puts
  in any later brief for the issue. A later start on the same issue begins from
  that set, so nothing added is lost. A direct `/check-it`, with no confirm stop
  before it, runs on this pick alone, and asks nothing about the reviews.

**The decision model is Haiku 5.5, effort `medium`**, started with `Agent`
(`model: "haiku"`, `effort: "medium"`) and briefed as every review is
(*Briefing the fresh agents*, which says what its prompt holds).

The decision model answers each question **yes** or **no** with the lines that
ground the answer, quoted with their file and line, or, at the confirm stop, with the sentence of
the issue or statement they come from. A no that rests on finding nothing is
grounded by the search it ran and what that search printed, which anyone can run
again. **Where it cannot tell, the answer is
yes**: running one review too many costs less than missing one. It answers from
what the change does, not from words in it: a skill that mentions arguments, or
a shell, does not make question 2 yes unless the change makes something run that
takes such a value from someone else.

| | The question | Points to |
|---|---|---|
| 1 | Does something that runs change: code, scripts, config, or commands written in docs? | the bug reviewer (6) |
| 2 | Does input from outside the process reach changed code, or does changed code handle authentication, permissions or secrets? | the security reviewer (7) |
| 3 | Does it change a promise others depend on: a public API, a contract between skills, a file format, exit codes? | `lens` (8), the bug reviewer (6) |
| 4 | Are there siblings or prior art to hold it against, or something that must be listed in full? | `lens` (8) |
| 5 | Does it add a function, module or doc section, or change structure? | the refactoring reviewer (4) |
| 6 | Does it add or change comments or lint suppressions? | `comment-it` (9) |

Then, with the reviews' descriptions in hand, **it picks the reviews itself**,
one line of reason for each, picked or not:

| Review | What it reads for |
|---|---|
| the refactoring reviewer (4) | whether the change re-makes what the repository has, could be simpler, wastes visible work, is too general or too narrow, or is hard to maintain |
| the bug reviewer (6) | correctness bugs in whatever the change makes run: code, scripts, configuration, and commands written in documents |
| the security reviewer (7) | security defects where untrusted input reaches what the change makes run, or where it handles authentication, permissions or secrets; commands in documents included |
| `lens` (8) | what the change left out or does differently, held against this repository's siblings and the named prior art, deliberate divergences left out |
| `comment-it` (9) | whether the comments and lint suppressions the change adds or changes keep the repository's comment rule |

Its answer has this shape, and nothing after it:

```
1. yes|no — <one line> — <the lines that ground it>
2. …
6. …
pick:
- <review> — yes|no — <one line of reason>
```

**The floor is added after the pick, whatever the pick says**: the spec and
rules reviewer (5) always runs, and the proving agent (11) runs whenever the
refactoring, bug, security or `lens` reviewer runs. Only the person removes a
floor review, in words at the confirm stop, and this skill's start does not add
it back. **The answer is read for gaps**: a question left unanswered, or answered
no with neither a line nor a search grounding it, is read as yes, and the review it points to is added with that as its reason; a
review the `pick:` list leaves out is read as picked. A call that returns no
answer, or fails, picks every review, and the result says so.

**The answer is saved** as *Save each report* names it. Its cost line goes in
the result with the reviews', the confirm stop's from the run sheet or the
brief.

**The line in the reading question** names the reviews that will run, the floor
included, and the path of the saved answer, for example: *reviews: the reviewer,
the bug reviewer, `lens`, the proving agent (the decision model; answers in
`….pick-confirm.md`); say which to add or remove*. **How the person's words
read**: a review they name to add runs, one they name to remove is removed by
the person, the floor's included, and words that name no review leave the pick
as it is. A removed proving agent leaves the findings of 4 and 6 to 8
unreproduced: each goes into the report as *unproven* with what would show it,
and none is pre-ticked.

### Each review's model

**Each review runs on a model fixed for its role, whatever model the session
calling this runs on** (ADR-0102, amended for #86): a session on a smaller model
would otherwise hand its reviews that model too.

| Review | Model, effort |
|---|---|
| the refactoring reviewer (4) | Opus 5.5, `medium` |
| the spec and rules reviewer (5) | Opus 5.5, `high` |
| the bug reviewer (6) | Opus 5.5, `high` |
| the security reviewer (7) | Opus 5.5, `high` |
| `lens` (8) | Opus 5.5, `high` |
| `comment-it` (9) | Sonnet 5.5, `medium` |
| the proving agent (11) | Opus 5.5, `medium` |
| the decision model (*Choosing the reviews*) | Haiku 5.5, `medium` |

**Every row is set on its `Agent` call**, as `model` and `effort`: `model:
"opus"`, `model: "sonnet"` or `model: "haiku"`, and the effort as the row says. `lens`'s and
`comment-it`'s frontmatter also names a model, for a caller that runs them with
`Skill`; here the `Agent` call sets it. The verify check has no row: it is part
of (1), runs the project's own command in this session, and its reading follows
that project's skill.

`thegraph` and `thegraph-herdr` show this table at their confirm stop, before
the reading question that carries the pick. A direct `/check-it` shows it with
the pick, as lines before its reviews start, asking nothing, and again in its
result. **A row changes only where the person asks**: at a confirm stop in
the same words that change the pick, and in a direct run where the request that
started it says so. The changed row reaches this step the way the pick does. A
changed row takes effect for that run, except
that an `Agent` call takes only a model alias (`sonnet`, `opus`, `haiku`,
`fable`), so a model with none cannot go on a row, and a session on another
Opus version runs the Opus rows on its own version. The confirm stop says so
when it shows the table, and a change asked anyway that cannot apply is
reported as not applied, with the reason.

### The spec and rules reviewer (5)

One fresh agent, given the **whole** diff, the issue, and what this repo wrote
down: its `CLAUDE.md`, decision records and conventions. It is briefed and
handled as `lens` is (*Briefing the fresh agents*), and it answers two
questions, reported apart, each with its own worst finding and never merged into
one ranking:

- **Rules: does it hold up** against what this repo wrote down: its
  `CLAUDE.md`, its decision records, its conventions? Whether it is built well
  for maintaining, where nothing written says, is the refactoring reviewer's
  question (4), not this one.
- **Spec: does it do what the issue asked?** What is missing, what crept in that
  nobody asked for, and what looks done but is done wrongly.

Each finding is graded **violation** (cite the rule), **judgement**, or **already
decided** (a record settled it; one line), and carries its reproduction: the
exact command, the output it printed, and the output the intent requires. A
finding a run could show and nobody ran is left out; one no run here can show,
such as a naming rule, is kept and marked *not run*, with why. The report ends with
`lens`'s safety line (*Verification*, item 6), for the fact the change's safety
rests on. A clean answer is a result.

Who could reach the change and what it exposes is the security reviewer's
question (7), not this reviewer's. Where 7 did not run, nothing asked it, and
the result says so.

### The refactoring, bug and security reviewers (4, 6, 7)

Each is one fresh agent, briefed as the reviewer is (*Briefing the fresh
agents*), and its own part of the brief is a file beside this one. **Read the
file only when that review runs**, and pass its text whole in the agent's
prompt:

- the refactoring reviewer (4): [reviewers/refactoring.md](reviewers/refactoring.md)
- the bug reviewer (6): [reviewers/bug.md](reviewers/bug.md)
- the security reviewer (7): [reviewers/security.md](reviewers/security.md)

None of them edits. Their findings name a file, a line, and what shows each, run
or traced; the proving agent (11) reproduces them.

### A project's verify skill, in (1)

A **verify skill** is defined in `GLOSSARY.md`: the project-local skill
`create-formal-verification-skill` writes, under the repository's
`.claude/skills/`, committed or not. Nothing here builds one or calls that skill
(#78).

**The signal is mechanical**: the files the diff touches (`git diff HEAD
--name-only --no-renames`, which names both paths of a move, and every
untracked file) against the files each verify skill names as covered: the code
its check describes, not every file the skill mentions (its model, its scripts
and the files it lists as not covered are not covered files). A file in both
puts that skill's check on (1)'s list. Nobody is asked: it is a check, not a
review, so the decision model does not pick it and nobody removes it (ADR-0102,
amended for #105). A skill that covers only some functions of a file
still counts the file: whether the change reaches a covered function is the
verify skill's own first step, and the check runs either way. The candidates are
found by reading each `.claude/skills/*/SKILL.md`: one that names the files it
covers and the commit it was confirmed at (its sync commit) is a verify skill,
wherever in it it writes them, and one without both is not.

**Running it.** It runs with the rest of (1), before the reviews and the
benchmark (10), so a check such as TLC, which can take every core, never shares
the machine with a benchmark that wants it quiet. It runs again with (1) after
the fixes the person picks. It runs in this session. Follow the verify skill's steps for whether
the change touches the verified code and for running its command, its tool
state sent to a set place and deleted after as [`clean-it`'s rules](../clean-it/RULES.md)
say, run bare as
(1) runs a check. Save the output, as `<run sheet>.verify.md` or in the OS temp
folder. A check that cannot run here, such as one whose tool is not installed,
is reported as not run, with why, and never as a pass.

**Where the check runs on a model rather than on the code, a code change cannot
turn it red by itself.** So where the verify skill's own test says the change
touches the verified code (a mapped function, or a new step of the kind its
model makes an action) and the model no longer describes the new code, bring the
model in line with the new code, as the first step of the skill's section for an
intended change says, **in a copy in its own folder in the run folder**, and run the check
there once, with its own temporary folder, so its logs do not replace the
repository run's. The copy and the check's tool state go at the end of this
check, as [`clean-it`'s rules](../clean-it/RULES.md) say. Only that first step: the copy is not changed again until it
passes, and the repository's model, the skill and its sync commit are left as they are,
since nothing here fixes anything. The repository run is the baseline *Whose is
it* compares against, where no commit after the sync commit touched the covered
files.

**Reading the result.** This session reads the run's own output, a failed run's
counterexample included, and tells a counterexample as a short sequence of steps
in the code's words. It runs nothing else to read it, even where an older verify
skill names a tool for that. The result says, as the verify skill's steps tell a
real bug from a modelling error:

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

### The proving agent (11)

One fresh agent, briefed as the reviewer is, given every finding of 4, 6, 7 and
8 as each report gave it, with its grade or severity. For each one it
reproduces the finding: it runs the
command that shows it, with the output it printed and the output the intent
requires, or, for a finding about text such as a citation or a missing case, it
re-opens the source and quotes it. Each finding comes back as one of three:

- **passed**: reproduced, with that evidence;
- **dropped**: shown not to hold, or to need no action, with why;
- **unproven**: no run here can show it, because it needs a live screen,
  another machine or a person to drive it. It says what would show it, and it
  goes to a person. It is never passed and never dropped.

**Each finding's line also gives the time spent on it**, from the first probe
to the verdict. No cap applies yet. The times are recorded so a cap can be set
from them, or left unset (ADR-0102, *The review strength, and what each review
cost*).

Each finding also says **whether this change introduced it**, measured as
*Whose is it* says where a run can show it, and read from the diff where only
text can. A passed finding goes into the report (*One report, one question*),
pre-ticked only where this change introduced it and it asks for no decision.
The reviewer's findings (5) and `comment-it`'s (9) carry their own evidence and
do not go through it.

**Cost (10)**: no defect without a number. A slowdown that was measured, with
something to compare it against, is a defect. A shape nobody measured is a
question, and it is asked as one. **Read [benchmark.md](benchmark.md) when** the
change claims a performance effect, a review flags a possible slowdown, or the
repository's build guidance names the path as needing a benchmark; otherwise it
is not read. The reviews run beside this check, so where a finding of theirs is
the first to flag a slowdown, run (10) again with the method once it arrives.

**Comments (9)** come back as findings, and go into the report. A finding the
person keeps is fixed in this change, through `make-it`: a comment outside the
repository's list is deleted; where it explained a workaround or a surprise in
this repository's own code, the code is fixed instead, and a fix outside this
change's scope is carried to `ask-it`, never written back as a comment. A
constraint on our own code — *do not remove*, *talk to X first* — is deleted and
carried to `ask-it` as a check candidate for `encode-it`. A suppression of a
correctness or safety rule is fixed through `make-it`. A report of contributor
mode or of a missing rule is passed on as it came.

### One report, one question

**After the proving agent (11), every finding goes into one numbered report**:
those of the refactoring reviewer (4), the reviewer (5), the bug reviewer (6),
the security reviewer (7), `lens` (8) and `comment-it` (9). Save it as `<run
sheet>.findings.md`, or in the OS temp folder where there is no run sheet, and
write its path on the run sheet; a `thegraph-herdr` worker, whose run sheet does
not exist, writes it in its report file's `## Question` and `## Result`. The
numbers run once through the whole report, **one number for one defect**: where
several reviews found the same one, its line names each, and it goes in the
highest group any of them reaches, as `ask-it` counts several sightings of one
gap as one item. The groups are four:

1. **To fix, pre-ticked**: reproduced here and introduced by this change. A
   finding of 4, 6, 7 or 8 the proving agent passed as introduced by this change
   and asking for no decision, where a refactoring proposal (4) that changes
   behaviour or edits a file outside the diff asks for one; a finding of 5 graded *violation* whose command,
   re-run here, printed what it carries, on what this change wrote; a finding
   of 9 on a comment or suppression the diff adds or changes. This group is what
   *Going back, and stopping* sends to `make-it` (ADR-0102, amended for #105).
2. **Passed, not pre-ticked**: reproduced, but this change did not introduce it,
   or it asks for a decision; a finding of 5 graded *judgement*, or graded
   *violation* and marked *not run*; a report of 9 on contributor mode or a
   missing rule.
3. **Unproven**: with what would show it.
4. **Dropped**: each with its ground, as `ask-it` treats a drop: the proving
   agent's drops with why, the reviewer's *already decided* with the record,
   and a reviewer's finding whose command, re-run here, did not print what it
   carries, with what it printed.

Each line gives its number, the review it came from, the file and line, the
finding in one sentence, its evidence (the command and what it printed, or the
quoted source), and, for groups 1 and 2, whether this change introduced it and
how that was measured.

**Then one question**, with three options:

- **fix as pre-ticked**: group 1 is fixed, and the drops' grounds are taken as
  holding;
- **fix nothing**: nothing is fixed, and the tree stays as the reviews found it;
- **pick by number**: the person types the numbers to fix, from any group; a
  dropped finding picked is reopened and fixed.

The question names the report's path and lists group 1's numbers, each with its
one-line finding, so the person can answer from the question. In a
`thegraph-herdr` worker it goes through the conductor (the brief's
`## Question` and its `hc send` line); anywhere else, in a `thegraph` session or
a direct `/check-it`, it is asked directly with the question tool. A report
with no finding in it asks nothing, and the result says the reviews found
nothing.

**No answer fixes nothing.** A question dismissed, or answered with text that
names neither an option nor a number, fixes nothing: the run stops there,
uncommitted, and the result says so. The run is not done, so its run sheet is
kept and the report stays where it points. A `thegraph-herdr` worker reports
this as `stuck`, its brief's way to say the issue cannot proceed. *Fix nothing*
is an answer: the run goes on to `sweep` (12) with nothing
fixed.

**After the answer**, each picked finding is fixed through `make-it`, then 1 to
3 run again, and a review runs again only where a fix opened a surface it did
not walk (*Going back, and stopping*). **A passed finding the person left
unfixed is carried to `ask-it`**, with its number and evidence, marked as the
person's choice not to fix it here. An unproven finding left unfixed is carried
as *unproven*, with what would show it. A drop left unpicked is recorded in the
report with its ground, and is not carried.

### Where the files landed

`make-it` wrote the home for every new or moved file down as **concrete paths**, read
against the tree as it is, the layout rule `CLAUDE.md`, `GLOSSARY.md` or a decision
record states, and the folder-structure reference. This is where that answer gets
checked: list what the diff actually added or moved, and match it.

**A file in the wrong place produces no error, no failing test and no warning** —
which is the whole reason the answer was written down rather than carried. A
mismatch is this change's own defect and goes back to `make-it`.

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

**The strongest proof runs in a real consumer.** A consumer cloned or built for
it follows [`clean-it`'s rules](../clean-it/RULES.md). Link this build into something
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

**Measure it, do not reason about it.** Where the tree without this change is
a worktree or a copy, it follows [`clean-it`'s rules](../clean-it/RULES.md). Take the tree as it stands **without this
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

**Every review runs in a fresh agent** that never saw this session (ADR-0091,
ADR-0095, ADR-0102): the refactoring reviewer (4), the reviewer (5), the bug
reviewer (6), the security reviewer (7), `lens` (8), `comment-it` (9) and the
proving agent (11), and so does the decision model that picks them. That is the point: the hand that shaped the change is the
worst judge of it. So the brief is all it gets: the prompt of a newly started
general-purpose agent (not a fork of this conversation, which inherits it),
started with `Agent` on its row's model and effort, told to edit nothing,
write no file outside the OS temp folder, and run nothing that acts outside its
copy: no write to a tracker or a remote, nothing sent to another terminal or a
process it did not start. Such a command is read and reported as traced. A probe that can only run inside the tree runs in a copy
made in the agent's own folder in the run folder, without its `.git`, with `git init` where it needs
git, as `lens` says (#93): a worktree, or a copy that keeps `.git`, writes into
this repository's gitdir. **The brief names the run folder and the ledger**, and
what the agent copies, builds, installs or starts follows
[`clean-it`'s rules](../clean-it/RULES.md): a ledger line when it is made, deleted before
the report returns with its size in the report, except the run's shared build
folder, which stays for the run. That prompt names the diff as `git diff HEAD` plus every
untracked file, so a new file is in it, and it points at the issue and this
repo's records. Then each prompt carries its review's own part:

- **the reviewer (5)**: (5)'s two questions and the paragraph after them, quoted
  as written here;
- **the refactoring, bug and security reviewers (4, 6, 7)**: their file under
  `reviewers/`, whole;
- **`lens` (8)**: the body of [`lens`'s SKILL.md](../lens/SKILL.md) below its
  frontmatter, whole, then the brief below as that skill's argument;
- **`comment-it` (9)**: the body of [`comment-it`'s SKILL.md](../comment-it/SKILL.md)
  below its frontmatter, whole, then its argument: the repository's root, and
  the same diff as the scope;
- **the proving agent (11)**: (11) quoted as written here, *Whose is it* whole,
  since it measures each finding's owner that way, and every finding it is to
  prove;
- **the decision model**: *Choosing the reviews* from *The decision model
  answers* to the end of the answer's shape, quoted as written here; at a
  confirm stop, where there is no diff yet, the issue and the two statements
  stand in its place.

A skill's body links to files beside it, such as `../clean-it/RULES.md`, and an
agent reads those links from its own working folder, where they do not resolve.
So each `lens` and `comment-it` prompt names the skill's folder as an absolute
path, the links to be read from there.

**Save each report** beside the run sheet, as `<run sheet>.<name>.md` with the
name `refactoring` (4), `spec-rules` (5), `bug` (6), `security` (7), `lens` (8),
`comments` (9), `proving` (11), `verify` for the verify check of (1),
`findings` for the gathered report, or `pick` for the decision model's answer
at this skill's start, or in the OS temp folder when there is no run sheet, so
a compaction does not lose it. The decision model's answer at a confirm stop is
`<run sheet>.pick-confirm.md`, where the run sheet is the per-issue one in
`thegraph-herdr` (`….<slug>.pick-confirm.md`), and in a `thegraph` cluster
`<run sheet>.<child>.pick-confirm.md`, `<child>` being the child's issue number
as its `## Children` line names it without the `#`, or its issue file's name
without the extension. Then **re-run each command the
reviewer's kept findings carry, and each passed finding's reproduction, before
it goes into the report's first group**: a finding is a candidate until it was reproduced here. An
*unproven* finding is carried to a person with what would show it. A skip, such
as a two-sentence change with nothing for the reviewer to read, is reported with
its reason, never silent.

**A check started in the background is waited for, and its report read, before
the run moves on** (#92). An `Agent` call made from a script can come back at
once with `status: "async_launched"` and an `outputFile`. That file stays
empty: measured on 2026-11-19 on Claude Code 2.1.328 (#92), it was still 0
bytes after the agent had finished. The report arrives only in the task
notification naming that agent, as its `<result>`. Any other check whose call returns
before its report is the same case, the decision model's call at a confirm stop
included. Wait for each report where it arrives, and
save the report itself, never the launch receipt, as the file named above. The
run does not move past the reviews, to the proving agent, the report, `sweep`
or the result, until every check it started has its report read or is reported
not run. **A check whose report never came back is reported as not run**: the
notification says it failed or was stopped, or the agent ended with no report.
The result names what was waited on and where, and it is never a pass.

**Start `lens` and `comment-it` with their skill's body in the prompt, and tell
the agent not to call `Skill`.** The method is in the prompt, so nothing is
handed on and nothing can arrive empty. Calling them through an agent that was
to call `Skill` is what failed before (#87,
`docs/research/check-it-subagent-models.md` Part A): a quarter of `lens` forks
and 30% of `comment-it` forks did nothing, 85 of those 89 under a
general-purpose agent that held the brief in its own prompt and called `Skill`
with no `args`, or with `"see task message"`. **A reply saying the brief was
empty or missing is that check not run**, and it is reported as not run, with
that reply as the reason. It is never a pass, and a pass done by some other
agent in its place is not that check either.

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
| a red check, or a red the baseline does not produce (1 to 3) | back to `make-it` |
| a slowdown (10) measured against something to compare it with, that this change introduced | back to `make-it` |
| a review's finding of a real defect **this change introduced** | the report, pre-ticked; back to `make-it` where the person's answer keeps it (*One report, one question*). Re-read only if the fix **opened a surface the pass did not walk** — otherwise it is covered by that pass's own claim, and say which of the two it was |
| the same failure surviving three fixes | **a person**, as a design question, not a fourth repair |
| a defect this change **revealed or did not touch** | **not fixed here** unless the person picks it. The report, not pre-ticked, with the measurement |
| a patch standing in for a deeper fix | **not fixed here.** Where it belongs, then a person |

**Fixing somebody else's defect inside this ticket puts it on a budget sized for
this change's own repairs.** Three attempts later the ticket is over, the defect
is half-fixed, and nobody planned either.

## What this does not do

It does not open a branch, write a pull request, or file anything — those are
acts on the outside world and they go through the one door that asks first.

It does not report a pass it did not run. A check skipped for a reason is
reported with the reason; a check skipped silently and a check that does not
exist are the same thing to everyone who reads the result later.
