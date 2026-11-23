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
check is on the list**, run without being asked: where the repository has a
`.claude/skills/` folder, read [verify.md](verify.md), which says how it is
found, run and read.

### Choosing the reviews

**No review is asked per change.** A fresh agent, **the decision model**,
answers six fixed questions about the change and picks the reviews from them;
the floor is added to its pick (ADR-0102, amended for #112). It runs twice:

- **At the confirm stop**, from the planned change. `thegraph` and
  `thegraph-herdr` start it for each issue once ② is written, with the issue
  and the two statements as its change (`pick-confirm` and `change` in
  *Briefing the fresh agents*), and wait for its answer as for any check
  started in the background. Where `read-it`
  asks ① alone first, the pick waits for ②; a correction to ① that rewinds the
  reading runs it again on the new statements. The pick is shown as one line
  inside the question that carries ②, and the person can change it there in
  words. Nothing else about the reviews is asked. The pick as the person left
  it reaches this step on the run sheet or in the worker's brief.
- **At this skill's start**, before (1), on the real diff: `git diff HEAD` plus
  every untracked file, less those the run folder's record or a claim leaves out
  (*Briefing the fresh agents*). A review it picks that is not already chosen
  is added without asking, and the result names it with the decision model's reason.
  **Nothing chosen is removed**, the person's additions and a review whose
  question now answers no included. A review the person removed at the confirm
  stop is not added back; the result names it with the reason it was picked
  again. **What it adds is written where the confirm stop's pick is kept**: on
  the run sheet's `confirm` or `## Reviews` line, or, in a `thegraph-herdr`
  worker, in its result, which the conductor writes under `## Answers` and puts
  in any later brief for the issue. A later start on the same issue begins from
  that set, so nothing added is lost. A direct `/check-it`, with no confirm stop
  before it, runs on this pick alone, and asks nothing about the reviews.

**Its questions, the reviews' descriptions and its answer's shape are
[reviewers/decision-model.md](reviewers/decision-model.md)**, which the script
puts in its prompt (its *At the confirm stop* section in `pick-confirm`'s
only). It holds six questions, each answered yes or no with the lines that
ground it, or the search that found nothing, **yes where it cannot tell**, then
a `pick:` list with one line of reason for each review, picked or not.

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

### Each review's own brief

Each review is one fresh agent (*Briefing the fresh agents*), and its own part
of the brief is a file beside this one, which the script puts in its prompt
whole. None of them edits.

- the refactoring reviewer (4): [reviewers/refactoring.md](reviewers/refactoring.md)
- the spec and rules reviewer (5): [reviewers/spec-rules.md](reviewers/spec-rules.md).
  Who could reach the change is the security reviewer's question (7); where 7
  did not run, nothing asked it, and the result says so.
- the bug reviewer (6): [reviewers/bug.md](reviewers/bug.md)
- the security reviewer (7): [reviewers/security.md](reviewers/security.md)
- `lens` (8) and `comment-it` (9): their skill's body, then
  [reviewers/lens.md](reviewers/lens.md) or
  [reviewers/comment-it.md](reviewers/comment-it.md) as its argument
- the proving agent (11): [reviewers/proving.md](reviewers/proving.md), then
  *Whose is it* whole and every finding of 4, 6, 7 and 8, each returned
  passed, dropped or unproven. The reviewer's findings (5) and `comment-it`'s
  (9) carry their own evidence and do not go through it.

### One report, one question

**After the proving agent (11), every finding goes into one numbered report**:
those of the refactoring reviewer (4), the reviewer (5), the bug reviewer (6),
the security reviewer (7), `lens` (8) and `comment-it` (9). Save it as
`findings` (*Save each report*), and write its path on the run sheet; a `thegraph-herdr` worker, whose run sheet does
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
one-line finding, so the person can answer from the question. **An unproven
finding only model runs can show is listed there too**, with what would show it:
*N runs on model X, estimated cost* in tokens, as the review gave it. Picked by
number, this session, the run's own, makes those runs, never a review, and fixes
the finding where they show it; the result gives the runs, what they showed and
what they cost. In a
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

### Where the change compiles or runs

**Read [code.md](code.md) where the change compiles or runs, or where `comment-it`
(9) ran**: it holds cost (10), comments (9) and proving it works. A prose change
that ran no `comment-it` does not read it.

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
ADR-0095, ADR-0102), 4 to 9 and 11, and so does the decision model that picks
them. That is the point: the hand that shaped the change is the worst judge of it. So the brief
is all it gets: the prompt of a newly started agent (not a fork of this
conversation, which inherits it), started with `Agent` as `check-it-reviewer`
on its row's model and effort. **No review starts a model run** (#123, #131).
That type, [agents/check-it-reviewer.md](agents/check-it-reviewer.md), has no
`Agent` and no `Skill` tool, and a `PreToolUse` hook on its `Bash` and
`PowerShell` refuses a command that runs `claude`
([scripts/no-model-run.mjs](scripts/no-model-run.mjs)); the hook is set to block
the call when it fails or times out, so a missing or broken script refuses
rather than lets through. It reads the command's text, so it catches `claude`
named in the command itself, and not one started from a script file, another
interpreter, a variable, an encoded command or a renamed copy. **Where the session's agent list lacks the type**
(Codex, or a session started before the install), the review is started as the
default agent with the same prompt, held by the brief alone, and the result
names each review started that way. **A session started before the definition
changed** still starts the type, on the grant it had then. So each review's
report opens by saying whether `Agent` or `Skill` is in its tool list, and the
result names each review that had one as run on an older definition or the
default agent.

