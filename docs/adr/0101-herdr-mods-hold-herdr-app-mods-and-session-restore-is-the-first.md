# ADR-0101 — Herdr-app mods live in `herdr-mods/`, and `session-restore` is the first

**Status:** accepted.

> **Amended 2026-11-17 (issue #65): the clones are gone.** `session-restore` no longer
> ships copies of Herdr's `tabs` mod and `main` layout. It is a chip, a kept Herdr
> window on the person's own layout, that runs the save and unfolds the Sessions panel
> above itself. The calls below about the tab bar, the Sessions entry in the panel stack,
> the clones, `clones.json`, the drift warning and the linked layout are history; the
> amendment at the end holds what replaced each.

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

  > **Amended 2026-11-18 (issue #69).** A row whose terminal is still live with no
  > session confirmed after 20 seconds no longer reads as an ordinary failure. Its reason is
  > "still starting at tN, not confirmed within 20 s", apart from the terminal ending or
  > Claude ending at once, and the panel keeps that terminal's address on the failed row, so
  > the next open looks at that terminal first and does not start a second one there.
  > "Amendment (issue #69)" at the end holds the rest.
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

## Amendment (issue #65): a kept chip replaces the clones

The maintainer's, on 2026-11-17, in issue #65 and prototype D1: no Herdr file is copied
into the repo. The clones made the person switch to the `session-restore` layout for any
save to happen, never took Herdr's updates (the tab bar was a 193-line copy kept to add
one button, and the drift warning fired on every release), and Herdr wrote into the repo
when it docked a new mod into the linked layout (seen twice on 2026-11-17).

- **One mod, one face that unfolds.** `session-restore` is a Herdr `window` overlay with
  a fixed `key` and `keep: true` in its `mod.json`, opened once with `mod.open
  session-restore` on the person's `main` layout. Herdr reopens it on every start and
  every time that layout shows. It draws a chip: a dot and a label from `chipState()`, a
  pure function of the save summary and the open under way. Pressed, the same copy draws
  the A′4 panel above the chip; pressed again, it folds it. The panel's inside is A′4 as
  decided above, with one line changed: the stalled hint names the chip, not the tab bar.
- **The chip runs the save.** The tab bar's tick is `startSaving()` in `save.js`, over the
  same `io` as `saveOnce`: once at start, every minute and on the `save` command, one at
  a time. The first successful save on a core holder the panel has not unfolded itself
  on marks it shown and unfolds the panel when something can be restored. The save rule,
  the restore list, the transcript check and the open path are unchanged.
- **No close button.** `mod.open` again closes the chip and its kept entry. The chip also
  takes a `close` command (`session-restore.close` from `keys.json` or `herdr-app do`), which closes it with
  `closeOverlay`; a kept window closed that way stays closed (herdr.d.ts).
- **Removed:** the tabs clone, the layout clone, `clones.json`, the window-button icons
  copied with the tab bar, the install script's layout linking and its drift check. The
  install script links the mod folder, prunes the leftover `session-restore` layout link
  as a link whose source is gone, and prints how to open the chip once.

  > **Amended 2026-11-18 (#81).** The install script now opens the chip itself when
  > `herdr-app status` shows `main` without the chip in its `overlays` and `windows.json`
  > has no `kept.main.session-restore`;
  > in every other case it says why and prints the command, as above. It still never
  > switches layouts.

### Derived

- **The panel unfolds through gpui-base `Popup`**, anchored by its bottom-right corner to
  the chip. A Herdr window is placed by its top left and is as big as its content
  (herdr.d.ts `OverlaySpec`), so a window that grew to hold the panel would grow down and
  right, away from a chip in the bottom corner. `Popup` paints its content in a layer
  above the window and clamps it inside (gpui-kit.d.ts).
- **The chip opens in the middle the first time.** `OverlaySpec.at` takes a point or the
  pointer, and `window()` gives no size, so a mod cannot name a corner. The `key`
  remembers where the person drops it. The panel is 640 px high for the same reason; the
  prototype's `min(640px, 78%)` needs the window's height.
- **A press that does not move toggles; one that moves is a drag.** The chip does not stop
  the press, so Herdr can drag it; a release within 4 px of the press counts as a press.
- **The chip turns red when no save has ended for 3 minutes**, as well as when the last
  save failed. The summary carries no save time (it is shared only when it changes), so the
  chip times its own saves; a save that never ends turns it red.
- **The panel reads the save the chip's last save left** (issue #66). Each save hands
  `share` its save as well as its summary: the one it wrote, or the last good one on disk
  when it failed. The chip passes it to the panel, which judges a stall and shows
  "Saved N · …" from it. A copy re-read only when the summary's `sig` changed aged with no
  session opening or closing, and read as stalled while saves succeeded.
- **The panel counts the batch being opened**, not every row an earlier open left marked:
  the footer's "k/N opening…" with `openProgress()`, as the chip does, a space header's
  k/N with `groupProgress()` over that space's rows in the batch, and the footer's
  "N opened, M failed", "Clear failed" and whether that line shows at all with
  `batchResult()` (issue #67).
- **An open marks every row it will open "opening"**, the workers a conductor brings along
  included, and clears only its own marks when it ends: each mark carries the open's
  number (`startOpen()`, `endOpen()`), and a result lands only on a row its own open still
  marks (`settleOpen()`); taking rows out of the panel leaves an open's mark to that open
  (`withoutRows()`). An open is planned over the save with the panel's marks on it
  (`withMarks()`): a row the panel opened is live at the address it opened at, and one being
  opened is live with no address, so no open starts a session the panel opened or is opening,
  and a worker under a conductor another open is still opening fails as its conductor did not
  open. A space's `Open · N` leaves out the rows this panel
  marked opened, as "Open all" does, with the same `reopenable()` (issue #68).
- **What is tested where.** `startSaving()`, `chipState()`, `openProgress()`, `groupProgress()`,
  `batchResult()`, `startOpen()`, `endOpen()`, `settleOpen()`, `withMarks()`, `withoutRows()` and `groupsOf()` are
  tested with Node, the first through the fake `io` with a fake timer and task, including the
  save it hands `share`; `openSessions()` over `withMarks()` goes through the fake `io` too. `main.js` (the chip),
  `panel.js` and `io.js` are covered by `herdr-app check`, which builds the first render
  and does not draw a `Popup`'s content.

### Measured

On 2026-11-17, Herdr 0.1.16, hc 0.1.21, before this change was built.

- `mod.open` honours `overlay.key` and `overlay.keep` from `mod.json`, and records the
  window in `windows.json` under `kept.<layout>`. The kept window came back after the
  Herdr window was closed and reopened, with the hc core unchanged (pid 22312) and every
  terminal still there.
- A kept window that Herdr reopened at start needs `mod.open` twice to close: the first
  reopens it, the second closes it.
- A new mod folder is docked into a shown personal layout on first sight even with
  `"place": "none"`, and was not docked into `main`.
- Herdr does not reload a mod through the junction.

### Not measured

- Whether the `Popup` draws, and takes presses, outside the chip's own window in the live
  window, and whether its bottom-right corner is pinned to the chip's top (the panel above
  the chip, as built) or its bottom (the panel over the chip): gpui-kit.d.ts says only that
  "the chosen corner of the content" is pinned to the trigger; whether `mod.open` takes
  `"frame": "none"` from `mod.json` as it takes `key` and `keep` (if not, the chip gets
  Herdr's border and shadow around its own); whether Herdr delivers the release to the chip
  after dragging it; whether the `close` command closes the kept chip for good; whether
  Herdr's palette offers `mod.open` for a named mod.
- What Herdr does when the layout file it shows goes away. The live window showed the
  `session-restore` layout through a link to this repo's file, so the file went away when
  this change was committed, not when the install script pruned the link. AGENTS.md says a
  broken file keeps the last good version showing; a missing one is not described. The live check at a time the maintainer picks covers these:
  install, switch to `main`, open the chip once, see a save land, unfold and fold, close
  and reopen the Herdr window and see the chip back.

### What the calls did not cover

- The chip shows only on the layout it was opened on, and saves only while it is open.
  With the window closed and the core running, sessions started after the last save are
  not in it when a reboot comes, as before.

## Amendment (issue #69): an open checks which sessions run

The maintainer's, on 2026-11-18, in issue #69:

- **A confirm that times out keeps its terminal (option A).** The failed row keeps the
  address the open watched, and `withMarks()` plans the next open over it as it does an
  opened row's address. The timeout's reason is its own ("still starting at tN, not
  confirmed within 20 s"), apart from the terminal ending or Claude ending at once.
  Rejected: confirming in the background with no limit (one slow row keeps every Open
  hidden), a pid check right after the timeout (it repeats what `confirm` just saw), and
  only raising the 20 s limit.
- **The open checks the result, not the cause.** A View that lost its marks (item 2) and
  marks left after a core restart (item 3) are guarded against without first measuring
  whether either happens: before rows are opened, a session a live terminal's Claude pid
  file holds is not opened, and an opened mark whose terminal is not live or no longer
  holds that session is dropped.

### Derived

- **Which sessions run is the save's own walk.** `runningSessions()` in `save.js` reads,
  for each live terminal `hc ls` lists as Claude, the session its pid file holds: session
  id to address. `saveOnce()` and it share `claudeTerminals()`.
- **The panel looks before it marks.** `open()` reads which sessions run (`lookAtTerminals()`,
  stamped with the time before its first hc call), drops the opened marks that look shows
  gone (`keepLive()`; a mark that landed while the look ran is newer than it and stays), and only then plans, marks rows opening and
  opens, handing the same look to `openSessions()`. A press while that read runs (about
  0.6 s at 22 live Claudes, below) does nothing, so two presses cannot plan over the same
  marks.
- **A closed row whose session already runs reads opened there.** `openSessions()` does not
  open it. The row reads opened at the terminal that holds it, with "already running at
  tN", and a worker under it starts with that terminal as `--parent`. A failed row would
  have offered Open and "Clear failed" for a session that is open.
- **A row read as live counts as live only where its session runs.** A worker under a
  conductor the save or a mark shows live, but no terminal holds, fails with "its conductor
  no longer runs at tN". No worker starts under a dead or reused address. A worker under a
  conductor another open is still opening starts under it once that conductor's pid file
  holds its id; before that it fails as its conductor did not open.
- **A failed row keeps the address it was tried at** on every failure, not only on a
  timeout, so a third open after two failures still looks at the same terminal. At that
  terminal a Claude whose pid file holds no session yet reads "its terminal runs a Claude
  that has not shown its session yet", and one holding another session reads "its
  terminal runs another Claude session".
- **When the terminals cannot be listed, nothing is opened.** Every row the open would
  have opened fails with "could not check which sessions run: …".
- **Each save drops the opened marks it shows gone too** (`keepLive()` over `liveOf(save)`),
  so a stale mark frees its row within a minute even when nobody presses Open. A mark is
  judged only by a look made after it landed (its `since`), so a save already under way
  when the mark landed cannot drop it.
- **What is tested where.** `keepLive()`, `liveOf()`, `settleOpen()` and `withMarks()` with
  Node; `openSessions()`'s check, the timeout and the retries after it, and
  `runningSessions()` and `lookAtTerminals()` through the fake `io`, whose `hc run` now sets the `--label` values
  it is given. `panel.js`'s `open()` and `saved()` are covered by `herdr-app check`.

### Measured

- On 2026-11-18, against the live hc core, read-only (`hc ls`, `hc get` and pid files;
  nothing sent): `runningSessions()` mapped 22 sessions to 22 live Claude terminals with 23
  hc calls, in 593 and 570 ms.

### Not covered

- The seconds before a new Claude writes its pid file (accepted). A second open in that
  window is stopped only where the panel still marks the row: opening (the row reads live,
  so it is skipped) or failed (the open looks at the terminal it tried first). A View that
  lost its marks in that window can start a second terminal.
- A terminal the look cannot read counts as holding no session: one whose `hc get` fails,
  one `hc ls` does not list as Claude yet, or one whose pid file has no session id. Whether
  either happens on a live terminal is not measured.
- Whether Claude writes its pid file before a startup dialog or a large transcript load is
  not measured.

## Amendment (issue #99): every action shows that it is under way, and its error

Built in c748c10. What the person decided, on what they were shown, and what was derived.

### The person's calls (2026-11-20)

- **The look is variant B, the spinner.** Three variants were drawn as an HTML prototype,
  each over the same eleven states (five chip states; History delete of one, several, and a
  failure; Sessions × in progress, Clear failed and a failure; Refresh; Save now; the
  Open check; a failed settings write; the first read). A: a dimmed row with
  "deleting…", the panel's existing text style ("opening…", "Making…"). B: a braille
  spinner on a pulsing row, Herdr's ring on both icons and in the chip's dot, and errors in
  a red-bordered box at the top of the tab. C: struck-through rows and " · 저장 중"
  appended to the chip's label. A was recommended. B was chosen with its consequences
  shown: the row does not say in words whether it is deleting or removing, and the error
  box sits at the top of the tab, away from the action.
- **Errors go at the top of the action's tab**, which reverses the issue's "shown where
  the action lives (the History footer, the Sessions footer, the Settings tab)". It is a
  judgement, and the person's to reverse.
- **A failed Open check shows no box.** The open checks again, and where that fails too,
  each row it would have opened says why ("could not check which sessions run").
- **The refresh that unfolding the chip runs does not clear an error.** Only Refresh or ×
  pressed directly clears it, so the box is still there when the person unfolds the panel
  to read it (the issue's user story 19).
- **While the Open check runs, no Open shows**, in Sessions rows or History rows, as the
  group buttons already were hidden. No press is ignored without a sign.

### Derived

- One activity record per panel, keyed by action and target, with each tab's last error;
  the decisions are pure functions in `logic.js`, tested in `logic.test.mjs`, the one test
  seam the maintainer confirmed when the issue was filed. `startSaving`'s new `saving(on)`
  hook is tested beside its existing tests in `io.test.mjs`.
- The chip's order: reopening, stalled (red), saving, restorable (amber), saved (green).
  Stalled stays above saving, so a save stuck past three intervals still reads red.
- Animation uses Herdr's native `frames`, `spin` and `loop`, as Herdr's `AGENTS.md` asks
  ("Animate natively, never with a timer"). The ring is Herdr's own
  `mods/workspace-chrome/spinner.svg`, by path, as Herdr's own mods use it.

### Not covered

- The live window. `herdr-app check` passed on the mod and on four copies with a fixture,
  each failing under a deliberate bad animation argument, so the check reaches the new
  elements; it does not lay out or animate. On 2026-11-20 the chip was reopened with
  `mod.open` and a save sent: the chip read "⟲ 18" 0.7 s later and the save file was
  written in the same second, so "저장 중" could not be told apart from old code. A save is
  short (the #69 amendment measured the look at about 0.6 s for 22 terminals).
- The pre-existing state defects the reviews found (an overlapping or failed action leaving
  the panel's state wrong) are #104.

## Amendment (2026-11-20): auto save can be turned off, settings take typed numbers

Built in 528ade2, with the button redraw fixed in f9056c3. No issue was filed; the
maintainer asked for it in the session that built #99.

### The maintainer's calls

- **Off means auto save only.** Shown the three places a save starts (at start, on the
  timer, and Save now or the command), the maintainer turned off the first two and kept
  the third, recommended because a person can still save by hand. Consequence, said then:
  with auto save off a reboot is not noticed until a save, so the restore list forms only
  when Save now is pressed after it.
- **Variant A, a switch row.** Two variants were drawn as an HTML prototype: A, a switch
  beside "Auto save" that dims the interval rows, and a grey "Auto save off" chip; B, an
  "Off" chip among the interval presets and a "⟲ N · 꺼짐" chip that keeps the count. A was
  recommended and chosen.
- **Both numbers take typed input**, digits only, with a minimum and a maximum, asked for
  after the first build allowed letters.
- **The chip keeps one width.** The maintainer saw the panel move when the label went from
  "⟲ N" to the longer off label: a Herdr window is placed by its top left and is as big as
  its content (see the #65 amendment), so a wider chip pushed the panel. The chip is now
  156 px for every label, a long one cut with an ellipsis.
- **The chip's labels are English**, like the panel: "N to restore", "Save stalled",
  "Opening k/N", "Saving", "Not saved yet", "Auto save off". The Korean labels named in
  the sections above are superseded.

### Derived

- The history limit's maximum is 500: the history file held five saves in 90,594 bytes on
  2026-11-20, about 18 KB a save, so 500 saves is about 9 MB read and written at each save.
  The interval keeps its 1–1440 minutes. A hand edit of the settings file is not held to
  either range.
- Herdr's `Input` has no text alignment (gpui-kit.d.ts), and `text_center` on it left the
  digits at the left in the live window. The field is sized to its digits (8 px a digit
  plus 4) inside a box that centres it.
- A change pressed in the panel (a preset, − or +) updates a number field even while it has
  the keyboard; a read of the settings file does not. The first build updated neither while
  the field had the keyboard, so leaving the field applied the old number over the one just
  pressed.

### Not covered

- Typing in the live window was not driven from here: that letters are dropped, and where
  the cursor goes when they are, rests on the maintainer's look and on `digitsOnly`'s tests.
- Whether 8 px a digit centres the number exactly at every zoom.

## Amendment (issue #103): a save's id is never given twice

Save ids were the highest id present plus one, so deleting the newest save let the
next save take its id. The merge dialog knows a save only by its id, so a dialog
opened on the deleted save took the new save for it. Reproduced on fa7c3d0: history
saves 4 (d), 3 (c), 1 (a); delete 4; a save of x takes id 4; a merge of [4, 1]
keeping x, a and d made a save `from: [1, 4]` of x and a, and d was dropped without
a word.

### The maintainer's call (2026-11-20)

- **Ids never come back (option a)**, chosen over matching the dialog's saves by id
  and time together (option b), after a lens pass over both. The history file keeps
  `lastId`, the highest id it has given; the next id is one more than `lastId` or
  than the highest id present, whichever is higher. A merge takes its id the same
  way. Consequences, said then:
  - A copy of the mod from before this change, still running until Herdr restarts,
    reads no `lastId` and can give a deleted save's id again, as before; it cannot
    give an id still present, since it takes the highest present plus one. It keeps
    `lastId` in the file when it writes, as it spreads the history it read.
  - A history file reset or lost starts the ids at 1 again.

### Derived

- A delete records `lastId` too, as the highest of `lastId` and every id present
  before the delete. Recording it only when an id is given, as the call was first worded, let an
  existing history file with no `lastId` reuse an id once: delete its newest save
  and the next save takes that id. With the delete recording it, the first delete
  on such a file holds the deleted ids.
- A `lastId` or a save id that is not a whole number from 1 up to below
  `Number.MAX_SAFE_INTEGER` (a hand edit, a damaged file) is left out of the next
  id, so the next id is always a whole number that counts up by one and differs from
  every id present. /review found that `Number.isInteger` alone let a `lastId` of
  `2**53 - 1` or `1e300` give one id twice, and that a save with no id made the next
  id NaN, written as `lastId: null` at a delete; the proving pass reproduced both, and
  that checking `lastId` alone still repeated an id once `2**53` was in the save list.

### Measured

- Seven tests were added (six in `logic.test.mjs`, one in `io.test.mjs` that goes
  through the history file); four failed on fa7c3d0's code, among them the
  reproduction above, which made its `from: [1, 4]` save. The other three, for the
  ids left out of the count, failed on the first build of this change. Mutations of
  the change (no `lastId` at a delete, at a save or at a merge; `lastId` ignored;
  save ids not checked; the upper bound removed; a delete recording only the highest
  id left) each turned at least one of them red. The suite passed 139 of 139.
- On a copy of the live history file (ids 22 to 14, no `lastId`), deleting save 22
  through `save.js` wrote `lastId: 22`, and the next save and a merge each took 23.

### Not covered

- Option (b), matching by id and time, was not built.
- The panel state defects of #104, and the merge dialog's other behaviour.
- A history file that does not parse reads as empty, and the next save or a delete
  writes over it; lens noted it as outside this issue, and with this change a file
  lost that way also starts the ids at 1.

  > **Amended 2026-11-20 (issue #109).** "or a delete" held when this was written (#109
  > measured it on fa7c3d0 and dbfe7ad) and stopped holding at e6cf61d, which made
  > `withoutSnapshots` return a history it removes nothing from unchanged: from then on a
  > delete over such a file wrote nothing, and only the next save wrote over it (lens and
  > #109's probe on 3afa955). The amendment "Amendment (issue #109)" at the end holds the
  > change that stops the save too.
- A delete of ids no longer in the history still writes the file, with the same
  bytes, and can fail on a write conflict; it did before this change too.

## Amendment (issue #104): an overlapping or failed action leaves the panel's state right

Four defects, traced on 10ba085: a failed settings write left the new settings shown
(shown 5, on disk 10); a delete cleared the ticks and the unfolded save at the press, so a
failed one lost them; the first read overwrote a newer history the chip's first save had
handed the panel ([2, 1] before the read ended, [1] after); and the refresh and the Open
check set the look they made without comparing when it was made, so an older look ending
last won.

### The maintainer's call (2026-11-20)

- **These four only.** The timed save not waiting for a save the panel started went to an
  issue of its own; every other behaviour stays as it was.

### Derived

- A failed settings write reads the settings file again and shows that, falling back to the
  settings shown before the change when the read fails. `writeSettings` writes the settings,
  then trims the history; when only the trim failed, the new settings are on disk, and
  putting the previous ones back would show the mismatch the other way round. Either way it
  writes nothing over a newer change shown by then (`ifUnchanged`). Where it puts settings
  back, it brings each number field in line even while that field has the keyboard, as a change
  pressed in the panel does; where a newer change is shown, it touches no field, so typing in
  one is kept (/review and the reviewer found the first build forcing the fields either way).
- The first read puts its history in only while the history shown is still the one it began
  with (`ifUnchanged`, by identity), as `this.save ??=` already did for the save.
- A look is ordered by its `at`, the time it started (`lookAtTerminals`). One older than the
  look shown changes nothing (`withLook`), its `keepLive` pass included, so it cannot drop an
  opened mark the newer look kept. A look with the same `at` is applied. An Open whose check
  look was dropped plans and opens against the look shown, so one open uses one look, as the #69
  amendment's "handing the same look" says; the first build planned against the shown look and
  handed `openSessions` its own older one (/review, lens), which marked a closed row opened at
  the older look's terminal, or failed a worker whose conductor the shown look had running.
- The decisions are pure functions in `logic.js` (`ifUnchanged`, `afterDelete`, `withLook`),
  tested in `logic.test.mjs`.

### Measured

- Three tests, which failed before the functions existed. Mutations of each predicate turned
  them red, except dropping `view.lookAt != null`, an equivalent mutant (`at < null` is false
  for a positive time).
- A throwaway Node harness loaded `panel.js` with `herdr`, `gpui-kit`, `gpui-base` and
  `fs/promises` stubbed and ran the four cases. On 10ba085's panel: settings shown 5 against
  10 on disk, the first read left [1], and the older look's `at` ended up shown. On this
  change: 10 shown and in the field, [2, 1], and the newer `at` kept; a failed delete kept the
  ticks [3, 2] and save 2 unfolded, and one that landed left [3] and nothing unfolded; a failed
  trim after a written settings file showed the new settings. Mutating the wiring (no
  revert, a revert to the previous settings without reading the file, a revert without
  `force` on a field with the keyboard, the delete clearing at the press, the first read
  unguarded, the look unguarded) turned the matching case red each time.
- The spec reviewer's harness pressed the real buttons and reproduced the press-time clear on
  10ba085 (the confirm bar: ticks [] and nothing unfolded at the press; a row's ×: [2]).
- After the review fixes, the reviewers' harnesses on this change: an Open whose check look was
  older marked the row opening, not opened at the older look's terminal; the worker under a
  conductor the shown look had running started opening instead of failing; a field being typed
  in kept "12" when a write with nothing to put back failed. On the first build the same cases
  gave the defects above.
- `herdr-app check` passed on the mod and on three copies with a fixture (History with ticks
  and a save unfolded, the delete confirm, Settings), the chip unfolded; a throw planted in
  the History tab failed the check, so it draws that tab.

### Not covered

- The live window: no failure was forced there.
- Reads of the settings outside the four, none of them changed here: the first read's
  settings, the refresh's re-read of the settings, and the folder watch's reads of the history
  and the settings are not ordered against a change pressed in the panel. The proving pass
  reproduced each on 10ba085 and on this change alike (shown 10, on disk 5).
- While a delete runs, its saves stay ticked, so `Delete · n` and `Merge · n` are offered on
  them; a second delete is ignored as busy, and a merge of a save gone by then makes nothing
  (the #103 path).
- The panel wiring has no test in the repository: `logic.test.mjs` passes with 10ba085's
  `panel.js` over this `logic.js`. The harnesses that drive it were throwaway.

## Amendment (issue #104, follow-up): saves and re-reads that land out of order, a history of at most 50, and the delete footer

What dc0e190's reviews and the maintainer's ask-it left of #104, each reproduced by its
proving pass: (A) a save started before a remove but handed over after it brought the
removed row back until the remove's own save ended (`afterRemove []`, `afterSaved ["R"]`);
(B) the first read's settings, the refresh's re-read of the settings and the folder watch's
reads overwrote a change just pressed in the panel (shown 10, on disk 5); (C) the history
limit's maximum of 500 against Herdr's `readTextFile`, which reads "up to 1 MiB"
(`herdr.d.ts`); (D) `Delete · n` and `Merge · n` offered for saves being deleted.

### The maintainer's calls (2026-11-20)

- **(A) Sequence numbers (option 가)**: the panel does not apply a result older than the one
  it shows, the shape of `withLook`. Two saves may still run at once (`updateFile` retries
  once on a changed file). A queue that makes the timed save wait for the panel's (option 나)
  was shown and not chosen.
- **(A) refined: each result takes its number when its file is written**, the save file and
  the history file apart, at the moment `updateFile`'s write succeeds. The first call said
  "a number from when it started"; built that way, a save that started while a delete ran
  read the file after the delete, wrote `[4, 3, 1]`, and was dropped behind the delete's
  result (`[3, 1]` shown, which e6cf61d showed right), and a folder-watch read that started
  during a save and read the file before the save's write put the old history back (`[1]`
  shown, `[2, 1]` on disk, as on e6cf61d). Shown those two (lens, /review) with three
  options (number at the write; keep start numbers and record both; start numbers for every
  result), the maintainer chose the first, keeping the call's purpose.
- **(B) The same ordering for those reads**, so a read that started before a change pressed
  in the panel does not overwrite it.
- **(C) The maximum is 50.** Shown: 80 (recommended), reading with `fs/promises` `readFile`
  instead, both, and that 100 saves is about 1.26 MB, over the 1 MiB read. The live history
  file was 201,353 bytes for 16 saves on 2026-11-20, about 12.6 KB a save, so 50 is about
  630 KB. This supersedes the 500 of the amendment of 2026-11-20 above.
- **(C) A settings file holding more than 50 reads as 50** (`parseSettings`). The first
  call kept such a value as a hand edit; the reviews showed that the Settings tab itself
  offered 51–500 from 528ade2 until this change, and that at 12.5 KB a save about 84 saves
  pass the 1 MiB read, whose outcome is unmeasured. Shown keeping the value or capping it on
  read, the maintainer chose the cap. **Consequence: a person whose limit was over 50 loses
  the oldest saves past 50 at the next save that adds to the history, without being asked**,
  where a lower limit set in the Settings tab asks first.
- **(D) Hide `Delete · n` and `Merge · n`** while a delete of the ticked saves runs, as Open
  is hidden during a check (#99).

### Derived

- One count per Herdr window (`nextTurn` in `io.js`, given to save.js as `io.turn`)
  numbers every result. Each of the panel's save, history and settings keeps two marks, its
  last write and its last read (`arrive` in `logic.js`). A write is shown unless the field
  shows a later write; a read is shown only when it is later than both. A read never holds
  back a write: with the write numbered when it reached the file, a read numbered after that
  saw the write, and one numbered before it did not.
- Where the number is taken: `updateFile` takes it once its write succeeded, or before its
  read when it writes nothing, and then hands it over as a read's, since that read is what it
  returns (/review's second pass found the first build handing it over as a write's, which let it
  replace a newer read). `saveOnce` returns one for the
  save file and one for the history file, and `startSaving` hands them to `share` fourth;
  `removeEntries`, `deleteSaves` and `writeSettings` (the settings file and the history
  trim apart) return theirs. A failed save takes one before each file it reads back. A read
  of a file takes one as it starts. A settings change pressed in the panel takes one at the
  press for the value it shows at once, and once its write lands it shows that value again
  over any older read, unless a later press is shown by then.
- dc0e190's guard on the first read's history (`ifUnchanged` by identity) is replaced by
  the numbering; `ifUnchanged` stays for a failed settings write putting the file's settings
  back.
- (D) is `deletingPicked`: any ticked save being deleted hides both, and a delete of a ticked
  save closes the delete confirm, so it does not come back on the ticks left; a row's × on an
  unticked save leaves it open.

### Measured

- Nine tests in the repository, each watched failing before its code existed: in
  `logic.test.mjs` four for `arrive` and `deletingPicked`, the bound's test changed, and the
  cap on read; in `io.test.mjs` four for the numbers `startSaving`, a failed save,
  `removeEntries`/`deleteSaves`/`writeSettings` (a trim that writes and one that does not), and
  a delete that writes nothing hand over, each with its kind.
  Mutations of `arrive` (no read check, a write held back by a read, a read raising the write
  mark, one mark for every field), of `deletingPicked`, of where `updateFile`, `saveOnce`,
  a failed save and `writeSettings` take their numbers, the turns not handed to `share`, the
  bound back to 500 and the cap removed each turned a test red. The suite passed 153 of 153.
- A throwaway Node harness loaded `panel.js` and the real `save.js` with `herdr`,
  `gpui-kit`, `gpui-base` and `fs/promises` stubbed, controlling when each read, write,
  `hc` call and folder change lands; the save cases press Save now and run the real save.
  e6cf61d's panel against this change: a save whose save file was written before a remove,
  `["R", "S"]` against `["S"]`; the first read's settings, 10 against 5 (on disk 5); the
  refresh's re-read, 10 against 5; the watch's history read from before a delete,
  `[3, 2, 1]` against `[3, 1]`, and its settings read 10 against 5; a read that started after
  a delete was pressed and landed after it, `[3, 2, 1]` against `[3, 1]`; a watch read from
  before a save's history write landing after it, `[1]` against `[2, 1]`; the first read
  landing after a newer watch read, 10 against 7; the footer while a delete of a ticked save
  ran, Delete and Merge offered against neither; a delete that wrote nothing landing after a
  newer read, `[4, 1]` against `[5, 4, 1]` (on disk); a delete of a ticked save, the confirm
  left open against closed. A save that started while a delete ran, with or without a retry,
  showed `[4, 3, 1]` on both. Mutations of the wiring (the save field
  taking the history's number, the panel's save dropping its numbers, `updateFile` numbering
  before its write, each read or press unnumbered, the footer unguarded) each turned their case
  red; four first survived on cases that never built their window, and were red once the case
  built it.
- The live history file on 2026-11-20 at this change: 225,192 bytes for 18 saves, about
  12.5 KB a save; the live settings hold 50.

### Not covered

- What Herdr does with a file over 1 MiB (cut, refuse, null) is still unmeasured, and a merge
  adds a save over the limit, so a long run of merges at 50 can still pass it.
- The live window, and `main.js`'s wiring of `share`, which the harness does not load
  (read, and checked by `herdr-app check`).
- The panel's wiring has no test in the repository; the harnesses were throwaway.
- A settings read that started after a press, before its write landed, is shown when it lands
  first; the press's landing shows the pressed value again only when no later press is shown,
  so a second press made from the older value shown writes that older value back for the first
  field (/review, pre-existing on e6cf61d; the proving pass reproduced it on both trees: an
  interval press of 5, a read landing 10 before its write, then a limit press, wrote
  `{ every 10, limit 40 }`).
- `historyLimit: null` (keep every save) is not capped, so such a history passes 1 MiB past
  about 84 saves; what an unreadable history then does is #109's.

## Amendment (issue #109): a history file that cannot be read is not written over, and a save file that cannot be read is copied first

`parseHistory` read a history file that did not parse as an empty history, and
`parseSave` read such a save file as no save, so the next write replaced the file. Lens
on 3afa955, running copies of `save.js` and `logic.js`, and this change's probe on the
same code: over a history of `{"version":1,"saves":[` or `{"saves":{}}`, a delete, a
merge and the Settings trim wrote nothing, and `saveOnce` wrote the history over; over a
save file that did not parse, `saveOnce` and `removeEntries` wrote it over.

### The maintainer's call (2026-11-20)

- **Option (가), per file, after a lens pass.** The history file is never written over
  when it cannot be read: the save goes on writing the save file and the history write is
  refused. The save file, when it cannot be read, is copied first, beside it, under a name
  that does not wake the panel's folder watch, one copy per distinct content (not one per
  save or per `updateFile` retry), then written as before.
- **"Cannot be read"** is: the text does not parse, it parses to something of the wrong
  shape, or the read gives null for a file that `exists` says is there.
- **Carried as a value, never a throw.** Lens reproduced that a throw from `readHistory`
  inside `saveAndSummarize`'s catch made the whole save reject, so `share` never ran and
  the chip turned red only after three intervals, and that the panel's first read
  (`Promise.all`) would drop the save and the settings with it. So the summary carries it,
  as it carries `unreadable` and `unchecked`: the chip shows `Save stalled` at once, the
  History tab says the file cannot be read with its path in place of "No saves yet", and the
  merge dialog says the history cannot be read rather than that a save is "no longer in the
  history". A copy of the save file is said once (the chip or the Sessions footer), with its
  path.
- **The history limit cannot change while the history file cannot be read (option 1)**,
  chosen after lens found, and the proving agent reproduced, that a broken history reads as no
  saves, so lowering the limit skipped its confirm, the trim was refused, and the first save
  after the file was fixed trimmed to the new limit without asking (`[3, 2, 1]` to `[4]`).
  Shown with always asking while it is broken (option 2) and recording it as a consequence
  (option 3).
- **Left alone:** the settings file (a settings file that cannot be read still stands for
  the defaults, and a Settings change writes over it), what `readTextFile` does past 1 MiB
  (#111), and #110.

### Derived

- `parseHistory` returns null for text that does not parse or is not a history, and an
  empty history only for no text; `parseSave` already returned null for both. One
  `readParsed` in `save.js` reads a file and calls it broken when the text is there and
  parses to null, or the read gave null and `exists` says the file is there. An `exists`
  that rejects counts as no file, as the call words it ("a file that exists"). The first build
  counted it as there; the reviewer, `/review` and lens showed that a missing save file then
  failed every save with ENOENT and a missing history read as broken, where 3afa955 wrote both
  (the proving agent reproduced it against 3afa955).
- `updateFile` hands a broken file to the file's own rule before `change` runs. The
  history's rule returns `{ version: 1, saves: [], broken: true }` and writes nothing, so
  every writer of the history (`saveOnce`, `deleteSaves`, `mergeSaves`, the Settings trim)
  refuses in one place and returns that value; `readHistory` returns it too. The save's
  rule copies the file and goes on as from no file.
- The copy is byte for byte, through `fs/promises` `readFile` and `writeFile` (`io.readBytes`,
  `io.writeBytes`), since a file whose read gave null has no text to copy. It is named
  `session-restore.broken-<hash>.json`, the hash a 32-bit FNV-1a of the bytes; a copy of
  that name with the same bytes is used again, and one with other bytes moves on to
  `-2`, `-3`. The name does not start with the history or settings file's name, so
  `folderChange` reads it as "skip". A copy that fails throws before the save file is
  written, so the save fails and leaves the file as it was.
- The summary gains `historyBroken`, counted as a failed save, and `saveCopied`, the
  copy's path or null. The Sessions tab's stalled line says the history cannot be read, with its
  path, as it says the other causes of a stalled save. `saveCopied` is kept from the moment the
  copy is made, through an `updateFile` retry that finds the file whole and through a save that
  throws after the copy (a failed `hc` call, a history write conflict); the first build lost it
  in those cases (/review, lens, reproduced by the proving agent). The copy is said in one place, a line at the foot of the Sessions tab,
  kept until its × is pressed; it is set from a save's summary or a remove's result, since
  a remove over such a file copies it too. The chip does not say it: the save succeeded, and
  the chip's label has no room for a path.

### Measured

- 24 tests were added to `io.test.mjs` and the `parseHistory` test in `logic.test.mjs` was
  changed to the new contract. With 3afa955's `save.js` and `logic.js` under the first
  build's tests, 22 failed. Mutations (a null read not counted as broken, a parse to null not
  counted, no copy, a copy per save, `saveCopied` or `removeEntries`' copy dropped,
  `historyBroken` not stalling, `parseHistory("null")` read as empty, a rejected `exists`
  counted as there, the copy's path forgotten on a retry or on a save that throws) each turned
  at least one red. The suite passed 177 of 177.
- On a copy of the live data folder with the history and save files cut short, a save through
  `save.js` with Node's `fs` in Herdr's place left the history file byte for byte as it was,
  stalled the summary with `historyBroken`, and wrote a copy whose bytes matched the old save
  file.
- `herdr-app check` passed on the mod, and on throwaway copies with a fixture: the History tab
  with a broken history, the Sessions tab with a copy note, the merge dialog with a broken
  history, and the Settings tab with a broken history and a limit confirm pending; a throw
  planted in each of those four texts failed the check, so each is drawn.
- The limit lock: a throwaway Node harness loaded `panel.js` with `herdr`, `gpui-kit`,
  `gpui-base` and `fs/promises` stubbed. With the history broken, `setLimit(1)` and
  `setLimit(null)` started no write and left the limit at 50; with the guard removed, a write
  started and the limit became `null`. With a whole history, `setLimit(1)` asked as before. The
  Settings tab also hides a limit confirm already open when the history turns broken. The panel
  wiring has no test in the repository; the harness was throwaway.

### Not covered

- The live window, and Herdr's `readFile`/`writeFile` on a real broken file: the copy was
  run against the tests' fake only.
- A save file whose read gives null for a file that is there: the copy is made, then the
  write passes `expected` null, which `writeTextFile` documents as creating a new file. Whether
  it then rejects as stale was not measured; if it does, every save fails with that error and
  the save file is left as it was. The tests assert only that the copy comes first.
- A read that rejects (rather than giving null) still throws, as before, for both files;
  what `readTextFile` does past 1 MiB is #111's.
- The settings file, by the maintainer's call.
- A copy of the mod from before this change, still running until Herdr restarts or the chip
  is reopened, writes over a history file that cannot be read, as before.
- A history whose `saves` holds something that is not a save (`{"saves":[null]}`) still reads
  as a history: every save fails with a TypeError and writes nothing to it, as on 3afa955.
  Whether "the wrong shape" reaches into the list was not decided.
- With `exists` rejecting, a history file whose read gives null is written over, as no file.
- `markShown` copies a save file that broke between a save and it, and says nothing; two
  removes overlapping on the same broken file can leave a second copy (`-2`) of the same
  bytes, as Herdr's `writeFile` is not documented as atomic.
