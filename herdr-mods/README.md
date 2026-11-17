# herdr-mods

Herdr-app mods: JavaScript panels the Herdr app loads from
`~/.config/herdr-app/mods/`, and the layouts that place them. They are not skills
and not Claude Code mods (`mods/`). Why the folder exists:
[ADR-0101](../docs/adr/0101-herdr-mods-hold-herdr-app-mods-and-session-restore-is-the-first.md).

## Install

```sh
./scripts/install-herdr-mods.sh          # Git Bash / macOS / Linux; --dry-run
```

It links each `herdr-mods/<mod>/` (a folder with a `main.js`) into
`${HERDR_APP_HOME:-~/.config/herdr-app}/mods/` and each `herdr-mods/layouts/*.json`
into its `layouts/`. On Windows, a folder is linked with a junction and a layout
with a file symlink, which needs Developer Mode. A real folder or file already there
is left alone and reported. A link into this repo whose source is gone is removed.
A linked mod reads its files from this repo, so there is nothing to reinstall
after an edit. Whether Herdr's hot reload sees a save through the junction (the
repo and the app's home on different drives) is not measured.

The script never switches layouts; it prints the command
(`herdr-app do layout.switch --name <layout>`). `ctrl-shift-l` cycles back.

## Clones

Herdr replaces its own mods and layouts on every start and never updates a clone.
A shipped file that is changed here is copied into the repo, and the mod's
`clones.json` records where it came from and from which Herdr version:

```json
{ "tabs": { "file": "tabs.js", "from": "mods/tabs/main.js", "version": "0.1.16" } }
```

The install script warns when `herdr-app --version` differs from a clone's
`version`. Then compare the clone with the shipped file
(`diff --strip-trailing-cr ~/.config/herdr-app/mods/tabs/main.js herdr-mods/session-restore/tabs.js`)
and carry the upstream change over.

## Writing one

Read `~/.config/herdr-app/AGENTS.md` and the `.d.ts` files beside it; they are
rewritten for each Herdr version and are the truth about the API.

- A mod imports only files inside its own folder. Herdr refuses `../other/x.js`,
  even through a junction. Two parts that share code are one mod that draws by
  `props` (as `session-restore` does).
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
| [`session-restore`](session-restore/) | Saves which Claude session each terminal holds, every minute, and after a reboot or a core restart reopens them in place, from a Sessions panel beside Files and Changes. Needs the `session-restore` layout, which puts this mod's tab bar (`props: {part: "tabs"}`, a clone of the shipped `tabs`) and its panel in a clone of the shipped `main`. See below. |

### session-restore

- **The save** is in `~/.config/herdr-app/data/session-restore.json`. `current` is the
  Claude sessions alive at the last save, replaced each minute. The tab bar runs the
  save; the panel's button runs it at once, and so does the `session-restore.save`
  command, which a `keys.json` binding can send (none is installed). For each live terminal whose foreground is Claude, it reads
  `~/.claude/sessions/<pid>.json` for the session id, and records the terminal's
  name, parent, folder, space and tab, title, status and Claude flags. The task
  prompt at the end of a `thegraph-herdr` worker's argv is dropped.
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
  when its Claude has held the id for 2 seconds; otherwise the row says why.
- **The dot** on the Sessions button is amber when something can be restored and
  red when the save stalled (failed, unreadable pid files, or older than 3 minutes).
  When Herdr starts, the tab bar's first successful save opens the panel once if
  there is something to restore. A core restart with the window open shows only the
  dot.
