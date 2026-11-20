# Upstream

This folder started as a verbatim copy of `pstack/skills/statechart` from
https://github.com/cursor/plugins at commit
`e1cc03121a0e71129a4fb730d7c5528a0a3e43c8` (2026-11-16 22:18 -0800),
copied on 2026-11-20. Every file except this one and `LICENSE` was byte-identical to
that commit when copied, and each file changed since is listed below; `LICENSE` is `pstack/LICENSE` from the same commit (MIT, Lauren Tan).

It is the starting point for this repository's own version
(kihyun1998/skills#78). Once a file here is changed, say what changed and why below,
so the copy can still be compared with upstream.

To see what upstream changed since:

```sh
git clone --filter=blob:none --no-checkout https://github.com/cursor/plugins.git pstack
git -C pstack log --oneline e1cc031..origin/main -- pstack/skills/statechart
```

## Changes from upstream

Each for kihyun1998/skills#100. In the #78 trial an agent could not run this
skill, and the scripts had never run on native Windows.

- `SKILL.md`: `disable-model-invocation: true` dropped, so the model, and the
  verify skill `create-formal-verification-skill` generates, can invoke it. The
  Description's `Use for /statechart` became a Use-when clause, the shape
  `docs/skill-authoring.md` holds a model-invoked Description to.
- `SKILL.md` *Run*: how to run without mise (`TLA2TOOLS` and `JAVA`, which
  `scripts/run.ts` `findTlc` already read), and how to run on Windows: the
  launcher from Git Bash, or `node` on the versions the launcher checks for.
- `scripts/run.ts`: `fileLines` and `outputLines` drop the CR of a CRLF line
  end, on every platform. Java on Windows ends TLC's lines with CRLF, and the
  message patterns in `frontends/messages.ts` are anchored with `$`, so no rule
  that broke was found. TLC on POSIX prints no CR, so there it changes nothing.
  `outputLines` is exported for its test.
- `scripts/run.ts`: `killGroup` uses `taskkill /T /F` on Windows, where there
  is no `/bin/sh` and no process group.
- `scripts/statechart.ts` and `scripts/janitor.ts` (new): on Windows the
  janitor is `janitor.ts`, run by the same runtime as the worker, in place of
  the `/bin/sh` one-liner. It waits for its stdin to close, kills the worker's
  tree, and removes the stage and temporary folders, retrying while a killed
  java still holds its files (Windows refuses to remove an open file; `rm -rf`
  on POSIX does not). The command's own removals of those folders retry the
  same way.
- `scripts/statechart.ts`: on Windows the command ends the worker with
  `worker.kill()`, by its process handle, not `killGroup` by its pid. The pid
  of a worker that has exited can belong to another process by then, and the
  worker's java ends with the worker anyway: Node puts a non-detached Windows
  child in a job that ends with its parent (measured: a worker killed without
  `/T` left no java).
- `scripts/statechart.ts`: on Windows the worker also gets `TEMP` and `TMP`,
  since Node's `os.tmpdir()` reads those there and not `TMPDIR`. Without them a
  killed command left its working folder in `%TEMP%`.
- `scripts/statechart.ts`: on Windows an existing empty `--out` folder is
  removed before the finished folder is renamed onto it, since Windows refuses a
  rename onto any existing folder (`EPERM`), where POSIX replaces an empty one.
  A folder that is not empty fails the removal with `ENOTEMPTY` and gets
  upstream's message.
- Every process the scripts and their tests start passes `windowsHide: true`:
  each `spawn`, `spawnSync`, `execFile` and `execFileSync` in `scripts/` and
  `scripts/test/`. On Windows a detached process has no console, so each console
  program it starts (java, mise) opened a visible window: four for one check of
  `test/corpus/DieHard`, measured, and none with the option. POSIX ignores it.
- `scripts/test/lines.test.ts`, `kill.test.ts`, `janitor.test.ts` and
  `out.test.ts` (new): the tests for the changes above. They run on POSIX too.

Each below is a follow-up of kihyun1998/skills#100, for defects found in the
changes above and in code they now run on Windows.

- `scripts/statechart.ts` and `scripts/janitor.ts`: once the worker exits, the
  command writes the line `exited` to the janitor's stdin, and the janitor then
  removes the folders without killing anything. Before, a removal that threw in the
  command's `finally` skipped the janitor's kill, and the janitor then ran
  `taskkill /T /F` on the dead worker's pid, which another process may hold by
  then. The `/bin/sh` janitor honours the line the same way, since a killed
  process group's id can come back too. The command ignores an error on that
  pipe, since a janitor that has died already has nothing left to be told.
- `scripts/statechart.ts`: on Windows, when the rename onto the emptied `--out`
  folder still fails with `EPERM` (an antivirus or indexer holding a file just
  written), the command retries it for up to 2 s, then puts the empty folder
  back and says that the folder could not take the output. Before, the user's
  folder was gone and a raw `EPERM` came out.
- `scripts/statechart.ts`: the worker exits 0 or 1 only after it has moved its
  output into place, so a worker that exits 0 or 1 without its output was killed
  from outside, and the command now says so. On Windows a killed process
  exits with code 1 and no signal, so the command exited 2 with nothing on
  stderr. The usage text's exit codes say "something kills the check" in place
  of "a signal kills the check".
- `scripts/statechart.ts`: a removal of the stage or temporary folder that
  fails after the check has ended no longer turns exit 0 or 1 into exit 2. The
  command leaves the janitor running, and the janitor removes the folders once
  the command exits. Before, the command printed the report and "Wrote …", then
  the removal's error, and exited 2. The usage text's exit codes say so, and
  name an output folder that cannot take the output among the causes of exit 2.
  Where the removal fails before the janitor has started (the temporary folder
  could not be made), no janitor will finish it, so the command adds a line
  naming each folder it left.
- `scripts/statechart.ts`: on Windows, the `EPERM` retry also covers the first
  rename onto a new `--out` folder. Before, it covered only an existing empty
  folder, and a new folder got a raw `EPERM` with nothing retried.
- `scripts/run.ts`: `killGroup` resolves when `taskkill` or `/bin/sh` cannot
  start, instead of leaving the `error` unhandled. On Windows with no
  `taskkill` on `PATH`, the janitor crashed on that error and left the stage
  and temporary folders behind.
- `scripts/test/windows-hide.test.ts` (new): reads the source of every `.ts`
  file in `scripts/` and `scripts/test/`, and fails on any `spawn`,
  `spawnSync`, `execFile` or `execFileSync` call whose arguments do not hold
  `windowsHide: true`, the rule in the bullet above on `windowsHide`.

Apart from the CR drop, and from the follow-ups of #100 that run there too (the
`/bin/sh` janitor honouring `exited`, the message for a check that exits 0 or
1 without its output, `killGroup` resolving when `/bin/sh` cannot start, and a
removal that fails after the check keeping exit 0 or 1),
the scripts behave on POSIX as upstream's.
Upstream's own `cli.test.ts`, `corpus.test.ts`, `tlc-out.test.ts` and
`render.test.ts` still assume POSIX (a `.ts` launched as `JAVA` by its
shebang, shell-script fakes, negative pids, `npm` spawned without a shell), so
they do not run on Windows. The tests that do run there are `lines`, `kill`,
`janitor`, `out`, `messages`, `pipeline`, `chart`, `plain-tlc`, `config-fuzz`,
`differential` and `windows-hide`.
