# mods

Claude Code mods: plugins of function hooks that draw in the terminal (a band, a
pane, the status line) or hook the session's events. They are not skills, and
the skill install script leaves this folder alone.

## Install

```sh
./scripts/install-mods.sh              # macOS / Linux / WSL / Git Bash; --dry-run, --uninstall
```

The script is a sync. It validates every mod, rewrites
`.claude-plugin/marketplace.json` from the folders here, installs each mod at
user scope from this repo's marketplace (`kihyun-skills`), and uninstalls a mod
whose folder is gone. An install reads the mod from its folder here, so after
editing one, `/reload-plugins` in an open session picks it up; there is nothing
to reinstall.

From another machine, without cloning: `/plugin install <mod> --marketplace kihyun1998/skills`.

## Adding a mod

Read [`ENGINE-NOTES.md`](ENGINE-NOTES.md) first: what the engine does that its
types do not make obvious (clicks only in fullscreen, sharing the band, panes,
state resets, the testing kit), and the workflow both mods here were built with.

1. Make `mods/<name>/`. The folder name **is** the plugin name: the install
   script refuses a `plugin.json` whose `name` differs.
2. Give it the layout below, and at least one test.
3. `node scripts/check-mods.mjs <name>` — validates and runs its tests.
4. Run the install script, then commit the mod **and** the rewritten
   `.claude-plugin/marketplace.json`: an install from GitHub reads the committed
   copy, so a mod missing from it cannot be installed there.

```
mods/<name>/
├── .claude-plugin/plugin.json   name (= folder), version, author, description, types
├── hooks/hooks.json             { "modules": ["./register.tsx"] }
├── hooks/register.tsx           export const register: Register = (on, options) => { ... }
├── hooks/*.ts                   pure helpers the module imports, testable on their own
├── types/index.d.ts             the $.state contract, when the mod keeps state
└── tests/*.test.ts              claude plugin test runs these
```

`plugin.json`'s `description` is what the marketplace lists, so write it for
someone choosing whether to install.

## Developing one

An installed mod reloads on `/reload-plugins`. To have it reload on every save
instead, start a session with `claude --plugin-dir mods/<name>` — and disable the
installed copy in `/plugin` meanwhile, or the mod loads twice. Asking Claude to
write or change a mod uses a hot-reloading folder of its own; copy the result
here when it is done.

`node scripts/check-mods.mjs` with no names checks every mod. It is the gate for
this folder: run it before committing a change to any mod. CI runs the same
check (`.github/workflows/mods.yml`) on the Claude Code version pinned there;
raise the pin when the mods move to a newer one.

## Mods

| Mod | Notes |
| --- | --- |
| [`usage-band`](usage-band/) | Usage above the prompt; replaces the ccusage statusline. Why it looks the way it does: [`docs/environment/usage-band.md`](../docs/environment/usage-band.md). It draws other bands above its two rows, so they stay next to the prompt. |
| [`path-band`](path-band/) | One line above the other bands with the agent's **working location** and its branch, as two chips: `[ skills/mods/usage-band ] [ main ]`. The location is the worktree's or repository's folder name and the path beneath it, or the path shortened with `~` outside every working tree (no branch chip then); a detached HEAD shows its short SHA and `detached`. It follows the agent's shell `cd`, `/cd` and worktree moves (`$.session.cwd()`, read again a second after each call, since the call that ran the `cd` still sees the old folder). It re-reads `HEAD` only when its modification time changes: after each main-thread tool call, and every 30 s for a checkout made elsewhere. Too wide, the path is cut at its start and the branch stays whole up to 40 cells. Why it looks the way it does: [ADR-0081](../docs/adr/0081-path-band-draws-the-working-location-above-usage-band.md). |
| [`thegraph-panel`](thegraph-panel/) | While [`/thegraph`](../thegraph/) runs, one line over the band with its steps in order (`read-it ✓ › confirm ✓ › make-it×2 ◐ › check-it › ask-it · 5m   ✗ 1 fail  ⚑1`: each marked done, under way or waiting, `×2` on one begun twice, the time in the step at hand, the last test while it failed, the signals), and a `▸ pane` button (or `g` with the band focused) that opens a pane with a gantt of the steps, a row each filled wherever that step ran, over the whole log as a table of when, which step and what, opened at its newest line: each step begun, every question with the answer it got, the files written, the tests run with their counts, the signals, each step's note to the next and what is carried. While the run works the spinner reads `… · thegraph make-it 3/5 · ✎5`, and each turn's closing line keeps what that turn did. The pane closes itself with its own `close` (`q` with it focused), Esc, or `ctrl+x x`, and one left open with no run behind it, as `/clear` leaves it, goes at the next prompt. It draws from the run sheet thegraph keeps in the OS temp folder ([ADR-0080](../docs/adr/0080-a-run-keeps-a-run-sheet-while-it-lasts.md)) — the steps, each step's note to the next, the route and what is carried. It names that file itself, in the text `/thegraph` expands to, and looks at it after every tool call, so a sheet the run writes with the shell is read as surely as one written with Write. Before a sheet exists, or for a run without one, it follows the skills thegraph expands, a question box (`AskUserQuestion`) as the person's turn and its reply as their answer (one put away with Esc, nothing answered, is no answer: the run waits, and what is typed next takes it up again rather than ending it), and a first file edit after the confirm as make-it begun; a later step taken without its skill does not show, and a run that ends without ask-it or a decision (a trivial change, or one given up) is cleared with `×` (or `x`). A run also ends when its sheet is checked off whole, or when the issue its sheet's `source:` names is closed: `gh issue close` on it, gh asked every five minutes, or a local issue file marked `Status: done` or moved away once seen. A finished run goes at the next prompt, and a typed `/thegraph` replaces the run before it at once. The band and pane name the run by its **run name**: once the sheet names an issue, its number (or its file's name) and title — `#71 What a minor release means`, `03-row-height 설정 행 높이 통일` — cut at 40 characters on the band and whole in the pane, with the issue's source under the pane's header; before that, its **label**, whatever followed `/thegraph` on the prompt. |
