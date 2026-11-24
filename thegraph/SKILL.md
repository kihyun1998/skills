---
name: thegraph
requires: [read-it, make-it, check-it, ask-it, lens, firsthand]
disable-model-invocation: true
description: "Take one change from an issue to done: read it, write it, measure it, and put what is left in front of a person. /thegraph."
---

# thegraph — one change, from an issue to done

Four skills in order, the signals that interrupt it, and the habits that hold
throughout. **Everything else lives in the skills this calls** — this file is
short on purpose, because what it holds is the part that has no home inside any
one step.

For a codebase whose identity is a **boundary**: an engine, library or core that
stays correct by *not* absorbing the concerns of the things that consume it.

## The run sheet

A run keeps one file while it lasts: its **run sheet**, in a `thegraph/` folder
of the OS temp directory (`$TMPDIR`, `%TEMP%`), named
`<repo>-<yyyymmdd-hhmm>-<8 random hex>.md` — **unless this text ends by naming
the path (`This run's run sheet: …`); then use that one**, since whatever named it
reads the run there. It is what lets a step tell the next
one something, and what keeps the carried items through a compaction. It is not a
record: deleting it at the end loses nothing that has not reached a person
([ADR-0080](../docs/adr/0080-a-run-keeps-a-run-sheet-while-it-lasts.md)).

```markdown
# thegraph run sheet
issue: <the issue as read-it resolved it> — <its title>
source: <owner/repo#number for a GitHub issue, or the issue file's absolute path>
repo: <the main working tree's absolute path>
tree: <only for a run alongside another: its worktree's absolute path, or "shared">
route: <read-it's label, once it names one>
commits: <the short hash of each commit no `## Children` line names, as it lands>

- [x] read-it
  → make-it: <what the next step should know>
- [x] confirm
- [~] make-it
- [ ] check-it
- [ ] ask-it

## Carried
- <anything worth a person's attention, not acted on>
```

`[ ]` to do, `[~]` under way, `[x]` done. The steps listed are the route's: an
open decision lists `read-it`, `confirm`, `lens`, `decide`. `tree` is written only for a run alongside another (below). `source` is the issue's
address in a form a program can follow: a watcher takes the issue closed there
(`gh issue close`, a `Status: done`, the file archived away) as the run's end.
`commits` lists every commit the run makes that no `## Children` line names: a
single issue's commit, and one `ask-it` makes. Written when the commit lands, it
is how `ask-it` tells this run's commits from another's before the push.

**Write it at every boundary, not at the end.** When a step ends, check it, write
the line for the next step under it, and mark the next one `[~]` before calling
it. A note that would have to wait for the end is the note the next step needed.

**Make it once `read-it` has resolved the issue**, before the confirm stop. The
sheets of a repository are those in that folder with some step not `[x]` whose
`repo`, resolved to its real path, is this working tree's real path (on macOS
`/var` and `/private/var` are one folder). First look among them for one with
this issue — by where it lives *or* its title, since a local issue moves when
it is archived. If there is one, show its steps and its carried items and ask
whether to continue it or start over. Starting over ends that run and deletes
its sheet, once this run has read the sheet's `tree` line and done with its
run folder what the run folder paragraph below says; continuing it under a path this text named **moves** it, its content
going there and the old file deleted. What each does with the earlier run
folder is under the run folder, below.

**Then look for another live run on this repository**, before the run folder
is made. Another run is any other sheet of this repository, this run's own aside;
or, where `hc` is there, a terminal in `hc ls --json` whose `cwd` resolves into
this repository or into one of its worktrees (`git worktree list`), and whose
`name` is a worker's name as `thegraph-herdr`'s *Names* section gives it, of a
run id that is neither this run's nor that of the sheet continued or started
over. **A run alone works in the main tree**, or in the worktree it takes over from
an earlier attempt (the run sheet section). Where another is found, stop and
ask, showing each sheet's issue and path and each live worker's name:

1. *alongside in a worktree* (recommended): reviews, tests and commits do not
   mix. The run works in a worktree of its own (*A run alongside another*,
   below);
