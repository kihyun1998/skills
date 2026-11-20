# herdr-mods

Herdr-app mods: JavaScript panels the Herdr app loads from
`~/.config/herdr-app/mods/`. They are not skills
and not Claude Code mods (`mods/`). Why the folder exists:
[ADR-0101](../docs/adr/0101-herdr-mods-hold-herdr-app-mods-and-session-restore-is-the-first.md).

## Install

```sh
./scripts/install-herdr-mods.sh          # Git Bash / macOS / Linux; --dry-run
```

It links each `herdr-mods/<mod>/` (a folder with a `main.js`) into
`${HERDR_APP_HOME:-~/.config/herdr-app}/mods/`, with a junction on Windows. A real
folder already there is left alone and reported. A link into this repo whose
source is gone is removed, in `mods/` and in `layouts/`; that takes out the
`session-restore` layout link an earlier install made, and the script says to
switch to `main` if the window shows that layout. Herdr does not reload a mod
through the junction (measured on 2026-11-17, the repo on another drive than the
app's home), so an edit shows after Herdr starts again.

Nothing in this repo is a copy of Herdr's own files: Herdr's mods and layouts stay
as Herdr ships them.

For a mod whose `mod.json` keeps a window, the script opens it
(`herdr-app do mod.open --name <mod>`) when `herdr-app status` answers with
`"layout": "main"`, its `"overlays"` do not name the mod, and `windows.json` (in the same
home) has no `kept.main.<mod>`.
`mod.open` toggles, and on an open window it closes it, so in every other case
the script does not run it: it says why (already open, no window, another layout
shown, no `node` to read them with, or `windows.json` or the status not in a form it reads)
and prints how to open it once (the command, or a `keys.json` line). It never
switches layouts. `windows.json` is Herdr's own file, not a documented contract.
`node --test scripts/install-herdr-mods.test.mjs` checks that decision against a
fake `herdr-app`.

## Writing one

Read `~/.config/herdr-app/AGENTS.md` and the `.d.ts` files beside it; they are
rewritten for each Herdr version and are the truth about the API.

- A mod imports only files inside its own folder. Herdr refuses `../other/x.js`,
  even through a junction. Two parts that share code are one mod (as
  `session-restore`'s chip and panel are).
- Keep the logic in modules that import nothing from `herdr` or `gpui-kit`, with
  side effects through an injected `io`, and test them with Node:

  ```sh
  node --test 'herdr-mods/<mod>/tests/*.test.mjs'
  ```

- `herdr-app check herdr-mods/<mod>` loads the mod and draws its first render. It
  runs `init()` for real; guard side effects with `checking()`. It does not draw
  rows that need data, so check those in a throwaway copy with a fixture.
- Herdr writes `gpui-kit.d.ts` and `jsconfig.json` into a mod folder; they are
  ignored here.
- A window that is open keeps the code it was opened with: an edit to its files
  reaches it only once it is closed and opened again (`herdr-app do mod.open
  --name <mod>` twice for a kept window, which comes back at its spot). Confirm
  the new code runs by something it does that the old code did not.

## Mods

| Mod | What it does |
| --- | --- |
| [`session-restore`](session-restore/) | Saves which Claude session each terminal holds, every 10 minutes by default, keeps a history of past saves, and after a reboot or a core restart reopens them in place. It shows as a chip, a small kept window on the layout it was opened on, dragged to a corner once; pressed, the chip unfolds the Sessions panel above itself. See below. |

### session-restore

- **The chip** is a Herdr window with `key` and `keep` in its `mod.json`. The
  install script opens it when the window shows `main`; otherwise open it once on
  `main`: `herdr-app do mod.open --name session-restore`, or a `keys.json`
  binding such as `"alt-shift-s": "mod.open:session-restore"`. It opens in the middle
  of the window; drag it to a corner and it opens there from then on. Herdr reopens
  it every time it starts and every time that layout shows (kept windows are
  recorded per layout in `windows.json`). It has no close button. To turn it off,
  send it `session-restore.close` (`herdr-app do session-restore.close`, or a
  `keys.json` binding), or run `mod.open` again; after Herdr reopened the chip at start, `mod.open` has to be run twice
  (the first reopens it, the second closes it).
- **The chip's label** is green `⟲ N` with N sessions saved, amber `N to restore`
  when something can be restored, red `Save stalled` when the save stalled (failed,
  unreadable pid files, sessions whose transcript could not be looked for, a history file
  that cannot be read, or older
  than three save intervals, which auto save off does not count), `Opening k/N` while sessions reopen, `Saving` with a turning
  ring in the dot's place while a save runs (the timed one or one the panel started), and
  `Not saved yet` before the first save. The chip keeps one width for every label, so the
  panel above it does not move when the label changes. With auto save off, grey `Auto save off` takes the place of
  green and of `Not saved yet`. The order is: reopening, red, `Saving`, amber, green or grey;
  so a stalled save stays red while a new one runs. Pressed without moving, the chip unfolds the
  Sessions panel above itself and refreshes it; pressed again, it folds it. A press that moves drags
  the chip.
- **The save** is in `~/.config/herdr-app/data/session-restore.json`. `current` is the
  Claude sessions alive at the last save, replaced at each save. The chip runs the
  save, one at a time, once at start and then every `saveEveryMinutes` (it looks each
  minute whether one is due), unless auto save is off; the panel's button runs it at once
  whatever the setting, and so does the
  `session-restore.save` command, which a `keys.json` binding can send (none is installed). For each live terminal whose foreground is Claude, it reads
  `~/.claude/sessions/<pid>.json` for the session id, and records the terminal's
  name, parent, folder, space and tab, title, status and Claude flags. The task
  prompt at the end of a `thegraph-herdr` worker's argv is dropped. A session
  with no conversation yet is left out until it has one: no
  `~/.claude/projects/*/<id>.jsonl` exists. The save looks first in the folder
  Claude names from the pid file's `cwd` (every character but a letter or digit
  as `-`) and lists the others only when the transcript is not there.
- **The restore list** (`restore`) is the previous run's last `current`. It is set
  aside when the core holder (`hc server status` `holder.instance`) changes, as
  after a reboot. An entry leaves it when it is open again or removed by hand. A
  session that crashes while Herdr runs is not offered.
- **Opening** resumes `claude --resume <id> <flags>` in the shell a kept terminal
  came back as, or in a new terminal with the saved space and tab labels (a new tab
  or space when they are gone, renamed to the name it had). Conductors open
  first, and their workers start with `--parent` the conductor's address. A worker
  whose conductor is in neither list cannot be opened; its row offers only ×. A worker
  whose conductor is open now has its own Open. A session counts as opened
  when its Claude has held the id for 2 seconds; otherwise the row says why, and
  one whose terminal is still starting says so ("still starting at tN"). Before
  opening, the panel reads which sessions live terminals hold: a session already
  running is not opened again but shown open at its terminal, and a worker never
  starts under a terminal that no longer holds its conductor.
- **The panel** has three tabs: Sessions (the save's sessions, as above),
  History and Settings. Its ⟳ button and every unfold **refresh** it: they read
  which sessions live terminals hold now and show that, saving nothing, so a
  session closed since the last save shows `closed` with Open instead of
  `● open`.
- **Under way and failed.** Every panel action that waits on disk or on `hc` shows
  itself from the press until it ends: a row being deleted (History) or removed
  (Sessions ×, Clear failed) pulses with a braille spinner in place of its buttons,
  and stays in the list until the write lands; the refresh and save icons turn into a
  ring; the rows an Open is about to open spin while it checks which sessions run, the
  footer says `Checking`, and no other Open shows until the check ends; the lists say `Loading` until the first read ends. A
  second press on something under way does nothing, and Save now does nothing while
  any save runs. A failure leaves a red box at the top of its tab (History,
  Sessions or Settings) with what failed and why, until the next action pressed
  there or its × (the refresh that unfolding runs does not clear it). A failed
  check before an Open shows no box: the open checks again, and a row that does
  not open says why. A failed delete or remove leaves the save or the session in the list. A delete
  lets go of the ticks and the unfolded save only once it is written, so a failed one keeps them; while
  it runs, `Delete · n` and `Merge · n` (and the delete confirm) are not offered for ticked saves
  being deleted. A failed settings write shows the settings on disk again, the number fields included, or the
  previous ones when the file cannot be read, unless a later change was pressed meanwhile, whose own
  write then shows the file; a field being typed in keeps what was typed.
- **Overlapping reads and saves.** The save, the history and the settings the panel shows each
  keep the newest result. A save, a remove, a delete or a settings change is numbered when its
  write reaches the file (the save file and the history apart), a read of a file as it starts, and a
  settings change also at the press; a result is shown only when it is numbered after every one
  shown for that file. So a save whose file was written before a remove or a delete
  does not put back what that one changed, a read (the first read, the refresh's re-read of the
  settings, the reads after either file changes) that started before such a write landed, or before
  a settings change was pressed, does not overwrite it, and a write does not overwrite a read that
  started after it landed. A read that started after a settings change was pressed and before its
  write landed shows the file from before it, the changes still waiting included, until the last
  one's write lands. Of two looks at which sessions run (a refresh and an Open's check), one
  that started before the look already shown changes nothing when it ends last, and an Open whose
  check ended so plans and opens against the look shown.
- **The history** is in `~/.config/herdr-app/data/session-restore.history.json`,
  newest first. Each save adds `current` to it as save N unless it lists the same
  sessions as the newest one, or none. A save's number is never given twice: the
  file keeps `lastId`, the highest number it has given, and a new save or merge takes
  one more than that or than the highest number present, so deleting the newest save
  does not free its number for the next. A number that is not a whole number of 1 or
  more (a hand edit, a damaged file) is left out of that count. A history file reset or lost starts again
  at 1, and a copy of the mod from before `lastId`, still running until Herdr restarts,
  can give a deleted save's number again, though never one still in the history. The History tab opens a save to its
  sessions, each with Open or Go by what is open now, and deletes one with ×.
  Saves are ticked one by one or all at once; the ticked ones are deleted
  together (after a confirm) or merged. **Merge** opens a dialog of its own with
  every session of the ticked saves once, grouped by space, all ticked to start;
  the ones left ticked become a new save, and the merged saves stay. A session in
  several saves takes its place (space, tab, flags) from the newest of them. A merge
  deletes no save, so at the history limit each merge leaves the history one more
  over, until a later save that adds to the history, or a change in the Settings
  tab, trims it (oldest first, merged saves included; a change of the save interval
  does it without asking). When a ticked save is no longer in the history (deleted
  or trimmed meanwhile), Make makes nothing: the dialog names the save that went
  and shows what is left, which a second Make merges where two or more saves are
  left. When nothing else could be
  made, the dialog says so and stays open, and a failed Make shows its error under
  the list.
  The panel reads the history and settings again whenever either file changes.
- **A file that cannot be read.** The history file or the save file cannot be read when
  its text does not parse, parses to something that is not a history or a save, or the
  read gives nothing for a file that is there. A history file that cannot be read is never
  written over: the save still writes the save file, the chip shows `Save stalled` at once
  and the Sessions tab says why with the file's path, the History tab says the file cannot
  be read in place of `No saves yet`, and a delete, a merge or a Settings change writes
  nothing to it (the merge dialog says the history cannot be read). While it cannot be read,
  the Settings tab does not let the history limit change, and says why: a lower limit would
  ask nothing, as the number of saves it drops is unknown, and the first save after the file is
  fixed would drop them. Fix or remove the file
  and the next save writes the history again. A save file that cannot be read is first
  copied, byte for byte, beside it as `session-restore.broken-<hash>.json` (one copy for
  each distinct content, however many saves or retries meet it), then written as before; a
  line at the foot of the Sessions tab gives the copy's path until its × is pressed. The
  settings file is left as it was: one that cannot be read stands for the defaults, and a
  Settings change writes over it.
- **The settings** are in `~/.config/herdr-app/data/session-restore.settings.json`:
  `autoSave` (default `true`; `false` turns off the save at start and on the timer, while
  the panel's button and the `session-restore.save` command still save),
  `saveEveryMinutes` (default 10) and `historyLimit` (default 50; there is no "No limit":
  a `null` from before reads as 50). The Settings tab writes them: a switch for auto save, and number fields
  for the other two that take only digits and apply on Enter or on leaving the field,
  beside their − and +, each with its range shown and kept to it (an interval 1–1440
  minutes, a limit 1–50 saves; − or + at an end is greyed). A hand edit of the interval is not
  held to its range; a limit over 50 in the file reads as 50, so the next save that adds to the
  history drops the oldest saves past 50 without asking. A limit below the
  number of saves asks before it deletes the oldest. A hand edit applies at the chip's next check.
  A change in the Settings tab writes only the field it changes, onto the file as it is when the
  write runs: a hand edit (or another Herdr window's change) of another field is kept, and the trim
  that follows uses the limit in the file, so a change of the interval trims to a hand-edited lower
  limit without asking. A typed number, an interval chip and the limit confirm write their value
  over a hand edit of the same field; − and + step from the value in the file, and the auto-save
  switch turns it the other way from the file's, so a hand edit of 30 then + gives 31. A − on the
  limit that would drop saves from the history shown asks first, for the limit shown less one.
  Changes run one at a time, in the order pressed, so quick presses all land and raise no error.
- **Unfolding by itself.** When Herdr starts, the chip's first successful save
  unfolds the panel once if there is something to restore and the panel has not
  unfolded itself on that core holder yet. A core restart with the window open
  shows only the amber chip.
