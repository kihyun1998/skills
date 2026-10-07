# Engine notes for mods

What Claude Code's mod engine does that its own types do not make obvious,
found while building `usage-band` and `thegraph-panel` on **Claude Code
2.1.292**, each with how it was found.

The API itself is not restated here. The engine writes it for each build,
beside a loaded mod in `.claude-plugin/types/claude-code/index.d.ts`. That file
is current, so grep it, and a copy kept here would quietly go stale. When the
pinned version in `.github/workflows/mods.yml` moves, re-check the entries
marked **measured**: no type will tell you that one of them changed.

How each entry was found:

- **types**: the doc comment in the type file says so.
- **measured**: seen in a real terminal session.
- **test**: a `claude plugin test` run showed it.

## Pressing things

| Fact | How found |
| --- | --- |
| On the terminal, a mouse click reaches a `Button` only in the fullscreen layout. Turn that on with `/tui fullscreen`; `/tui default` turns it off. On the main screen the person presses a Button with `ctrl+x tab` (focus the band), then its `hotkey` or Enter. | types (`ButtonProps`, "where the surface reports clicks (the fullscreen terminal)"); measured; `/tui` from the binary's own usage text |
| `e.viewport.isFullscreen` tells the layouts apart: `false` on the main screen, fixed for the session. Test for `=== false`, because a remote surface can leave it absent until its client reports. | types (`RenderViewport`) |
| A `Button`'s `hotkey` is one digit or one lowercase letter. It works only while the band or pane holds the keyboard, never from the composer, with one exception: a bare digit in an empty composer presses a band button. | types |

## Sharing the band above the prompt

| Fact | How found |
| --- | --- |
| `AbovePrompt` is one tree. A hook that draws without calling `next(e)` hides every band beneath it. To coexist, a hook calls `next(e)` and wraps what comes back. | types ("A hook draws a tree, or passes; one instance"); test |
| This repo's rule for that: `usage-band` draws whatever lies beneath it **above** its own rows, and every other band draws its line above what it got. That way `usage-band` stays next to the prompt whichever hook runs first. | decision, `7cac533` |
| `e.props.bodyColumns` already excludes the engine's `[-]` at the right, which is five cells. Size the tree to it, not to `viewport.columns`. | types |
| The blank row under the band is the prompt's own margin, and nothing removes it. A negative margin on the band makes the engine draw nothing at all. | measured |
| `PromptHint` lands under the permission-mode line. It takes one string, `tail`, drawn dim, so it holds no colours and no Button. | measured; types (`PromptHint.tail`) |
| `$.ui.status` lands between the prompt and the permission-mode line. It takes plain text, prints ANSI codes literally, and prefixes the line with `⚠ <plugin>:`. | measured |
| Colours follow three rules. ANSI names (`green`) follow the terminal's theme. Theme keys (`claude`, `success`, `warning`, `error`) follow `/theme`. Hex values stay fixed. | measured |

## Panes

| Fact | How found |
| --- | --- |
| Where a pane goes depends on the layout. In fullscreen it docks beside the transcript; on the main screen it opens inline, above the prompt. | types (`Pane`) |
| A pane opened by the person's own action (a command they typed, a Button they pressed) is placed at any width. One opened unasked, from `session.start` or a timer, waits until the terminal is 144 columns wide, or 110 for a pane id the person has opened before. | types (`$.ui.open`) |
| A plugin's own `$.ui.close` does **not** run that plugin's own `ui.close` hook, because a hook never runs under its own call. A flag the hook would clear has to be cleared beside the call too. The hook still handles the person's close (the mark, `ctrl+x x`, Esc). | test (`thegraph-panel`) |

## Session state and events

| Fact | How found |
| --- | --- |
| `/clear`, `/resume` and `/branch` reset `$.state` without firing `session.start`. Refill state on `classic.SessionStart` with `source: ['clear', 'resume', 'fork']`, and give that hook a `.catch`. | measured (`usage-band`) |
| A reload is a fresh load: module variables start over, `session.start` fires again, and `$.state` and `$.store` stay. | types; measured |
| `skill.prompt` fires each time a skill is expanded, whether typed as `/name`, called through the Skill tool, or preloaded into a subagent. It carries no `agentId`, so it cannot tell who expanded the skill. | types; review of `thegraph-panel` |
| `prompt.submit`'s `e.origin.kind` is `composer` for the person's own Enter and `bridge` for Remote Control. Notifications, schedules, peer sessions and other plugins each have their own kind. | types (`PromptOrigin`) |
| `turn.complete` carries `agentId` for a subagent's turn and leaves it absent on the main thread. | types |
| `$` may be passed only to functions declared at the module's top level. `claude plugin validate` refuses a closure that passes it on. | validator |

## Testing kit (`claude-code/testing`)

| Fact | How found |
| --- | --- |
| The test's own hooks sit beneath the plugin and stand in for the engine. Register them before the first `$` call. | test |
| A bottom hook answers an operation (`session.usage`, `process.run`, `ui.open`, `ui.close`) with `{ value }`, and a gated or render event with its result. | test |
| Nothing answers `ui.render` unless the test does. A band that calls `next(e)` needs a bottom `AbovePrompt` hook, and that hook is also how to stand in for another mod's band. | test |
| The test's `$.prompt.submit` takes the full input, `origin` included. Pass `origin: { kind: 'composer' }` to act as the person. | test |
| A drawn `Button` keeps its text in `props.label`, not in its children. | test |
| `$.ui.mount({ ..., viewport: { columns, rows, isFullscreen } })` mounts the tree as either layout. | test |
| `expect` has no `toBeCloseTo`. | test |

## Workflow

1. Prototype the look as an HTML page and choose from there; terminal mockups in chat were too hard to tell apart.
2. Write the mod in a hot-reloading session folder, which the `plugin-authoring` skill sets up. Each turn's end reloads it there.
3. Write tests for the behaviour, then break each rule once and watch its test fail.
4. Copy the mod into `mods/<name>/`, leaving out the engine-written `.claude-plugin/types/` and `tsconfig.json`, which are gitignored.
5. Run `node scripts/check-mods.mjs`, then the install script, and commit the mod with `.claude-plugin/marketplace.json`.
6. In the session that developed the mod, avoid `/reload-plugins` after installing. The development copy and the installed copy would both load, and a band would draw twice. A new session loads only the installed copy.
