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
| [`session-restore`](session-restore/) | Saves which Claude session each terminal holds when Save is pressed, and after a reboot or a core restart reopens them in place. It shows as a chip, a small kept window on the layout it was opened on, dragged to a corner once; pressed, the chip unfolds the Sessions panel above itself. See below. |

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
- **The chip's label** says how long ago the save was made: green `Saved 2h ago`.
  `Opening k/N` shows while sessions reopen, `Saving` with a turning ring while a
  save runs, red `Save failed` after a save that failed (it threw, a pid file had no
  session id, or a transcript could not be looked for), and grey `Not saved` before
  any save. The order is: reopening, `Saving`, red, grey, green. The chip keeps one
  width for every label, so the panel above it does not move when the label changes.
  Pressed without moving, the chip unfolds the Sessions panel above itself, or below it
  when the press lands in the top half of the window, and looks at the terminals (below);
  pressed again, it folds it. A press that moves drags the chip.
- **The save** is one file, `~/.config/herdr-app/data/session-restore.json`:
  `{ version: 2, savedAt, sessions }`. It is written only when Save is pressed (the
  panel's save icon) or the `session-restore.save` command arrives (a `keys.json`
  binding can send it; none is installed). Nothing saves by itself: not at start, not on
  a timer, not after an Open or a ×. A save lists the terminals with `hc ls`, and for
  each live one whose foreground is Claude reads `~/.claude/sessions/<pid>.json` for
  the session id, and records the terminal's name, parent, folder, space and tab,
  title, status and Claude flags. The task prompt at the end of a `thegraph-herdr`
  worker's argv is dropped. A session with no conversation yet is left out: no
  `~/.claude/projects/*/<id>.jsonl` exists. The save looks first in the folder Claude
  names from the pid file's `cwd` (every character but a letter or digit as `-`) and
  lists the others only when the transcript is not there. `sessions` replaces what the
  file held; nothing from an earlier save is kept. A save that fails leaves the file as
  it was. A file an earlier version wrote (`current` and `restore`) reads as its
  `current` until the next save writes over it.
- **After a reboot** the file still holds what was open at the last Save, since
  nothing writes it until Save is pressed. Open the sessions from it before pressing
  Save again: a Save then writes only what is open at that moment.
- **Opening** resumes `claude --resume <id> <flags>` in the shell a kept terminal
  came back as, or in a new terminal with the saved space and tab labels (a new tab
  or space when they are gone, renamed to the name it had). Conductors open
  first, and their workers start with `--parent` the conductor's address. A worker
  whose conductor is not in the save cannot be opened; its row offers only ×. A
  worker opens with its conductor, or on its own once this panel has opened that
  conductor. Before opening, the open reads which sessions live terminals hold: a
  session already running is not opened again but shown open at its terminal, and
  a worker never starts under a terminal that no longer holds its conductor. A
  session counts as opened when its Claude has held the id for 2 seconds; otherwise
  the row says why, and one whose terminal is still starting says so ("still starting
  at tN"). Every row that does not open is also added, as one JSON line (`at`,
  `sessionId`, `title`, `address`, `reason`), to
  `~/.config/herdr-app/data/session-restore.open-failures.log`, which keeps its newest
  1000 lines; a log that cannot be written changes nothing else.
- **The panel** lists the save's sessions grouped by space, with how many the save
  holds and how long ago it was made. Each unfold reads which sessions live terminals
  hold (`hc ls` and the pid files) and shows each row `● open` or `closed`; it writes
  nothing. While it reads, the rows turn a braille spinner and the footer says
  `Checking which are open`. There is no button for it. A row shows what this panel's
  opens did to it over that (`opening…`, `failed` with the reason as its tooltip,
  `● open`); a newer look drops the `● open` an earlier open left. A closed row has Open
  and ×, an open one Go, each space `Open · N` and the footer `Open all · N` over the
  closed rows; × takes the session out of the save.
- **Under way and failed.** A row being removed (×, Clear failed) pulses with a
  braille spinner in place of its buttons and stays in the list until the write lands;
  the save icon turns into a ring while a save runs; the list says `Loading` until the
  first read ends. A second press on something under way does nothing. A failure
  leaves a red box at the top of the panel with what failed and why, until the next
  action pressed or its ×. A failed remove leaves the session in the list.
- **Overlapping reads and writes.** The panel keeps the newest save it was handed. A
  save or a remove is numbered when its write reaches the file, the first read as it
  starts; a result is shown only when it is numbered after every one shown.
- **A save file that cannot be read** (its text does not parse, parses to something that is not a
  save, or the read gives nothing for a file that is there) is first
  copied, byte for byte, beside it as `session-restore.broken-<hash>.json` (one copy for
  each distinct content, however many saves or retries meet it), then written as before; a
  line at the foot of the panel gives the copy's path until its × is pressed.
- **Files an earlier version left** in the data folder are no longer read or written, and
  can be deleted by hand: `session-restore.history.json` and
  `session-restore.settings.json`.