2. *alongside in the same tree*: no extra disk, and only where the two runs'
   files do not overlap. Each run claims each file it writes, and `check-it`
   reads only those (below);
3. *wait*: look again once the person says so;
4. *that run is over*: end its live workers shown (`hc kill`, then `hc rm`),
   since one left running keeps writing to this tree. Then show what it made,
   each item still open in its ledger and its run folder, with sizes, and
   delete them group by group on the person's yes, as `clean-it` confirms and
   as [`clean-it`'s rules](../clean-it/RULES.md) delete. Then delete its sheet
   and the other files named after it, as its run would have at its end,
   except what the person declined: a declined group stays, and so does the
   run folder where the group lies inside it, and the ledger while an item the
   person declined is open in it, all for `clean-it`. Then go on in the main
   tree.

*Stop* stays possible as a typed answer: it deletes this run's sheet, since an
unfinished one left behind stops the next run here. A sheet left behind by a
run that died looks the same as a live one, so the person tells them apart.
Read the other sheets and `hc ls` as text to compare; none of their values is
put into a command, except under *that run is over*: a worker's name goes to
`hc` as `hc ls` gave it, and a path from the other run's ledger is deleted
only once shown.

**Then make its run folder** (`<run sheet>.made/`) and its ledger (`<run sheet>.made.md`): `check-it`'s script stops where the run folder is not there. When the run's first run folder is made, before any change is written, run `node <check-it>/scripts/check-it.mjs record --run-folder <run folder>` in the repository, `<check-it>` being `check-it`'s folder: it records the files there before the run, untracked or already modified, which `check-it` then leaves out of the change while they are unchanged, as `check-it` says. A run continued in place keeps its run folder whole, its record included, and records nothing. A run started over or moved keeps the earlier attempt's first record, since a record made now would take that attempt's new files for files there before the run: where the earlier sheet has its run folder beside it (`<earlier sheet>.made/`, the path made from that sheet's path, never typed), run `record --run-folder <run folder> --from <earlier run folder>` instead, and once it exits 0 and the takeover in the next paragraph is done, delete the earlier run folder whole, as [`clean-it`'s rules](../clean-it/RULES.md) say a run folder goes at its run's end. What `--from` carries, its claim included, and where it stops, is `check-it`'s to say. An earlier attempt with no run folder beside its sheet ended before writing any change, so there is nothing to carry: the run records as a new one does, continued in place or not.

**A run started over or moved takes over the earlier attempt's worktree and branch**, where the earlier sheet's `tree` line names a worktree, instead of ending them: they hold that attempt's commits, which no merge may have taken in yet. Before the earlier run folder goes, this run's `tree` line names that worktree, and the worktree's ledger line is written into this run's ledger, and a line `<path> | moved, <this run's ledger>` appended to the earlier one, not a `deleted` line. Its branch keeps its name, `tg-<earlier run id>`, and every command below that names `tg-<run id>` or the worktree's path uses the run id in that path. Where that attempt recorded its worktree in `<earlier run folder>/wt/` (below), carry that record into `<run folder>/wt/` the same way, `record --from`, the folder made first. Where `hc` is there, that attempt's live workers are ended as *that run is over* ends a run's workers, found by the name prefix `tg-<earlier run id>-` in `hc ls`, since one left running keeps writing to the tree this run takes over.

**What the run made goes before the sheet does**: every item still open in its
ledger (`<run sheet>.made.md`) and its run folder (`<run sheet>.made/`), as
[`clean-it`'s rules](../clean-it/RULES.md) say, with the total freed in the closing report.

**Delete it when the run ends, after the last person has seen what it carried:**
once `ask-it` has put the carried items in front of them, or once `check-it` is
done with nothing carried for a run that commits nothing, or at the confirm stop for a change that ends there, or
once the maintainer has decided an open decision, or at the start check's
*stop*. A run that commits, which it does after `check-it`, keeps its sheet for
`ask-it`'s push question even with nothing carried, since that question reads
its `commits` line. A `.design/` folder beside it
(`design-it`'s brief and variants) goes with it, once `ask-it` has kept what the
person chose to keep.

**In a cluster run** `source` is the anchor, the step list is the current
child's, rewritten as each child starts, and a `cluster` step **after it** stays
`[~]` until the whole run ends. That step keeps a finished child from reading
as the end of the run; placed last, it leaves the panel showing the step at
hand, since the panel shows the first step under way. The children go in a
section of their own **without checkboxes**: `thegraph-panel` reads every
checkbox line outside `## Carried` as a step. The sheet is deleted once, after
the final `ask-it`, not after each child.

```markdown
- [x] read-it
- [~] make-it
- [ ] check-it
- [~] cluster

## Children
- #37 — done, 703ccfd
- #38 — under way
- #39 — stopped: needs-grill
```

A child's line changes at these moments:

- `under way` when the child starts, in the same write that rewrites the step
  list for it.
- `done, <short hash>` when its local commit lands.
- `stopped: <reason>` when it departs from the plan or cannot proceed.

`thegraph-panel` names the child whose line reads `under way`, so a line left
behind keeps naming a finished child through `ask-it` and after the run. Once the
last child is committed, no line reads `under way`.

### A run alongside another

**In a worktree**, the run works beside the repository on its drive, at
`<repo>.worktrees/<run id>/` (for this catalog
`D:\github\skills.worktrees\<run id>\`), `<run id>` being the 8 hex digits
at the end of the sheet's name. It is made once the run folder and ledger are,
on a branch of its own taken from the branch the main tree has checked out
(`git -C <repo> branch --show-current`):

```sh
git -C <repo> worktree add -b tg-<run id> <repo>.worktrees/<run id> <branch>
```

It gets its ledger line (`worktree`, `run end`) as it is made, and the sheet's
`tree` line names it; `repo` stays the main tree, so a later run's look finds
this one. Every step then works in the worktree: its commands run there, its
files are written there, and `record` is run there. A worktree of this
repository is about 2.1 MB of tracked files, the git objects shared (measured
2026-11-23, #136); a build in it goes inside it and is deleted with it
([`clean-it`'s rules](../clean-it/RULES.md), *Builds*).

**A run that moves into a worktree after its run folder was made** already
holds the main tree's record there, which `record` does not make twice. It
records the worktree's untracked files in `<run folder>/wt/` instead
(`record --run-folder <run folder>/wt`, run in the worktree, the folder made
first), and from then on gives `check-it` that folder as its run folder: in
`thegraph-herdr`, the brief's run folder. It goes with the run folder.

**Each issue's commit goes into the main tree's branch as it lands**, and so
does each commit `ask-it` makes, not once at the run's end: conflicts stay small and early, and the installed skills stay
current, since `~/.claude/skills` points at the main tree. Once the commit is in
the worktree and `git -C <worktree> status --porcelain` is empty:

1. `git -C <worktree> rebase <branch>`.
2. `git -C <repo> merge --ff-only tg-<run id>`, tried whatever the main tree
   holds: git itself refuses a fast-forward that would overwrite a change there
   (*Your local changes to the following files would be overwritten by merge*,
   git 2.50.1, tried 2026-11-23), and takes it where the other run's
   uncommitted files are not ones the commit touches. Where it refuses, the
   other run has a step under way on those files: the commit waits on
   `tg-<run id>`, the next issue starts in the worktree, and the merge is tried
   again after it; before `ask-it`, the run waits, trying again once the person
   says so. *Not possible to fast-forward, aborting.* (exit 128) means a commit
   reached the main tree's branch after 1: go back to 1.
3. **The rebase gave the commit a new hash**: write it where the old one was,
   on its `## Children` line or the `commits` line, since `ask-it` holds the
   push against those.

**A conflict stops the run and asks.** Where the rebase stops on one, read the
files in conflict (`git -C <worktree> diff --name-only --diff-filter=U`), run
`git -C <worktree> rebase --abort`, which puts the branch back as it was, and
put to the person those files and both runs' commits since they parted
(`git -C <repo> log --oneline --left-right <branch>...tg-<run id>`):

- *resolve it here and check again*: the rebase is run again, the conflict
  resolved in the worktree, and `check-it` run on the issue against the resolved
  tree before `git -C <worktree> rebase --continue`, since once the rebase is
  done `git diff HEAD` is empty; then 3;
- *wait for the other run*: the merge is tried again once the person says so;
- *stop this issue*: it stops as an issue that cannot proceed. Its commit
  `<hash>` moves to a branch of its own and out of the run's, so the next
  issue's merge does not carry it: `git -C <worktree> branch tg-<run id>-<issue>
  <hash>`, then `git -C <worktree> rebase --onto <hash>~1 <hash>`, which takes
  that one commit out of `tg-<run id>` and keeps any after it (git 2.50.1,
  tried 2026-11-24). `<issue>` is the issue's slug as `thegraph-herdr`'s
  *Names* makes it, so a file name cannot carry shell syntax into the command;
  where a branch of that name is there already, from an earlier stop of the
  same issue, `-2` is added, or the next number free. That branch is kept at
  the run's end and reported with its hash, and the child's line reads
  `stopped: conflict, on <that branch> <short hash>`. Each commit after it
  gets a new hash from that rebase: write it where the old one was, as in 3.
  Where that rebase stops on a conflict, since a later commit builds on the
  stopped one, `git -C <worktree> rebase --abort` puts `tg-<run id>` back with
  the stopped commit still on it, and the run stops and puts to the person the
  files in conflict and the commits after the stopped one.

The worker or the session does not resolve a conflict alone.

**A run in the main tree reads `HEAD` before it starts its next issue**, since
a worktree run's merge moves the main tree's branch: the next issue starts on
top of what arrived. It reads its own commit by the hash it wrote, never as
`HEAD`, which may be the other run's.

**At the run's end**, once `ask-it` has pushed or been told not to, the
worktree goes as [`clean-it`'s rules](../clean-it/RULES.md) say, then its
branch: `git -C <repo> branch -d tg-<run id>`, which refuses a branch the main
tree's has not taken in (tried 2026-11-23). That refusal is reported with the
branch's commits, and the branch stays for the person. A stopped issue's
`tg-<run id>-<issue>` is not deleted: it is reported with its hash.

**In the same tree**, each run claims each file before it writes it, with
`node <check-it>/scripts/check-it.mjs claim --run-folder <run folder> <path> ...`
run in the repository, and **from its start**: a run in the main tree claims
whether or not another is there, since the run that was there first cannot
know when one starts beside it. A changed file the run did not claim stays in
its own change; only a file another run's claim names is left out of it. That
leaves a gap: `claim` takes a changed file no other run folder claims, so a
newcomer may claim a file the first run changed without claiming it, such as
a lockfile a build rewrote, and that file then leaves the first run's change.
Once a commit
lands, the run releases the paths that commit named, `release --run-folder
<run folder> <path> ...`, so the run beside it can take a file this run is done
with. A refused claim stops the run: put the file and the refusal to the
person, with the choices the refusal names where it names any. What `claim`
and `release` refuse, and what `check-it` then reads, is `check-it`'s
(*Briefing the fresh agents*).

**Every commit names its paths**, in every run, so a run that never asked takes
none of another's files: the files the commit's change made, which for an
issue's commit are those `check-it`'s `range --paths --run-folder <run folder>`
prints, one per line. Take them first, `paths=$(node <check-it>/scripts/check-it.mjs
range --paths --run-folder <run folder>)`, and where that exits non-zero add and
commit nothing, since `git commit -- ` with no path commits everything staged,
another session's files included; then `git add -- $paths` and `git commit -m
<message> -- $paths`. The listing `range` prints without `--paths` is for
people, and a file under its *Left out* is never the commit's. Where `--paths`
stops on a path the shell or git would not pass whole, name the change's paths
from the listing, each quoted, to `git --literal-pathspecs add -- …` and `git
--literal-pathspecs commit -m <message> -- …`, since quotes stop the shell
splitting a name but not git reading it as a pattern. A file git does not track yet is refused by
`git commit -- <path>` until it is added (git 2.50.1, tried 2026-11-23). Never
`git add -A`, `git commit -a`, or a commit after a wide add. In the main tree,
those paths are then released (*In the same tree*, above).

## One issue, or a cluster

**The tracker decides, not an argument.** Where the issue passed has open
sub-issues, or the path passed is a folder of issue files (the shape
`ki-to-tickets` writes locally), this is a **cluster run**: the issue is the
anchor, and its open children are the work. Otherwise it is one issue, as below.
A title or a label is never read for this. A wrong call is corrected at the
confirm stop: *"only this one"* runs the anchor alone.

A cluster run is the same order once per child, in one session:

- **The order of the children** follows the tracker's blocking edges, read
  with the query the repo's tracker doc names; ties go by issue number. A
  blocker finished earlier in this run counts as done, even though its issue
  stays open until the push.
- **There is one confirm stop, at the start.** `read-it` reads every child
  first, and the stop shows each child's ① and ② in a line, the order, and what
  is left out. It replaces each child's own confirm stop, and only that one.
  Every other stop still stands: the signals below, `check-it`'s returns to a
  person, and a child that **departs from the plan** (its scope, direction or
  naming moved) or **cannot proceed**, meaning still `needs-grill`,
  `ready-for-human` or an open decision, or its scope gone unclear. Stop there;
  do not skip past it. The person's answer resumes the cluster, or ends it with
  `ask-it` over the children already done. A trivial child is marked done.
- **A child with open sub-issues of its own runs as one issue.** Clusters do not
  nest.
- **Each child is committed locally** as it finishes, closing its issue in the
  message. Nothing is pushed and nothing is filed before the end.
- **`ask-it` runs at the end**, over what every child carried. A discovery
  the person calls *needed, now* continues the run, which ends with another
  `ask-it`. The push, and the question of closing the anchor, go through the
  last one.
- **The anchor gets the result**, written back the way `ask-it` writes back to
  an anchor: the root confirmed or falsified, what was measured, and what is
  still open. Whether to close it is asked then. `ki-to-tickets` never closes it,
  and nothing else will. A local folder has no anchor file, so there the result
  goes in the closing report, and each child is closed by its own `Status:` line
  in its local commit.

One session for the whole cluster diverges on purpose from `ki-wayfinder`'s one
ticket per session
([ADR-0088](../docs/adr/0088-thegraph-takes-a-cluster.md)).

## The order

### 1. Call `read-it`

It reads the situation before anything is touched — the issue, the cluster it
belongs to where the tracker has one, the map where the repo keeps one, and always
the real sources plus the hidden state a first-principles model misses. Each of
those is conditional on something it can check rather than weigh.

It comes back with two things: **what it understands**, and **which route**.

### 2. Stop, and have the reading confirmed

**This is the only guaranteed stop**, and everything below is conditional. A
change where no signal fires reaches a person for the first time at the very end,
with the work done and nowhere to have redirected it.

Two statements go to the maintainer — what this issue **is**, in your own words,
and what this change **will do** and deliberately leave alone. `read-it` holds
what each has to carry and what a correction to each one means.

**On a prose or code route, the reading also carries the reviews `check-it` will
run, as one line.** Once ② is written, start `check-it`'s decision model on the
issue and the two statements, with the prompt and the file names `check-it`'s
script prints (`pick-confirm` and `change` in its *Briefing the fresh agents*;
in a cluster with `--child`), wait for its answer, and put its pick, the floor
added, as one line in the question that carries ②, as `check-it`'s *Choosing
the reviews* says, which also says when it runs again. Nothing else about the
reviews is asked, and there is no call of its own. **Before the question goes
`check-it`'s table of each review's runner and model** (*Each review's runner
and model*), as it
stands, with what that section says about changing a row, a runner changed in
the same words as a model.

**At the same stop, write the issue's text for `check-it`**: the issue's body
and its decision comments as the tracker holds them, or an issue file whole,
at the path `check-it`'s script prints for `name issue --sheet <run sheet>`
(in a cluster with `--child`), and pass it to every `check-it` `prompt` and
`run` call as `--issue-file`. Every review then judges against that text, whether or not it
can reach the tracker (`check-it`'s *Briefing the fresh agents*, #146).

**This is not `ask-it`.** That one comes at the end and asks what to *file*; this
one asks whether the reading is right, before anything has run.

**A correction to the first rewinds; nothing has run.** A correction to the second
is the maintainer's call, so it is recorded as theirs.

**And the answer may be that nothing further is needed.** A change that turns out
to be a typo ends here, said out loud. That is a result, not a skipped step.

The answer is checked off on the run sheet as `confirm`, with what it changed
written under it for the next step: the reviews that will run as the person
left them, what the person added or removed in words, the decision model's cost
line, and any review runner or model the person changed. In a cluster, where the step list
is rewritten for each child, the pick is each child's, kept in a `## Reviews`
section without checkboxes, one line per child (`- #38 — reviewer, bug
reviewer, security reviewer, proving agent; removed by the person: lens; reviewer: opus,
xhigh; pick: <time>, <tokens>`, what the person changed, a changed row and
the cost line after semicolons).

### 3. Follow the route

These are `read-it`'s own four labels, returned verbatim.

| Route | What runs |
|---|---|
| **trivial** | nothing. It ended at step 2, said out loud |
| **open decision** — the issue asks for a choice, not an implementation | `lens` over the **options**, in a fresh agent briefed as `check-it` briefs it, then a person |
| **prose**, **code** | `make-it` → `check-it` → `ask-it` |

**The open-decision route is the one that gets missed, and missing it is
expensive.** Run the adversarial read over the options *before* proposing one, or
the enumeration arrives after approval and whoever approved decided on incomplete
information — after which the costs it turns up get demoted into follow-ups. **A
decision is presented with its consequences enumerated, or it is not ready to
present.**

The last two share a row because the conditions live inside the skills. `make-it`
calls `design-it` first for a new screen and `encode-it` for a check-adding change, and skips its test section for a change
that does not run; `check-it` runs fewer checks for prose than for code, and the
reviews the decision model picked at step 2 and at `check-it`'s start, as the
person changed them.

## The signals that do not wait for their turn

**You cannot schedule the moment you will feel one of these.** They arrive with
your hands in the work, and the right response is to act on them there rather
than to note them for later.

| Signal | What to do |
|---|---|
| *"This is a bit odd — I'll just fix it up here"* | **Stop.** The problem is one step further in. Ask whose invariant broke and which layer can hold it correct, then take it to a person — patching may be right, but somebody has to have decided it |
| a test, fixture, golden or guard just written or changed | **Watch it fail first** (`make-it`'s test bar): name the assertion, turn the change off, see it go red, restore |
| about to write a version, a *"supported since"*, or how a library, API, platform or tool behaves **from memory rather than from a read**, to carry over somebody else's claim, or to rely on a summary of a source (another project's approach and a published spec count too) | **Read the source first**: the local copy where there is one (the package cache, `node_modules`, the installed SDK), the web where there is not. `firsthand` holds how, raw and not summarized. **Read what is reachable; mark only what is not**: unconfirmed is a gap, not an absence, and it becomes a question, never a premise |
| a call that is the person's (the list under *What holds everywhere*) | **Ask.** Present the options with their consequences, and stop. A pure technical mechanism is *not* one of these — deciding it is yours, and asking hands the work back |
| the person corrects the run: sets its direction or a result right (an answer that only supplies information the run lacked, a preference given, or a correction to the reading at the confirm stop, which `read-it` already handles, is not one; an answer that sets the direction or a result right is one) | **Look for the same correction written down already**: a rule in `CLAUDE.md` or `AGENTS.md`, `docs/agents/thegraph.md` or a map note's trap or invariant, a closed issue carrying it, or once already in this run. **Found, it is a repeat**: fix it and carry a **check candidate** with where it was written and what a check would hold, since a written rule that did not hold needs a check (`encode-it` builds it once kept). **Not found**: fix it and carry ***record this as a rule*** with where the rule would go and a draft line, since what an instruction file says is the person's, and the next run can only see a repeat that was written down. In a repository you contribute to (ADR-0079), raise neither |
| anything worth a person's attention that you are not acting on | **Carry it** — under `## Carried` on the run sheet, not in mind. It goes out at the end, in one batch |

## What holds everywhere

**Ask the maintainer in Korean.** Every question and confirmation put to a person
is written in Korean.

**What is the person's, and only that, is asked**: naming, structure, scope,
direction, priority, spend, what is written to a tracker or an instruction file,
and acts on the outside world such as a push. This is the one list; every step and signal that
says *ask* means this. Anything else is a technical call: measured, decided, and
reported with what it was decided on.

**Nothing reaches a tracker unasked.** Not through a pull-request body, not
through a code comment — both are buried on merge. One door, at the end, and a
person decides what goes through it.

**What a step makes outside the change, it deletes.** A copy, a build, tool
state, an install, a worktree or a process gets a line in the run's ledger when
it is made and goes when [`clean-it`'s rules](../clean-it/RULES.md) say, its size
written: a step's own items at its end, a worktree the run works in at the run's end, and a build with the tree it is in. A fresh agent's brief names the run folder
and the ledger.

**What can be counted is counted.** Running the command, querying the tracker,
reading the file. Something you find yourself weighing that could have been
checked is something you skipped the check on.

**Report only what you verified.** Every fact in a status report comes from output
that actually appeared: created → list it, committed → log it, pushed → check the
remote. One at a time, never a batch of side effects summarised. When the check
contradicts the claim, **say so before anyone else finds it**.

## Habits

**Derive what the code and the named prior art can answer; ask what only a person
can.** What is the maintainer's is the list under *What holds everywhere*, and
they will correct you. A wire format, an API shape, a coordinate system is
not, and asking about one is offloading. Decide it, check it against real source,
and present the result for a yes or no.

**Then record which of the two it was**, because they fall differently. **A
derivation falls to a better derivation. A judgement falls only to the person who
made it.** A record that does not say which it holds reads as a derivation, and
the next strong argument — often one your own checking produced — reopens a call
somebody already made.

**Record what it was decided *on*.** A call inherits the blind spots of whatever
it was made against. When a later finding contradicts one, the question is not
*may I reopen this* but **could the thing they were shown have revealed this?** If
it could and they chose anyway, it is settled and the finding is context. If it
could not, the call is not settled — it is **untested**, and the honest move is
neither silent deference nor silent escalation but a better artifact. Say which of
the two you are in.

**Watch what a recorded choice did not cover.** What the maintainer judged is what
they were shown, and a decision about one thing does not settle its neighbours
because the same change happened to produce them. Write down what it did not
cover, or the next pass reads the neighbours as decided.

**Build an artifact to answer the decision, not to carry the argument.** A
prototype scoped to the point you are making produces a decision about the
prototype. Widen it until it can show the cost of being wrong — the neighbours,
the sibling states, the other paths through the same rule — because that is the
part nobody can ask you for: they do not know what you left out of frame.

**First principles and named prior art together.** Convergence between the two is
the signal that a decision is not arbitrary, and prior art shaves details a
first-principles model under-reaches. Where they disagree, **this project's own
measurement wins and an unmeasured preference does not** — and where a decision
record has already settled that particular clash, follow it while nothing outside
what it was decided on has come up; a fact outside that is neither followed nor
overridden but taken to the maintainer to reopen. *"Perfect"*
is not *"maximally granular"*; it is the right grain.

**Size the thinking, and never let it buy the proof.** Raise it for ambiguity,
long chains of reasoning, an adversarial self-check; lower it for a bounded task
against a settled contract. **No amount of it replaces a gate, a round trip, or a
mutation that reddens.**

**Conformance is cumulative.** Full compliance with a large method is not written
in one pass — start from the common case and grow the tail as real use breaks new
ones. Get the skeleton right from the start.
