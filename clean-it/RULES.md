# What a step makes, and when it goes

The one copy of the cleanup rules. Every skill in this catalog that makes
something heavy points here instead of restating them
([ADR-0103](../docs/adr/0103-what-a-step-makes-it-deletes.md)). `clean-it` is
what a person runs to find what these rules missed.

## What counts

Anything a step makes outside the change itself that would still be on the disk
when the step ends:

- **copy**: a repository copied or cloned for a review, a probe, a baseline or a
  consumer build;
- **build**: a toolchain's output (`target/`, `build/`, `.dart_tool/`,
  `dist/`) anywhere outside the working tree's own;
- **tool state**: what a tool writes for itself while it runs, such as TLC's
  metadata folder, or what a lane run writes that the repository does not keep,
  such as a fuzz run's new corpus entries and artifacts;
- **install**: dependencies installed into a copy (`node_modules`, a venv,
  `pub get` in a copy);
- **tool**: a tool downloaded to run once;
- **worktree**: `git worktree add`;
- **process**: anything started that outlives the command that started it, such
  as a dev server or a watcher.

A report, a run sheet and the files named after it are not in this list: their
own skills say when they go.

## The run folder

Everything a step makes goes under one folder, the **run folder**, so that one
path finds it, deletes it, and names the processes that belong to it:

- in a `thegraph` run, `<run sheet>.made/` beside the run sheet;
- in a `thegraph-herdr` run, the conductor's, which each worker's brief names,
  so every worker's items are under one path;
- otherwise `made/` in the session's scratchpad where the harness gives one, or
  else a folder `made-<yyyymmdd-hhmm>-<8 random hex>` in the OS temp folder. The
  scratchpad's other files are not the run folder's.

**It is made when the run starts**, by whoever writes the run sheet, or by the
step that starts the run where there is none: `check-it`'s script stops where
it is not a folder.

**Each step works in a folder of its own inside it**, `<run folder>/<step>/`
(`<run folder>/lens/`, `<run folder>/proving/`), since steps run at the same
time. **The run folder itself is no step's item**: a step deletes its own folder,
never the run folder, which goes only at the run's end.

A folder a step has to make directly in the OS temp folder, because a tool
insists, holds an **owner marker**: a file `.made` at its top holding its
ledger line. `clean-it` finds such a folder by that file and by nothing else.

## The ledger

**A step that makes something writes its line when it makes it**, not when it
deletes it: a step that is stopped half way leaves a line that says what to
look for.

```
<path> | <who: session, run, step> | <what: copy/build/tool state/install/tool/worktree/process> | <when deleted: step end/run end/kept>
```

- In a `thegraph` run the file is `<run sheet>.made.md` (the conductor's in a
  `thegraph-herdr` run); otherwise `made.md` in the run folder.
- A process's `<path>` is its pid and the command line it was started with.
- **A deleted item keeps its line**, with `| deleted, <size>` appended, the size
  measured with `du -sh` just before deleting. The line is the record of what was
  freed; a line with no `deleted` is what is still on the disk.
- **`kept` is only for something a person asked to keep**, and the line says
  who. The item is moved out of the run folder, to where the person says, and
  its line gets the new path, so the run's end does not take it.

## When it goes

**At the end of the step that made it**, with its size written. A step's end is
before it reports: a review copy goes before the review's report is saved, a
probe before its number is written down.

**At the run's end** go a worktree the run worked in and the run folder itself,
after every line still open has been deleted or marked `kept`. The closing
report names the total freed and each kept item with its path. Then the ledger
goes, with the run sheet in a `thegraph` run and with the run folder otherwise;
a ledger found later is a run that did not end.

**The run's end** is where `thegraph` and `thegraph-herdr` end a run. A run
started over or moved ends its earlier attempt, apart from its worktree and
branch, which the new run takes over with the worktree's ledger line, moved to
the new ledger and not marked deleted. That attempt's record and claim are
carried first and its live workers ended, as `thegraph`'s run sheet section
says, then its run folder goes whole.
`thegraph`'s *that run is over* ends another run, by these rules. Outside
them it is the session's end, which nothing marks, so it is read as the moment
the agent hands the finished task back to the person, in its final report. A
session closed before that leaves its ledger for `clean-it`.

