# ADR-0099 — path-band draws thegraph-panel's run as one chip

**Status:** accepted. Amends ADR-0080 (giving a run up), ADR-0081 (what
`path-band`'s line carries) and ADR-0098 (`thegraph-panel` follows its runs).

While a thegraph run is open, `path-band`'s line carries the run after the path
and branch chips, folded into one chip:

```
[ skills/mods ] [ main ] [ thegraph #52 make-it ◐ 4m ]g
[ skills/mods ] [ main ] [ herdr #38 workers ◐ 12m ]g #37 ✓ [ #38 ◐ ]a #39 ·
[ skills/mods ] [ main ] [ worker #38 check-it ◐ 2m ]g [ ↩ conductor ]c
```

`thegraph-panel` no longer draws a line of its own. The chip names the run's kind,
the issue the branch's commits are for now, the step at hand and the time in it.
A conductor's children follow it, and a worker's way back to its conductor. The
dim letter after each button is its hotkey on the main screen. `path-band` works
none of this out itself. It reads one value that `thegraph-panel` keeps for it,
`{ plugin: 'thegraph-panel', key: 'chip' }`, with `$.state.get`. A press on the
chip or on one of its buttons is `thegraph-panel`'s to act on. This is the first
time in this repository that one mod reads another mod's state, or acts on
another mod's Button.

## The call, and whose it was

The maintainer's, on 2026-11-16, in issue #52, in two steps:

- The issue chip reads the panel's state rather than the run sheet. In a cluster
  it names the child being worked on.
- Then, from a prototype of three variants, the maintainer chose to fold the
  whole panel line into that chip. The three variants were:
  - **One folded chip** (chosen).
  - **The chip plus the old trail**: every step in order, and `[ ▸ pane ] [ × ]` at
    the right.
  - **The issue inside the branch chip** (`[ main ▸ #52 ]`), with the steps as dots.

What the chosen one gives up: the line no longer shows the steps still to come
(`check-it › ask-it`), a step begun twice (`×2`), the last failed test or the
signals. The pane shows them.
The pane opens from the chip (`g`), and giving a run up moves into the pane as
`[ clear run × ]` (`x`).

The keys are the maintainer's too:

- `g` presses the chip, `c` presses the way back.
- `a s d f …` press the children's buttons, in list order.
- Digits were turned down, because a bare digit typed into an empty composer
  presses a band button (`mods/ENGINE-NOTES.md`), so a reply of `1` would move the
  window. The chip and the live workers' buttons are drawn as primary buttons.

Derived:

- **One value, derived by its owner.** `thegraph-panel` already parses the run
  sheet, the worker's brief and `hc ls`. A second parser in `path-band` would be a
  second place to get the run wrong. So the panel writes the chip's words and its
  children, and `path-band` draws them and reads nothing else of the panel's.
- **Written as state, not a derived value.** `derive` caches inside the plugin
  that declares it (the `Derived` doc comment, Claude Code 2.1.292 types), so
  another plugin cannot read it. The chip is a plain `$.state` value. It is
  written whenever the run, its workers or the clock change, and only when it
  changed.
- **What the chip names.**
  - The issue: for a herdr conductor, the child whose worker terminal is live and
    not `done`, else the anchor. For a herdr worker, the worker's own issue. For
    `/thegraph`, the sheet's issue. Before any of these, what followed the command
    on the prompt.
  - A worker that is `idle` while its question waits on the person still counts as
    the one being worked on, because the next commit on the branch is still that
    child's.
  - A finished run's chip says `done` until the next prompt, as the panel's line
    did. With no run there is no chip.
- **Who acts on a press.** `path-band` draws the Buttons with fixed keys:
  `thegraph`, `thegraph-worker-<address>` and `thegraph-conductor`.
  `thegraph-panel` hooks `ui.press` for `{ plugin: 'path-band' }` and acts:
  - The chip opens or closes the pane.
  - A worker or conductor button runs `herdr-app do agent.focus --terminal <address>`.

  The panel takes the press, so `path-band`'s own closure never runs. It acts only
  on an address the chip it wrote names. This is the engine's documented way for
  one plugin to answer another's Button ("Another plugin addresses one button by
  matcher", `UiPressArgument`, Claude Code 2.1.292 types). Two alternatives were
  turned down:
  - `$.command.run` waits for the session to go idle, so a press mid-turn would
    wait for the turn to end.
  - Writing a press into `path-band`'s state for the panel to notice would mean
    hooking another mod's `state.set`.
- **Narrow terminals.** The path keeps 12 cells (`PATH_MIN`) and the branch stays
  whole up to 40, as before (ADR-0081). The run gives way first, in this order:
  1. The chip drops its time.
  2. Then its step.
  3. Then its kind, which leaves the issue alone.
  4. The children that are no button go.
  5. Then the rest of the children go, and the way back shortens to `↩`.

  Under all of that, the path is cut further.

## What it was decided on

- **The engine allows it.** In the `state` doc comment of Claude Code 2.1.292's
  types, any plugin reads any value and only its owner writes it. A `get` made
  while a `ui.render` hook draws subscribes that drawing, so the owner's write
  draws `path-band` again with no polling.
- **The two mods stay installable on their own.** A value never written reads as
  `undefined`, which is also what `path-band` reads when `thegraph-panel` is not
  installed or not enabled. Both cases draw no chip, as does a value of another
  shape. Neither mod lists the other in `plugin.json`. Without `path-band`,
  `thegraph-panel` keeps its spinner text and turn lines, but nothing on screen
  shows the run or opens its pane.
- **The contract is written twice, on purpose.** `thegraph-panel`'s
  `types/index.d.ts` declares `chip: Chip | null`. `path-band`'s `types/index.d.ts`
  declares the same key and shape under `'thegraph-panel'`, and only that key, so
  it typechecks on its own. The Button keys are part of the contract and are
  written in both files. Change the shape or a key in both places, or `path-band`
  draws what its owner no longer writes or presses what its owner no longer answers.

## Measured

- `herdr-app do agent.focus --terminal <address>`, run through a mod's
  `$.process.run`, moves the person's window, as it does from a shell. A
  throwaway mod loaded with `claude -p --plugin-dir` on Claude Code 2.1.325 ran it
  on 2026-11-16. `herdr-app status` read the focused agent before and after it,
  and the agent had moved. That call is what the worker and conductor buttons run.
- `hc ls --json` answers `{ "terminals": [...] }` with `status` a string, and
  `hc get <t> --json` answers `status` as an object (`{ app, msg, state }`). So the
  panel reads a worker's status from `hc ls` only, and from `hc get` only the
  `name` and `parent` of its own terminal.
- `claude plugin test` cannot make a press on another mod's Button. A test loads
  only the mod under test. A test's own hooks cannot draw a Button: the engine
  refuses it with "is not held by a plugin of this chain" (2.1.325). So the
  panel's tests check the press through `pressOf`, the function its `ui.press`
  hook calls, and `path-band`'s tests check the keys it draws.
- Not measured: a press on the chip in an interactive session, so a press crossing
  from `path-band` to `thegraph-panel` has not been seen on screen. Whether the
  pane it opens is placed at any width, as one the person asked for, has not been
  seen either.
