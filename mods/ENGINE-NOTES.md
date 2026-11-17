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
| A `Button` takes no background colour. `variant="primary"` draws `[ label ]` in the accent colour; `dimColor` draws it dim. | types (`ButtonProps`) |
| One plugin acts on another's `Button` by hooking `ui.press` with `{ plugin: '<the one that drew it>' }` and returning `{ element: e.element }`, which takes the press: the drawer's own `onPress` does not run. A matcher leaf is `===` or a RegExp tested against the value as a string, so `element: /^prefix-/` narrows to a family of keys; what the hook does not act on it passes on with `next(e)`. Not yet seen in a terminal. | types (`UiPressArgument`, `Matcher`) |

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
| A `skill.prompt` hook can add to the text the model reads for a skill: `return { ...result, text: result.text + '…' }` after `next(e)`. It is how a mod hands a run a fact it will rely on, such as a file path to write. | types; test (`thegraph-panel`) |
| Claude Code refuses Code Mode at startup when any enabled mod that is not built in declares a hook on one of 15 events: `tool.call`, `tool.check`, `classic.PreToolUse`, `classic.PermissionRequest`, `classic.PermissionDenied`, `classic.PostToolUse`, `classic.PostToolUseFailure`, `agent.offer`, `agent.spawn`, `session.send`, `classic.TaskCreated`, `classic.TaskCompleted`, `classic.Elicitation`, `classic.ElicitationResult`, `classic.WorktreeCreate`. The match is by event name alone, so a hook filtered to one tool blocks too. A mod here hooks none of them. | the 2.1.325 binary (#56) |
| `session.append` shows every tool call without hooking one of those: door `response` carries the assistant's `tool_use` block (`id`, `name`, `input`), door `tool-result` the `tool_result` block (`tool_use_id`, `content` as the model reads it, `is_error`) with `origin: { kind: 'tool', tool }`. Pair them by id; `agentId` is absent on the main thread. A call the permissions refused comes back the same way, `is_error: true`, its content `This command requires approval`. | measured (2.1.325, headless; `thegraph-panel`) |
| Inside the `session.append` hook of a call's `tool-result` row, after `next(e)`, `$.session.messages()` lists the call's `toolUses` entry but not yet its `result`. It is there 300 ms later and by the next `response` row: `{ type: 'create', … }` for a Write that made its file, `{ stdout, stderr, interrupted, … }` for Bash, the error text for an errored call. So read the record after the hook has returned, not inside it. Calls made in one message bring all their `tool_use` rows first, then the result rows in the order the calls finish, with no `response` row between (one sample of three). Headless, Bash's stored `stdout` is blank again by `turn.complete`; the row's `content` keeps the output. | measured (2.1.325, headless) |
| Under Code Mode the model's own calls are `REPL` and `Poll`, and each call its code makes still fires `session.append`: door `response` with a `tool_use` named `Write`, `Edit`, `Bash` or `AskUserQuestion`, its id prefixed `repl_`, `origin: { kind: 'model', model: '<synthetic>' }`; then door `tool-result`. For those calls `$.session.messages()` never gains a `result`; the transcript file stores their `tool_result` content as `""` and keeps the record only in its own `toolUseResult`. The row's text and mark, measured: a code-made question answered carries text `""` and `is_error` false, so the answer text is not in the row; one put away with Esc carries the rejection text (`The user doesn't want to proceed with this tool use. The tool use was rejected …`) and `is_error` true, the same as outside Code Mode; a code-made `npx vitest run` that failed carries the command's output as text (`Exit code 1 …`) and `is_error` true. A successful code-made `Bash` row's text is not measured (the transcript showed `""` for `echo`). The six rows of one code block (two questions, a shell call, their results) were all appended within one second, after the block ended, although the questions were answered and dismissed at separate moments: while a code-made question box is up a mod has no row for it. Whether a `result` shows later than inside the row's own hook, where it was read, is not measured. Code Mode does not turn on headless: `-p` prints that it only works in the interactive terminal and starts with the ordinary tools. | measured (2.1.325, an interactive session, #57; the headless refusal by `-p`; the row's text and mark, and the timing, 2.1.326, interactive, #58) |
| Outside Code Mode a question answered "B" gives a result row with text `Your questions have been answered: "Q1?"="B". You can now continue…` and `is_error` false; one put away with Esc gives the rejection text and `is_error` true. Text typed while a question box is up answers the box: the engine takes it as the box's typed answer, and the row's text is `The user answered: "Q3?"="…"`. `hc send` refuses to type into a dialog ("typing would answer its dialog"). | measured (2.1.326, interactive, #58) |
| `$.fs` has no watch. A file the model changes with the shell (`sed -i`, a heredoc) brings no Write or Edit row of its own, and a run in bypass mode is told to work that way. Look at the file's `mtimeMs` once each main-thread `tool-result` row is kept, and on a short tick for what no row told of. | measured (penterm runs wrote their run sheets with Bash only) |
| `TurnDuration` (a turn's closing line) carries only `word` and `durationMs`: no turn id. To draw something per turn there, keep it keyed by the `durationMs` that `turn.complete` reports for the same turn. That the two values match is read from the types, not yet seen on screen. | types |
| `Spinner` takes a rewritten `suffix` (the ellipsis after the word), so a mod adds to the line without drawing it. A closing line is extended by placing `await next(e)` in a `Box` beside a `Text`. | types; test (`thegraph-panel`) |
| `prompt.submit`'s `e.origin.kind` is `composer` for the person's own Enter and `bridge` for Remote Control. Notifications, schedules, peer sessions and other plugins each have their own kind. | types (`PromptOrigin`) |
| `turn.complete` carries `agentId` for a subagent's turn and leaves it absent on the main thread. | types |
| A question the model puts in a box (`AskUserQuestion`) neither ends the turn nor brings a `prompt.submit`: the person's reply comes back as that tool call's result. The question is the `tool_use` in a `response` row, the reply its `tool-result` row, and the answers are in the record `$.session.messages()` holds for the call (`answers`, by question). Seen through `session.append` this is read from the types: a question box cannot be answered headless. | measured (a `/thegraph` run in another session, through `tool.call` on 2.1.292); types |
| `$.session.usage()`'s `rateLimits` come from the last API response's headers, and a window drops out once its `resetsAt` passes with no response since; a new or resumed session has none until its first response. `$.session.authorize()`'s `kind` (`bearer` for a login, `api-key`, or null) says whether limits are to be expected. | types (`SessionUsage.rateLimits`, `SessionAuthorization`); the 2.1.294 source |
| A shell `cd` moves `$.session.cwd()` and nothing else: `$.session.root()` stays and `CwdChanged` does not fire. Inside the `tool.call` hook of the call that ran the `cd`, `cwd()` still read the old folder; the next call, or a read a second later, saw the new one. Whether the `session.append` hook of that call's result row reads the new one is not measured, so `path-band` still reads again a second later. A `cd` outside the project is reset to its root by the harness, and headless the shell's directory is reset after every call. | measured (`path-band`, 2.1.304; the headless reset on 2.1.325) |
| `$` may be passed only to functions declared at the module's top level. `claude plugin validate` refuses a closure that passes it on. | validator |

## Testing kit (`claude-code/testing`)

| Fact | How found |
| --- | --- |
| The test's own hooks sit beneath the plugin and stand in for the engine. Register them before the first `$` call. | test |
| A bottom hook answers an operation (`session.usage`, `process.run`, `ui.open`, `ui.close`) with `{ value }`, and a gated or render event with its result. | test |
| On 2.1.292 nothing answers `ui.render` unless the test does, so a band that calls `next(e)` needs a bottom `AbovePrompt` hook. On 2.1.325 a band draws with no such hook, `next(e)` answering an `engine` node. The hook is still how to stand in for another mod's band. | test (2.1.292; `usage-band`, 2.1.325 and 2.1.326) |
| `ui.drawn()` returns each plugin's tree as a part of its own, the root its hook returned stamped `part: { plugin }`. A test's own `ui.render` hook is a part too (`part: { plugin: 'test' }`), drawn after the plugin's under one root `Box`, not inside it; where the plugin put `next(e)`'s result holds `{ type: 'engine', ref }`. With no test hook the root is the plugin's part. So find a plugin's own drawing by `part.plugin`, never by position. On 2.1.292 a test hook's tree came back inside the plugin's, where `next(e)`'s result went. | test (`usage-band`, trees dumped on 2.1.325 and 2.1.326; the 2.1.292 shape from the tests that read it passing there); types (2.1.326, `part`: "set by the engine on each hook's returned root … another plugin's at most as often as `next(e)` handed it, and it may move") |
| Since the tree no longer shows another band's place, a test asks `await ui.keepsBeneath()` whether the plugin kept what `next(e)` answered, and reads the order inside the plugin's own part. With the test's own `ui.render` hook at that site, a plugin that left `next(e)` out makes `keepsBeneath` reject rather than answer `false`. A drawing of a shared site that leaves `next(e)` out, in a test that never calls `keepsBeneath`, gets printed advice. | types (2.1.326); test (`usage-band`, 2.1.325 and 2.1.326); the advice, the 2.1.326 binary's kit |
| The test's `$.prompt.submit` takes the full input, `origin` included. Pass `origin: { kind: 'composer' }` to act as the person. | test |
| A drawn `Button` keeps its text in `props.label`, not in its children. | test |
| `$.ui.mount({ ..., viewport: { columns, rows, isFullscreen } })` mounts the tree as either layout. | test |
| The test's `$.session.append` takes the event whole: `{ message: { type, role, content }, door, origin, uuid }`, and `agentId` for a subagent's row, so a hook's subagent filter can be reached. The kit keeps the row itself: a test's own `session.append` hook that answers without `next(e)` is reported as skipped. On 2.1.292 the kit has no bottom for it and skips a test's answer the same way, so there a test cannot raise `session.append` at all. | test (`thegraph-panel`, `path-band`, 2.1.325 and 2.1.292) |
| The test's `$` has no `$.session.messages`. A test's `on('session.messages', () => ({ value: [...] }))` answers the plugin's read, so the test decides when a call's record is there: at once, later, or never. | test (`thegraph-panel`, 2.1.325) |
| The test's `$.tool.call` takes the tool's fields flat (`{ tool: 'Edit', file_path, … }`), with no `input` wrapper, and cannot set `agentId`. No mod here hooks `tool.call`, so no test here drives it. | test |
| A hand-written fake can carry the module's own mistake, and then the test passes. `$.fs.stat`'s `kind` is `'dir'`, not `'directory'`. A module and its fake both wrote `'directory'` and every test passed, which would have meant no branch in a real repository. Only type-checking the tests against the API caught it, so run `tsc` over `tests` too. | test (`path-band`) |
| `expect` has no `toBeCloseTo`. | test |
| The test's `$` has no `state`: `$.state.get` there throws. To see a value the plugin writes, hook `state.set` beneath it and call `next(e)`; to stand in for another mod's value, hook `state.get` and answer `{ value: { value, version } }`. To stand in for the plugin's own value kept from before a reload, answer it at version `0` until the plugin writes: answered at version `1`, the plugin's `update` of it did not land. | test (`thegraph-panel`, `path-band`, 2.1.325) |
| A value answered by a test's `state.get` hook does not redraw a tree already mounted, as the owner's own write would. Mount again to see a changed value. | test (`path-band`, 2.1.325) |
| A test's own hooks cannot draw a `Button` ("is not held by a plugin of this chain"), and a test loads only the mod under test, so a press on another mod's Button cannot be made in a test. Keep what such a press does in a function the test calls directly. | test (`thegraph-panel`, 2.1.325) |

## Workflow

1. Prototype the look as an HTML page and choose from there; terminal mockups in chat were too hard to tell apart.
2. Write the mod in a hot-reloading session folder, which the `plugin-authoring` skill sets up. Each turn's end reloads it there.
3. Write tests for the behaviour, then break each rule once and watch its test fail.
4. Copy the mod into `mods/<name>/`, leaving out the engine-written `.claude-plugin/types/` and `tsconfig.json`, which are gitignored.
5. Run `node scripts/check-mods.mjs`, then the install script, and commit the mod with `.claude-plugin/marketplace.json`.
6. In the session that developed the mod, avoid `/reload-plugins` after installing. The development copy and the installed copy would both load, and a band would draw twice. A new session loads only the installed copy.