**The prompt is what this skill's script prints, handed to `Agent` as it is**
(ADR-0102, amended for #114). Run it in the repository, `<check-it>` being this
skill's folder:

```
node <check-it>/scripts/check-it.mjs prompt <review> --issue <issue> --run-folder <run folder> --ledger <ledger>
```

- `<review>` is one of the names the script's usage lists (run it with no
  command): each review's own, `pick` for the decision model at this skill's
  start, and `pick-confirm` for it at a confirm stop.
- `proving` adds `--findings <report>` for each saved report of 4, 6, 7 and 8
  that ran; `pick-confirm` adds `--change <file>`, the issue and the two
  statements.
- `<issue>` is the issue's reference, or the request where there is none; the
  run folder and the ledger are [`clean-it`'s](../clean-it/RULES.md), the run
  folder made before the first call (a direct `/check-it` makes its own).

The prompt is [reviewers/brief.md](reviewers/brief.md) filled in, the change
named as `git diff HEAD` plus every untracked file not left out (below), each
file listed (`range --run-folder <run folder>` prints the list), then the
review's own part (*Each review's own brief*), each file's title kept and the paragraph after it, for its maintainers, left out.
`lens`'s and `comment-it`'s carry their skill's folder as an absolute path,
since a body's links do not resolve from the agent's own folder.

**An untracked file that was there before the run began is not the change's**
(#119). `node <check-it>/scripts/check-it.mjs record --run-folder <run folder>`
writes `check-it.untracked.json` there, each untracked file with a hash of its
content; when it runs is `thegraph`'s to say, where it makes the run folder.
Where the run folder holds that record, `range`, `verify` and `prompt`
leave out each untracked file it names whose content is unchanged, and list
the files left out under the change, so none disappears unseen. A file the
change edited is listed again. A run started over or moved carries the earlier
attempt's record into its new run folder with `record --run-folder <run folder>
--from <earlier run folder>` instead (`thegraph` says when): where the earlier
folder holds no record, the record made lists no file, so every untracked file
is listed and a later `record` there stops; where that folder is not there,
the script stops. An untracked file `record` cannot read is not recorded, so
it is always listed. A record naming a path outside the repository,
or made for another repository, stops the script. A direct `/check-it` makes
its run folder after the change and records nothing, so every untracked file
is listed.

**A run in the same tree as another reads only its own files** (#136).
`node <check-it>/scripts/check-it.mjs claim --run-folder <run folder> <path> ...`
writes `check-it.claimed.json` there, the paths this run takes; when a run
claims them is `thegraph`'s to say (*A run alongside another*). It refuses a
path a claim in another run folder beside this one names, one already changed
in the tree that this run has not claimed or that differs from such a path only
in case, and a folder. Where the run folder holds a claim, `range`, `verify`
and `prompt` read only the changed files it names; where it holds none, they
leave out the changed files a claim in another run folder beside it names for
this repository. Only folders named `*.made` are read for that, as `thegraph`'s
run folders are, and a claim there that does not parse is passed over. Either way the files left out are
listed under the change. A claim naming a path outside the repository, or its
own made for another repository, stops the script.

**The script stops with an error when any piece is missing**: an empty diff, a
file that cannot be read or is empty, an option not given. A review it would
not assemble has not started: fix what the error names and run it again, or
report the review as not run with the error as the reason. A prompt written by
hand around the error is not that review.

**Never start `lens` or `comment-it` through `Skill`.** Their method is in the
prompt, so nothing is handed on and nothing can arrive empty. Calling them
through an agent that was to call `Skill` is what failed before (#87,
`docs/research/check-it-subagent-models.md` Part A): a quarter of `lens` forks
and 30% of `comment-it` forks did nothing, 85 of those 89 under a
general-purpose agent that held the brief in its own prompt and called `Skill`
with no `args`, or with `"see task message"`. **A reply saying the brief was
empty or missing is that check not run**, and it is reported as not run, with
that reply as the reason. It is never a pass, and a pass done by some other
agent in its place is not that check either.

**Save each report** at the path
`node <check-it>/scripts/check-it.mjs name <name> --sheet <run sheet>` prints,
or with `--run-folder <run folder>` in place of `--sheet` where there is no
run sheet, so a compaction does not lose it. The names are the script's, its
usage the one list: the review's, `verify` for the verify check of (1),
`findings` for the gathered report, and at a confirm stop `change` for the
planned change the decision model reads. In
`thegraph-herdr` the run sheet is the per-issue one; in a `thegraph` cluster
the name takes `--child <child>`, the child's issue number as its `## Children`
line names it, or its issue file's name. Then **re-run each command the
reviewer's kept findings carry, and each passed finding's reproduction, before
it goes into the report's first group**: a finding is a candidate until it was
reproduced here. An *unproven* finding is carried to a person with what would
show it. A skip, such as a two-sentence change with nothing for the reviewer to
read, is reported with its reason, never silent.

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
