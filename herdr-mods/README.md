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
  node --test herdr-mods/<mod>/tests
  ```

- `herdr-app check herdr-mods/<mod>` loads the mod and draws its first render. It
  runs `init()` for real; guard side effects with `checking()`. It does not draw
  rows that need data, so check those in a throwaway copy with a fixture.
- Herdr writes `gpui-kit.d.ts` and `jsconfig.json` into a mod folder; they are
  ignored here.

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
- **The chip's label** is green `⟲ N` with N sessions saved, amber `복원할 세션 N`
  when something can be restored, red `save 멈춤` when the save stalled (failed,
  unreadable pid files, sessions whose transcript could not be looked for, or older
  than three save intervals), `여는 중 · k/N` while sessions reopen, and `save 없음` before the
  first save. Red wins over amber. Pressed without moving, the chip unfolds the
  Sessions panel above itself and refreshes it; pressed again, it folds it. A press that moves drags
  the chip.
- **The save** is in `~/.config/herdr-app/data/session-restore.json`. `current` is the
  Claude sessions alive at the last save, replaced at each save. The chip runs the
  save, one at a time, once at start and then every `saveEveryMinutes` (it looks each
  minute whether one is due); the panel's button runs it at once, and so does the
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
- **The history** is in `~/.config/herdr-app/data/session-restore.history.json`,
  newest first. Each save adds `current` to it as save N unless it lists the same
  sessions as the newest one, or none. The History tab opens a save to its
  sessions, each with Open or Go by what is open now, deletes one with ×, and
  merges two ticked saves: each session is ticked in or out, and where both saves
  hold it differently one side is picked. The merge is a new save; the two stay.
- **The settings** are in `~/.config/herdr-app/data/session-restore.settings.json`:
  `saveEveryMinutes` (default 10) and `historyLimit` (default 50; `null` keeps
  every save). The Settings tab writes them; a limit below the number of saves
  asks before it deletes the oldest. A hand edit applies at the chip's next check.
- **Unfolding by itself.** When Herdr starts, the chip's first successful save
  unfolds the panel once if there is something to restore and the panel has not
  unfolded itself on that core holder yet. A core restart with the window open
  shows only the amber chip.
