# `session-restore`: the measurements and the dated amendments behind ADR-0101

The measurements [ADR-0101](../adr/0101-herdr-mods-hold-herdr-app-mods-and-session-restore-is-the-first.md)
held, and its three amendments that had no issue. They are moved here unchanged from the
record when it was folded into a short record of its first decision (#126, 2026-11-23); the
record as it stood before the fold is in
`git log -p -- docs/adr/0101-herdr-mods-hold-herdr-app-mods-and-session-restore-is-the-first.md`.
Each amendment still in force that had an issue has its decision, what was derived and what it
did not cover in a decision comment on that issue; ADR-0101's table links each, and names the
commit that replaced each superseded one.

A section describes `session-restore` as it was on its date. What the mod is today is in
[herdr-mods/README.md](../../herdr-mods/README.md).

## Measured in each issue

### #60's first build (2026-11-17, `77eb581`)

#### Measured

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

#### Not measured

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

### #65: a kept chip replaces the clones (2026-11-17, `182a136`)

#### Measured

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

#### Not measured

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

### #69: an open checks which sessions run (2026-11-18, `2ed18de`)

#### Measured

- On 2026-11-18, against the live hc core, read-only (`hc ls`, `hc get` and pid files;
  nothing sent): `runningSessions()` mapped 22 sessions to 22 live Claude terminals with 23
  hc calls, in 593 and 570 ms.

### #103: a save's id is never given twice (2026-11-20, `dbfe7ad`)

#### Measured

- Seven tests were added (six in `logic.test.mjs`, one in `io.test.mjs` that goes
  through the history file); four failed on fa7c3d0's code, among them the
  reproduction above, which made its `from: [1, 4]` save. The other three, for the
  ids left out of the count, failed on the first build of this change. Mutations of
  the change (no `lastId` at a delete, at a save or at a merge; `lastId` ignored;
  save ids not checked; the upper bound removed; a delete recording only the highest
  id left) each turned at least one of them red. The suite passed 139 of 139.
- On a copy of the live history file (ids 22 to 14, no `lastId`), deleting save 22
  through `save.js` wrote `lastId: 22`, and the next save and a merge each took 23.

### #104: an overlapping or failed action leaves the panel's state right (2026-11-20, `dc0e190`)

#### Measured

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

### #104's follow-up: results that land out of order, a history of at most 50, the delete footer (2026-11-20, `3afa955`)

#### Measured

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

### #109: a history file that cannot be read is not written over (2026-11-20, `0f4dae6`)

#### Measured

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

### #110: a settings press writes only its field, one at a time (2026-11-20, `f53b8c4`)

#### Measured

- In the repository: `arrive`'s three tests rewritten to the new rule (a read 5 then a write 3:
  the write is not taken), `oneAtATime`'s test, three new `writeSettings` tests (only the given
  fields onto the file as read; the trim to a hand-edited limit on an interval press; a file
  changed during the write keeps its other fields), and three existing `writeSettings` calls
  moved to changes; after check-it, a test of a change reading the file (a hand edit of 30 stepped
  to 31, the switch turned from the file's value), tests of `stepSetting` (bounds included) and
  `toggleAutoSave`, and the turn tests asserting a number. Mutations each turned a test red:
  `arrive` taking an equal number, taking every result; `writeSettings` built on the defaults or
  on the fields alone, its change given the defaults, trimming to the fields' limit, `updateFile`
  not retrying, a turn handed over wrapped; `oneAtATime` not chained, or stopping at a failed job;
  `stepSetting` unclamped or stepping from the defaults, `toggleAutoSave` constant. The suite passed
  182 of 182.
- A throwaway Node harness loaded `panel.js` and the real `save.js` with `herdr`, `gpui-kit`,
  `gpui-base` and `fs/promises` stubbed, controlling when each settings and history read and
  write lands; on 9c73a7e against this change, disk then shown as `[every, limit]`:
  R23, `[10,40]` and a stale-snapshot banner against `[5,40]` with none; two quick `+` from 10,
  `[10,11]` and a banner against `[10,12]` with none; F3, shown `[5,50]` with disk `[30,50]`
  against `[30,50]`; the limit confirm across a hand edit read in between, `[10,3]` against
  `[30,3]`; an unread hand edit and a limit press, `[10,40]` against `[30,40]`; a read started
  before a press landing after it, `[5,50]` on both; two presses whose second write waits, `[5,50]`
  and a banner against `[5,40]`. A failed press showed the file `[10,50]` with its banner on both;
  on this change a failed first press with a second queued ended `[10,40]`, the failure's banner
  only, and showed `[5,40]` while the second waited. Mutations of the wiring (no queue, the landing
  over a later read, the landing without the last-press check, the failure read-back ignoring a
  later press or missing, the press not shown at once, the press unnumbered) each turned a case
  red. Two first survived on cases whose window never opened (the landing is checked after the
  trim, and no read started before the press); both were red once the case built its window.
- After check-it's fixes, the harness also pressed the rendered buttons (the stub records each
  element's `on_click` by its id): `+` on the interval three times with a settings read landing
  between, `[13]` (12 before, the proving agent's count on this change's first build and on
  9c73a7e); the switch three times from On, Off; the limit's `+` three times from 10, 13; an
  unread hand edit of 30 and `+`, 31; the limit's `−` at 5 with 5 saves asked for 4 and its confirm
  wrote 4; the interval chip 30 wrote 30. Making the stepper, the switch or the limit's step compute
  from the value shown, or the limit's `−` skip its ask, turned the matching case red; every case
  of the first build's harness gave the same results.
- `herdr-app check` passed on the mod, and on a throwaway copy with the chip unfolded on the
  Settings tab and a limit confirm pending; a throw planted in the confirm's text failed it, and
  after check-it's fixes one planted in the steppers' buttons did too.

Neither #99 nor #111 held measurements of their own; #111's decision is that the limit
was not measured.

## The amendments with no issue

### 2026-11-20: auto save can be turned off, settings take typed numbers (`528ade2`, `f9056c3`)

Built in 528ade2, with the button redraw fixed in f9056c3. No issue was filed; the
maintainer asked for it in the session that built #99.

#### The maintainer's calls

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

#### Derived

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

#### Not covered

- Typing in the live window was not driven from here: that letters are dropped, and where
  the cursor goes when they are, rests on the maintainer's look and on `digitsOnly`'s tests.
- Whether 8 px a digit centres the number exactly at every zoom.

### 2026-11-23: the history is gone (`0c018f0`)

#### The maintainer's call

Asked whether a save in History could be put into the Sessions list, and told it could not
(nothing writes the history into `restore`; a history row could only be opened one at a time),
the maintainer said the history seemed to have little point and, from three options (remove it
whole, keep it and add a move into Sessions, leave it), chose to remove it whole.

What was shown: the restore list already covers the case the mod exists for, reopening after a
reboot or a core restart; History added only a per-row Open on older saves; and the history was where most of the defects after #83 lived (#103, #104's
follow-up, #109, #111, and #115, still open).

#### Derived

- The panel has two tabs, Sessions and Settings. `merge.js` is deleted, and the chip no longer
  opens as the merge dialog.
- The settings are `autoSave` and `saveEveryMinutes`. A `historyLimit` an earlier version
  wrote is ignored when read and dropped at the next Settings change.
- `saveOnce` writes only the save file. `saveAndSummarize` no longer reports
  `historyBroken`, and a save hands `share` one turn, the save file's.
- `updateFile` loses its refuse branch, which only the history used.
- A `session-restore.history.json` left in the data folder is neither read nor written, and not
  deleted by the mod: it is the person's data.

#### Measured

- `node --test` on both test files: 75 and 60 tests pass after the history tests were removed
  and the activity and settings tests moved off the `delete` action and `historyLimit`.
- `herdr-app check herdr-mods/session-restore` passed.

#### Not covered

- The live window: the chip was not reopened in Herdr on this code.
- What would reopen it: wanting a set of sessions back from before the last run, which the
  restore list does not keep.

### 2026-11-23: one file, written only by Save; no auto save, no restore list (`f1a357f`, `707f766`)

#### The maintainer's calls

Shown that the save file held two lists, `current` (the sessions alive at the last save) and
`restore` (the previous run's `current`, carried from file to file until a row was opened or
removed), and that the panel's refresh read the terminals without writing while a save wrote
without being seen, the maintainer said one file means no second copy: the file is what `hc ls`
showed at the last save, written over whole. Shown that a save run by itself after a reboot would
write the near-empty list over the sessions to reopen, the maintainer chose:

- **Only Save writes the file.** No save at start, on a timer, or after an Open or a ×. The
  Settings tab and its file (`autoSave`, `saveEveryMinutes`) go with the timer.
- **No refresh button; the unfold looks.** The ⟳ button is removed. First the refresh on unfold went
  too, leaving the rows a yellow or grey dot for the status at the save; asked what the dots meant
  and shown they were stale, the maintainer said whether a session is open matters more, read when
  the panel unfolds, with a loading indicator while it reads. The look writes nothing; an Open
  still reads which sessions run before it opens (as since #69).
- **The chip shows how long ago the save was made**, not how many it holds: asked why the count,
  and told it mostly stood in for the age, the maintainer kept the age only.
- **No unfolding by itself after a reboot**, so the file carries no core holder.
- **A failed open is logged** to `data/session-restore.open-failures.log` (asked earlier the same
  day, when its reason lived only in a tooltip).

#### Derived

- The save is `{ version: 2, savedAt, sessions }`. `nextSave(observed, { now })` takes nothing from
  the file before; `observe` no longer falls back to the previous save's space and tab names.
- `parseSave` reads a version-1 file (`current` and `restore`) as its `current`, so the save a
  person had before this change still opens until the next Save writes over it.
- Gone from `logic.js`: the settings (`DEFAULT_SETTINGS`, `SETTING_BOUNDS`, `parseSettings`,
  `stepSetting`, `toggleAutoSave`, `digitsOnly`, `clampWhole`, `oneAtATime`, `folderChange`), the
  stale time (`staleAfter`, `STALE_MS`), `coreIdentity`, and the look's ordering of overlapping
  looks (`liveOf`, `keepLive`, `withLook`). The look on unfold runs one at a time (the `look`
  action), shows rows through `withRunning`, and drops the opened marks older than it (`afterLook`). From `save.js`: `startSaving`, `markShown`, `lookAtTerminals`,
  the settings file. From `io.js`: the shared summary. `refresh.svg` is deleted.
- The refresh, check and settings actions leave the panel's activity, and `look` joins it; `press`
  loses its `clear` option. A failed look shows its red box like any other action.
- `openSessions` adds one JSON line per failed row (`at`, `sessionId`, `title`, `address`,
  `reason`) before it returns, and keeps the newest 1000 lines. The runtime's `fs/promises` has no
  append, so it reads and writes through `writeTextFile`'s expected, once more on a rejected write.
  A log that cannot be written leaves the results as they are.
- A blocked worker's reason reads "its conductor is not in the save".
- **The panel unfolds below a chip in the top half of the window.** Asked for afterwards: with the
  chip dragged to the top, the panel stayed anchored above it, and `Popup` only clamps into the
  window (gpui-kit.d.ts: "keeps it clear of the window edges"; tooltips are the ones "flipped and
  clamped"), so it covered the chip. At each unfolding press the chip compares the press's
  window-relative `position.y` with `window.viewport_size()` read in `render` (`panelSide`), and
  anchors the panel by its top-right corner below the chip, or by its bottom-right above it.
- This supersedes the restore-list rule in "The calls" above, the #65 amendment's unfold on a new
  holder, the 2026-11-20 amendment's auto save and settings, and the "Not covered" line of the
  history amendment that said the restore list does not keep sessions from before the last run
  (it did, until now).

#### Accepted with it

- A Save pressed after a reboot and before the sessions are reopened writes over them.
- The rows show the terminals as they were at the unfold; a session closed while the panel is open
  still reads `● open` until the next unfold.

#### Measured

- `node --test` on both test files: 99 tests pass (53 and 46). The tests for the removed parts
  were deleted; new ones cover `nextSave` keeping nothing, `parseSave` on a version-1 file, a save
  over a version-1 file, a failed save leaving the file, `summarize`, `ago`, `chipState`'s order,
  `reopenable`, `withRunning`, `afterLook`, the `look` action and the open log.
- `herdr-app check herdr-mods/session-restore` passed.

#### Not covered

- The live window: the chip was not reopened in Herdr on this code, and no Save, Open or × was
  pressed in it. The panel and chip wiring has no test in the repository, as before.