### Builds

**A build goes inside the tree it builds, and is deleted with that tree**
(#142). Each tree then has one build folder of its own, so one tree is never
served another's binaries: two reviewers building different trees into one
shared folder overwrote one test executable's name, and one of them ran a
binary built before the change (reported on #142 by a worker, not reproduced).

- **The main tree** builds into its own output (`target/`, `build/`,
  `.dart_tool/`), which is the repository's, not an item, and no run deletes.
- **A run's worktree** builds inside the worktree; the build goes when the
  worktree is removed at the run's end (*Worktrees*, below).
- **A copy a step makes**, a reviewer's or the proving agent's included, builds
  inside the copy, and the build goes with the copy at the step's end.

No `CARGO_TARGET_DIR`, `--target-dir` or `build.target-dir` (read from
`cargo help build`, Cargo 1.96.0), and no other toolchain's setting for its
build folder, points a build at a folder another tree builds into. A
build a step starts runs with such a variable unset where the environment
sets one: set to an empty string, `CARGO_TARGET_DIR` stops Cargo 1.96.0 with
*the target directory is set to an empty string* (exit 101, tried 2026-11-24). The costs accepted on #142: several copies
building at once peak at about 2–3 GB, from 300–600 MB per copy; each copy
builds in full, minutes for Rust; and a crashed run's builds stay until
`clean-it` finds its ledger lines.

### Tool state

Tool state goes to a set place under the step's folder and is deleted with the
step. For TLC, read from `tla2tools.jar` v1.7.4 (the version the retired `statechart` pinned)
with Java 17, and run on 2026-11-20:

- Without `-metadir`, TLC writes `states/` beside the spec. **Each run leaves a
  timestamped folder there, a run that passed included.**
- `-metadir <path>` moves it: TLC makes the timestamped folder inside `<path>`.
  Pass a folder under the step's folder, and delete it after the run.
- `-cleanup` deletes the earlier runs' folders when a run starts and leaves the
  current one, so it does not replace deleting.
- TLC reads the standard modules (`Naturals.tla` and the like) from
  `java.io.tmpdir` while it runs; the folder was empty after a run that passed.
  Passing `-Djava.io.tmpdir=<folder>` moves that, and **the folder must exist
  first**: a missing one stops TLC with `Cannot find source file for module
  Naturals` (exit 150).
- The JVM's `hsperfdata_<user>` folder does not follow `java.io.tmpdir`. On
  Windows it follows `TMP` and `TEMP`; `-XX:-UsePerfData` stops the JVM writing
  it at all. Where it goes on POSIX was not checked.

### Worktrees

A worktree a step makes goes under the step's folder. A run's own worktree,
where it runs alongside another run on its repository, goes beside the
repository on its drive, at `<repository>.worktrees/<run id>/`, and is removed
at the run's end, then its branch, as `thegraph` says (*A run alongside
another*); `<repository>.worktrees/` goes with its last worktree. Remove it with `git worktree remove
<path>`, then `git worktree prune`. `remove` refuses a worktree with untracked
files or changes (git 2.50.1's manual); that refusal is read before anything
else: what is in it is either this step's, and goes, or not, and is reported.
`--force` only after that reading.

### Processes

**Kill only a process whose command line holds the run folder's path**, and
list any other the step may have started instead of killing it: a process
found by name alone may be the person's.

- Windows: `Get-CimInstance Win32_Process`, its `CommandLine` matched against
  the path in both forms, `C:\...` and `C:/...`, since a command line can mix
  them; then `Stop-Process -Id`.
- POSIX: `ps -eo pid=,args=`, matched with `grep -F`; then `kill`.

## Where nothing is written

Nothing above is written into a repository. A step that cannot delete what it
made (a file held open, a permission) leaves the line open and says so in its
report, with the path.
