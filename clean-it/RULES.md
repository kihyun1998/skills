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

**The run's end** is where `thegraph` and `thegraph-herdr` end a run. Outside
them it is the session's end, which nothing marks, so it is read as the moment
the agent hands the finished task back to the person, in its final report. A
session closed before that leaves its ledger for `clean-it`.

### Builds

**One build folder per repository, shared across runs**, beside the repository
on its drive: `<repository>.build/` (for this catalog `D:\github\skills.build\`).
Every run, copy and worktree of that repository builds into it, so a review
copy does not build the dependencies again, and two runs building at once wait
on the toolchain's lock instead of making a second copy (#136). Two Cargo builds
pointed at one folder were seen to wait: the second printed *Blocking waiting
for file lock on build directory* and built once the first was done (Cargo
1.96.0, tried 2026-11-23). **It is kept**: no run deletes it and no ledger
lists it, `clean-it` reports its size, and deleting it is the person's. A
process that cannot be told this in words, such as a build a script starts,
gets it through its environment, and the step that starts it writes the ledger
line for anything else it points the process at.

- **Rust**: set `CARGO_TARGET_DIR` to it (Cargo also reads `--target-dir` and
  `build.target-dir`; read from `cargo help build`, Cargo 1.96.0).
- **Other toolchains**, where they have a setting for the build or cache folder,
  use it the same way.
- **Where the toolchain has none**, keep one copy of the repository per run and
  build in it again, rather than a new copy per probe. Flutter has no flag that
  moves `build/` (checked in `flutter build apk --help`, Flutter 3.41.9).

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
