# ADR-0101 — Herdr-app mods live in `herdr-mods/`, and `session-restore` is the first

**Status:** accepted.

`herdr-mods/` is a new top-level folder for **Herdr-app mods**: JavaScript panels the
Herdr app loads from `~/.config/herdr-app/mods/`, and the layouts that place them.
They are not skills, and not Claude Code mods (`mods/`), which the install script
turns into `.claude-plugin/marketplace.json`. `scripts/install-herdr-mods.sh` links
them into the app's home. The first one is `session-restore`: it saves which Claude
session each terminal holds and, after a reboot or a core restart, reopens them in
place (issue #60).

## The calls, and whose they were

The maintainer's, on 2026-11-17, in issue #60: the body, the grilling (Q1–Q10) and
two answers given while it was built.

- **It is a Herdr mod, not a skill.** A skill needs a Claude session to run, and a
  Claude started from inside Claude saves no transcript (measured in #60).
- **The surface is A′4.** A third entry, Sessions, in the Files/Changes panel stack,
  opened from the tab bar. It was chosen from a prototype of seven variants. The
  rows are in the shipped `agents` list style, grouped by space, with working ones
  first. A space header carries `Open · N`, a group with nothing to open has no
  button, and one "Open all" sits at the bottom. A dot on the Sessions button shows
  amber when there is something to restore and red when the save has stalled.
- **Location and install (Q1, Q4, Q7).** `herdr-mods/` and its own install script,
  linking with a junction on Windows as `install-skills.sh` does. The script never
  switches layouts. It prints `herdr-app do layout.switch --name session-restore`.
- **Clones in the repo (Q2, Q8).** The shipped `tabs` mod and `main` layout are
  copied into the repo and edited there. Herdr never updates a clone, so the
  install script and the panel both warn when Herdr's version differs from the one
  a clone was copied from.
- **One mod folder, not a separate tabs clone folder** (answered during the
  build). Herdr refuses an import from outside a mod's folder (measured, below), so
  a tabs clone in its own folder could not call the save. `session-restore/` draws
  both parts. With `props: {part: "tabs"}` it draws the tab bar: `tabs.js` is the
  shipped `tabs/main.js`, copied and edited. Otherwise it draws the Sessions panel.
  Clone versions are in `session-restore/clones.json`, not in a `mod.json`
  `cloned_from`.
- **The save is what is alive now; the restore list is the previous run's last
  save** (answered during the build). It replaces the issue's drop rule. That rule
  took an entry out of the save when its pid file disappeared while the run watched
  it, so that `/exit` (which deletes the file) and a forced kill (which leaves it)
  would read differently. The rule was decided on the measurement that a forced
  kill leaves the file. It does, but another Claude sweeps the file 15 to 75
  seconds later (measured, below), so a crash could read as `/exit`. Now:
  - each minute the save's `current` is replaced by the Claude sessions alive at
    that moment. The pid file is used only to map a live terminal to its session
    id and folder. A session with no conversation is left out (issue #63): no
    `~/.claude/projects/*/<id>.jsonl` exists yet.
  - when the core holder (`hc server status` `holder.instance`) differs from the
    save's, the previous `current` is set aside into `restore`. That happens after
    a reboot or a core restart.
  - a `restore` entry stays until it is open again (live in `current`) or removed
    by hand.

  Accepted with it: a session that crashes while Herdr runs is not offered for
  restore, and there is no guard against a save that shrank during shutdown.
- **A worker is never opened alone.** Opening a worker opens its conductor first,
  and the worker is started with `--parent` the conductor's new address. A worker
  whose conductor is not in the restore list shows "conductor not in the list" and
  cannot be opened.
- **The task prompt is never resumed.** A `thegraph-herdr` worker's argv ends in
  its first task. The save keeps the flags (`--model`, `--effort`, the permission
  flag, and the rest) and drops the trailing prompt. Derived: it also drops the flags
  that pick a session (`--resume`, `--continue`, `--session-id`, …) and those that
  would make a new place for it (`--worktree`, `--tmux`, `--desktop`,
  `--environment`).
- **The tab bar runs the save (Q3).** It runs every minute and on the
  `session-restore.save` command. A mod copy starts the first time it shows, and
  the panel is closed most of the time. When Herdr starts (Q6: "at start"), the tab
  bar's first successful save opens the panel once if there is something to restore
  and the panel has not opened itself on that core holder yet. A core restart with
  the window open does not open it; the dot shows amber.
- **Storage (Q5).** The whole save is in `~/.config/herdr-app/data/session-restore.json`.
  `shared("session-restore")` holds only the summary the dot and the panel need,
  and it is set only when the summary changes, because `setShared` redraws every
  mod.
- **A missing place (Q9).** With the tab gone, the session opens in a new tab in its
  space. With the space gone, it opens in a new space under the saved name.

## Derived

- **What is tested where.** `logic.js`, `save.js` and `open.js` import nothing
  from Herdr. Their side effects go through an injected `io`, so
  `node --test herdr-mods/session-restore/tests` runs them against a fake `hc` and
  file system. `main.js`, `tabs.js`, `panel.js` and `io.js` use the `herdr` module
  and are covered by `herdr-app check`, which draws only the first render.
- **A missing place uses Herdr's own adoption.** A new terminal gets the saved
  `herdr.space` and `herdr.tab` labels. Herdr makes a space or tab for an id it
  does not know (`AGENTS.md`, The model). A rename follows once the new space or
  tab shows, if it had a name somebody gave it.
- **An opened session is confirmed, not assumed.** `hc run` succeeding means
  little: a resume with no conversation behind it writes its pid file and exits a
  moment later. A session counts as opened only when the terminal's Claude has held
  the saved id for 2 seconds. Otherwise the row fails, with the last line Claude
  printed.
- **Worker means the parent terminal is a saved Claude** (`parentSession`), not
  that `parent` is set. A Claude started with `hc run` from a plain shell has a
  parent, and is not a worker. A chain (a worker that started its own) opens from
  the top, each link under the one above it; a link whose conductor cannot open
  cannot open either.
- **A line typed into PowerShell uses `--%`.** When a word needs quoting, the line
  is `claude --% …` with each word quoted as a Windows program reads its command
  line. PowerShell 5.1 drops the double quotes of a single-quoted native argument,
  and passes what follows `--%` unparsed (measured, below). cmd gets the same
  quoting; a POSIX shell gets single quotes. `%NAME%` in a value is still expanded
  by cmd and after `--%`.
- **A worker whose conductor is open now can be opened.** The conductor is not in
  the restore list then, but it is live, so the worker gets its address as
  `--parent` and is not alone. This reading of "not in the restore list" is the
  worker's, not the maintainer's.
- **The clone version is Herdr's app version.** `clones.json` records `0.1.16`,
  compared with `herdr-app --version` and `updates().app.version`. The installed
  binary holds a `ClonedFrom {name, version}` and the string `0.1.16` beside
  `mod.json`; no clone was made to read one. So every Herdr update warns, even one
  that leaves `tabs` and `main` as they were.
- **A layout is linked as a file symlink**, which needs Developer Mode on Windows,
  as the instructions file in `install-skills.sh` does.

## Measured

On 2026-11-17, Windows, Herdr 0.1.16, hc 0.1.21, Claude Code 2.1.326. The `hc` runs
were in a scratch `HC_SESSION` started with every `CLAUDE*` variable and
`HC_TERMINAL_ID` removed, and driven through the repo's `save.js` and `open.js`.

- `herdr-app check` refuses `import "../session-restore/io.js"` with "resolves
  outside the application directory". A junction inside the mod folder that points
  at a sibling is refused the same way. A mod folder that is itself a junction
  loads its own `./` imports.
- A force-killed Claude's pid file was still there at 0, 0.3, 1, 2, 4, 8 and 15
  seconds, and gone at 75. Four other dead-process pid files from the same run
  were gone within minutes, and one was gone at 6 seconds.
- `hc server stop` / `start` (a new `holder.instance`): a conductor and its worker
  came back as `powershell.exe`. The save moved both into `restore`. Open sent
  `claude --resume <id> --model haiku --effort low` into each shell. The new pid
  files held the saved ids, the worker still had its conductor as `parent`, and the
  next save had both back in `current` and `restore` empty.
- Claude as the terminal's own program, conductor force-killed: the conductor
  ended `finished/exited` and the worker `finished/killed`. Open started the
  conductor in a new terminal with `--no-parent` and its saved name, and the
  worker with `--parent` the new address. `hc run --bg --json` answers with
  `address`.
- PowerShell 5.1 (`powershell.exe`; this machine has no `pwsh`): `node argv.js
  '{"a":1}' 'say "hi"'` delivered `{a:1}` and `say hi`. The line `shellLine` builds
  with `--%` delivered `{"a":1}`, `say "hi" C:\dir\`, `it's`, `a b` and `tail\` exactly.
- A Claude started and left without a message (Claude Code 2.1.326, scratch core) had
  its pid file and no `<id>.jsonl` under any `~/.claude/projects/*`. All 25 live
  sessions' transcripts were at `<folder>/<id>.jsonl`, `<folder>` being the pid
  file's `cwd` with every non-alphanumeric character as `-` (`acra_client` →
  `acra-client`). Claude's own code (`claude.exe`) cuts a name longer than 200
  characters and adds `-` and a hash of the folder. So the folder named from `cwd`
  is only where the save looks first; any folder holding `<id>.jsonl` counts. Listing
  all 88 folders here took 14 to 16 ms in Node (0.37 to 0.67 s in an earlier run on a
  busier machine). The save does it at most once per save, and only when a transcript
  is not where `cwd` names, which is every minute while a Claude with no message is
  open. A session whose transcript cannot be looked for (a refused or failed read) is
  saved as before and counted as `unchecked`: the dot turns red, the panel says how
  many, and the save goes on (the maintainer's call, 2026-11-17, over failing the whole
  save or reusing the unreadable count, whose panel line names pid files).
- `claude --resume` of a session that never got a message prints "No conversation
  found with session ID: …" and exits. Confirm reported it as failed with that
  line, and a session with a conversation as opened in about 3 seconds.

## Not measured

- Whether the live window lets the save's `fs/promises` `exists` and `readdir`
  read `~/.claude/projects`. Herdr's `AGENTS.md` says mods read anywhere in home;
  `herdr-app check` grants no `fs` read at all (measured), so a check cannot show
  it. After the edit the live save ran each minute with no error, but whether that
  copy had reloaded the new `save.js` is not known. A refusal would keep
  every session as before issue #63, counted as `unchecked`.

- The live window. Whether Herdr reads a symlinked layout file, adopts the labels
  into panes, applies the renames, and draws the panel and the dot as the checks
  only describe them. That check is after the build, at a time the maintainer
  picks (Q10).
- Whether a mod's `exec`/`hc` environment carries `CLAUDE_CODE_CHILD_SESSION`.
  Inside Herdr, it would start Claudes that save no transcript.
- What a real reboot leaves: shells (case A) or finished terminals (case C). Open
  handles both.
- Switching sessions with `/resume` inside a session.

## What the calls did not cover

- Only the tab bar saves, and only while its layout shows in an open window. With
  the window closed and the core running, sessions started after the last save are
  not in it when a reboot comes.
- A worker reopened under a new conductor address keeps the old address in its own
  conversation (a `thegraph-herdr` brief names the conductor's terminal), so its
  reports go to the old address. In place (a kept terminal coming back as a shell)
  the address does not change.

- A session that is not in any Herdr space is saved and opened without labels, so
  it does not show in the window.
- Remote machines' sessions are not saved: the save reads this computer's
  `~/.claude/sessions`.
