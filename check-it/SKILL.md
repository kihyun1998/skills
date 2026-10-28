---
name: check-it
requires: [lens, sweep]
description: "Measure a finished change before anyone calls it done, cheapest check first. Use once a change is written and before it reaches a person."
---

# check-it — measure it before anyone calls it done

`make-it` wrote it. This measures it, and the two are separate on purpose:
**the hand that shaped a thing is the worst judge of whether it is finished.**

Nothing here fixes anything. It measures, attributes, and hands the result on.

## What gets measured, cheapest first

The order is cost, not ceremony. A red gate makes every expensive pass below it
a waste, so it goes first.

| | What it answers | Call | When |
|---|---|---|---|
| 1 | Did every check actually run, and pass | — | the project has checks |
| 2 | Did the files land where the rule said they would | — | the change added or moved a file |
| 3 | Does it work against something real | — | the change compiles or runs |
| 4 | Does the code hold up, and does it do what was asked | the reviewer, a fresh agent | ” — always; a skip is reported with its reason |
| 5 | Will it get slower | — | the change adds state, loops, or I/O |
| 6 | Is it open to somebody who means harm | the same reviewer | as 4 |
| 7 | What is missing | `lens`, in a fresh agent | always; a skip is reported with its reason |
| 8 | Which surfaces now describe it wrongly | `sweep` | always |

**Running the checks (1).** The list is the project's CI workflow, or the gate
list its guidance names where CI gates nothing, plus whatever those do not
reach. Run each one **bare**: no pipe, no `| tail`, no filter, since a
pipeline's exit status is the last command's and a red check reads green
through it. Read every result. Never move a threshold, narrow a scope or bypass
a hook to turn one green, and report a check not run, with why. **The same
failure surviving three fixes stops the repairs** and goes to a person as a
design question.

**Review (4)** is one fresh agent, given the **whole** diff, the issue, and what
this repo wrote down: its `CLAUDE.md`, decision records and conventions. It is
briefed and handled as `lens` is (*Briefing the reviewer and the completeness
read*), and it answers three questions, reported apart, each with its own worst
finding and never merged into one ranking:

- **Does it hold up** against what this repo wrote down? Where it wrote nothing,
  the baseline is the well-known code smells (Fowler's catalogue).
- **Does it do what the issue asked?** What is missing, what crept in that nobody
  asked for, and what looks done but is done wrongly.
- **Harm (6):** who could reach this, what they control, and what it exposes.
  *"Nothing here to reach"* is that agent's answer to give, not this session's.

Each finding is graded **violation** (cite the rule), **judgement**, or **already
decided** (a record settled it; one line). A clean answer is a result.

**Cost (5)**: no defect without a number. A slowdown that was measured, with
something to compare it against, is a defect. A shape nobody measured is a
question, and it is asked as one.

**A prose change runs 7 and 8 — plus 2, where it added or moved a file — and
nothing else.** There are no gates to run, no round trip to prove, no code for the
reviewer — and a run that reports those as passed has reported on work it did
not do.

**The reviewer and the cost check (5) read the same diff and ask different
questions**, so they run at the same time. That is not splitting material; it is
the opposite.

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

## Briefing the reviewer and the completeness read

**The reviewer and `lens` each run in a fresh agent** that never saw this
session (ADR-0091, ADR-0095). That is the point: the hand that shaped the change
is the worst judge of it. So the brief is all it gets: for `lens`, the skill's
argument; for the review, the prompt of a newly started general-purpose agent
(not a fork, which inherits this conversation), told to edit nothing and write no
file. That prompt names the diff as `git diff HEAD` plus every untracked file, so
a new file is in it; it points at the issue and this repo's records; and it quotes
Review (4)'s three questions and its grade line as written here. **Save each report it returns** beside the run sheet
(`<run sheet>.lens.md`, `<run sheet>.review.md`), or in the OS temp folder when
there is no run sheet, so a compaction does not lose it. Then **re-open every `CONFIRMED` citation, and every
finding you will act on, at its source**: a finding is a candidate until you have reproduced it. **`lens` runs on every
change, the reviewer on every code change.** A skip, such as a two-sentence
change with nothing to enumerate, is reported with its reason, never silent.

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

**Fixing somebody else's defect inside this ticket puts it on a budget sized for
this change's own repairs.** Three attempts later the ticket is over, the defect
is half-fixed, and nobody planned either.

## What this does not do

It does not open a branch, write a pull request, or file anything — those are
acts on the outside world and they go through the one door that asks first.

It does not report a pass it did not run. A check skipped for a reason is
reported with the reason; a check skipped silently and a check that does not
exist are the same thing to everyone who reads the result later.
