---
name: clean-it
disable-model-invocation: true
description: "Find what agent runs left on the disk, show the sizes, and delete only what the person confirms. Holds RULES.md, the cleanup rules every skill that makes copies, builds or tool state follows. /clean-it."
---

# clean-it — find what runs left behind, and delete what the person confirms

[RULES.md](RULES.md) is how a step deletes what it made. This is what a person
runs when the disk fills anyway: it **measures known places only**, shows what
it found with sizes, and deletes nothing until the person confirms
([ADR-0103](../docs/adr/0103-what-a-step-makes-it-deletes.md)).

**It never sweeps the disk.** No `find /`, no `du` over the whole of the OS
temp folder: every path below is a fixed place or a fixed glob, and a size is
measured only for a path already named.

## 1. Find

Each group is measured with `du -sh` on the paths it names, in parallel.

**Can be deleted, after the person confirms:**

- **Ledger leftovers.** Every ledger, at the places [RULES.md](RULES.md) puts
  one: `<OS temp>/thegraph/*.made.md`, `<OS temp>/made-*/made.md`, and for Claude
  Code `<scratchpad root>/*/*/scratchpad/made/made.md`, its lines read together
  by path as RULES.md says. Each item still open in it: its path, what it is,
  who made it and when (the file's date). A kept item is listed apart and never
  offered.
- **Run folders**: `<OS temp>/thegraph/*.made/`, `<OS temp>/made-*/` and
  `<scratchpad root>/*/*/scratchpad/made/`, each read through its ledger.
- **Folders with an owner marker**: `<OS temp>/*/.made`, the marker's line read
  for who made it.
- **Stale worktrees**, in every repository a ledger names and in the working
  directory's: `git worktree list --porcelain`, each entry marked `prunable`, or
  whose path is in the OS temp folder, under `<repository>.worktrees/` beside
  it, or in a ledger line. Its `git status --short`
  is read too, since `remove` refuses one with changes.
- **Processes**, listed, from the ledgers' open process lines whose pid is still
  alive with the same command line.

The **scratchpad root** is read from the scratchpad directory the harness gives
this session, `<scratchpad root>/<project>/<session>/scratchpad`, with those last
three parts taken off. It is not a fixed folder under the OS temp folder: on
macOS a session's scratchpad was under `/private/tmp/claude-<uid>/` while the OS
temp folder (`$TMPDIR`) was under `/var/folders/`. Where the harness gives this
session no scratchpad, the Claude Code places are not looked in, and the report
says so.

**A run that may still be live is marked, and left out of *all of it***: its
run sheet still exists (a `thegraph` run deletes it at its end), a process of
its ledger is still alive, a `thegraph-herdr` worker of its run is live in
`hc`, or it is this session's own run folder. A run folder outside a
`thegraph` run has no sheet to tell, so every one is marked. A run that died
leaves its sheet too, so a marked run is asked about one by one, never skipped.

**Sizes only, never deleted here:**

- `target/` in each repository a ledger names, in the working directory's, and
  one level down from the working directory's parent (`<parent>/*/target`).
- Shared build folders left from before #142, which no run uses or deletes now:
  `<repository>.build/` beside each repository a ledger names and the working
  directory's, and `<parent>/*.build`.
- Caches: `~/.cargo/registry` and `~/.cargo/git`, the pub cache
  (`%LOCALAPPDATA%\Pub\Cache` on Windows, `~/.pub-cache` elsewhere, or
  `PUB_CACHE`), `~/.gradle/caches` (or `GRADLE_USER_HOME`).
- `~/.claude`.
- WSL: each distribution's `ext4.vhdx` under the `BasePath` that
  `HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss\*` names (strip a
  leading `\\?\`). A fixed path misses a distribution installed elsewhere, such
  as podman's.
- `~/Downloads`.

A place that does not exist on this machine is left out, not reported as zero.

## 2. Show

One table per group, largest first: path, size, what it is, who made it and when,
and for a worktree whether it has changes. Under it, the total each group could
free and the drive's free space (`df -h` on it). The sizes-only groups carry a
line saying what would free them and that this skill does not (`cargo clean` in
that repository, deleting a leftover shared build folder, `flutter pub cache clean`, `wsl --manage <distro> --set-sparse
true`), each a call for the person.

## 3. Confirm

Ask with the question tool, one group at a time, the largest first: all of it,
some of it (name which), or none. A worktree with changes, and a process, are
asked one by one. Nothing is deleted on silence.

## 4. Delete, and say what it freed

Delete what was confirmed as [RULES.md](RULES.md) says: a worktree with `git
worktree remove` then `git worktree prune`, a process by its pid only where its
command line still holds the path, everything else with `rm -rf` on the exact
path. Append a line `<path> | deleted, <size>` to the ledger for each item it
settled, never editing the item's own line, and delete a ledger with no item
left open, its kept items named with their paths in the report. A path that would not go (a file held open) is
reported with why.

Report what was freed, per group and in total, with the drive's free space
before and after, and what was left and why.
