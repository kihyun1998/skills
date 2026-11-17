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
| [`path-band`](path-band/) | One line above the other bands with the agent's **working location** and its branch, as two chips: `[ skills/mods/usage-band ] [ main ]`. The location is the worktree's or repository's folder name and the path beneath it, or the path shortened with `~` outside every working tree (no branch chip then); a detached HEAD shows its short SHA and `detached`. It follows the agent's shell `cd`, `/cd` and worktree moves (`$.session.cwd()`, read again a second after each call, since the call that ran the `cd` can still see the old folder). It re-reads `HEAD` only when its modification time changes: after each main-thread tool call's result, and every 5 s for a checkout made elsewhere. It sees a call as the row its result is kept in (`session.append`) and hooks none of the events that keep Code Mode from starting. Too wide, the path is cut at its start and the branch stays whole up to 40 cells. While a thegraph run is open (`/thegraph`, a `/thegraph-herdr` conductor or one of its workers) the run follows as one chip, a button: `[ skills ] [ main ] [ thegraph #52 make-it ◐ 4m ]` (its kind, the issue the branch's commits are for now, cut at 24 cells, the step at hand and the time in it). A conductor's children follow it (`#37 ✓ [ #38 ◐ ] #39 ·`, a live worker's a button), and a worker's `[ ↩ conductor ]`. On the main screen each button's hotkey is drawn dim after it: `g` for the chip, `a s d f …` for the children, `c` for the way back. Narrower, the path keeps 12 cells while the chip drops its time, its step and its kind, then the plain children go, then the rest. The chip is `thegraph-panel`'s value, read with `$.state.get` and never worked out here, and a press on its buttons is that mod's to act on; without it, or with no run, there is no chip. Why it looks the way it does: [ADR-0081](../docs/adr/0081-path-band-draws-the-working-location-above-usage-band.md); the chip: [ADR-0099](../docs/adr/0099-a-mod-reads-another-mods-state.md). |
| [`thegraph-panel`](thegraph-panel/) | Follows a [`/thegraph`](../thegraph/) run and keeps it as one value, the **chip** (`thegraph #52 make-it ◐ 4m`: the run's kind, its issue, the step at hand marked under way or waiting, the time in it), that [`path-band`](path-band/) draws after the branch; it draws no line of its own, so without `path-band` the run shows only in the spinner and the turn lines. A press on the chip (`g` with the band focused) opens a pane with a gantt of the steps, a row each filled wherever that step ran, over the whole log as a table of when, which step and what, opened at its newest line: each step begun, every question with the answer it got, the files written, the tests run with their counts, the signals, each step's note to the next and what is carried. While the run works the spinner reads `… · thegraph make-it 3/5 · ✎5`, and each turn's closing line keeps what that turn did. The pane gives the run up with `clear run ×` (`x`), and closes itself with its own `close` (`q` with it focused), Esc, or `ctrl+x x`, and one left open with no run behind it, as `/clear` leaves it, goes at the next prompt. It draws from the run sheet thegraph keeps in the OS temp folder ([ADR-0080](../docs/adr/0080-a-run-keeps-a-run-sheet-while-it-lasts.md)) — the steps, each step's note to the next, the route and what is carried. It names that file itself, in the text `/thegraph` expands to, and looks at it after every main-thread tool call's result and every 5 s, so a sheet the run writes with the shell is read as surely as one written with Write. It sees a call as the rows the session keeps for it (`session.append`: the call, then its result) and hooks none of the events that keep Code Mode from starting; what a call came to is read from the transcript a moment after its result. Under Code Mode the transcript holds no such record for a call the model's code makes, so where the result's row tells nothing either (no text, no error mark) the log says only that the call was made and came back: a question `answered` without its answer, a test `–` with neither counts nor pass or fail, an edit without whether the file is new, and a `gh issue close` checked with gh at once rather than taken on trust; a worker's `done` or `stuck` is taken as sent. What such a row does carry was measured: a code-made question answered has no text and no error mark, so the log still says only `answered`; one put away with Esc has the rejection text and an error mark, so it reads as dismissed; a failed test run has the command's output and an error mark, so it shows ✗ without counts unless the output prints them. The rows of a code block all arrive after the block ends, so while a code-made question box is up the log has no line for it and no waiting mark. Before a sheet exists, or for a run without one, it follows the skills thegraph expands, a question box (`AskUserQuestion`) as the person's turn and its reply as their answer (one put away with Esc, nothing answered, is no answer: the run waits, and what is typed next takes it up again rather than ending it), and a first file edit after the confirm as make-it begun; a later step taken without its skill does not show, and a run that ends without ask-it or a decision (a trivial change, or one given up) is cleared from the pane. A run also ends when its sheet is checked off whole, or when the issue its sheet's `source:` names is closed: `gh issue close` on it, gh asked every five minutes, or a local issue file marked `Status: done` or moved away once seen. A finished run goes at the next prompt, and a typed `/thegraph` replaces the run before it at once. The pane names the run by its **run name**: once the sheet names an issue, its number (or its file's name) and title — `#71 What a minor release means`, `03-row-height 설정 행 높이 통일` — whole, with the issue's source under its header; before that, its **label**, whatever followed `/thegraph` on the prompt. The chip carries the issue alone (`#71`, `03-row-height`), or the label before one; in a cluster run, the child the sheet's `## Children` marks `under way`, else the anchor. A typed `/thegraph-herdr` is followed the same way, its chip headed `herdr` and walking the conductor's steps (`read-it › confirm › workers › ask-it`) until its sheet says otherwise; `/thegraph-codex` is not followed. Inside Herdr (`$HC_TERMINAL_ID` set) the conductor's chip carries its children, `#37 ✓ [ #38 ◐ ] #39 ·`: each child of the sheet's `## Children`, or with none the one worker under the run id, its state from `hc ls --json` (asked after each main-thread tool call's result and every 5 s), a child whose worker terminal is live a button (`a s d f …`), and the chip names the child at work, else the anchor. A session in a worker terminal (`tg-<run id>-<slug>`, from `hc get`) is followed with no prompt: `worker #52 make-it`, its issue from its brief (looked for in the thegraph temp folder every 5 s until found), and `↩ conductor` (`c`) for its `parent`; its `done` or `stuck` sent with `hc send` ends it with that turn, and whatever reaches it next takes it up again. A press on a worker's or the conductor's button runs `herdr-app do agent.focus --terminal <address>`: the buttons are `path-band`'s, and this mod's `ui.press` hook acts on them ([ADR-0099](../docs/adr/0099-a-mod-reads-another-mods-state.md)). A failed `hc` or `herdr-app` leaves the chip as it was. |
