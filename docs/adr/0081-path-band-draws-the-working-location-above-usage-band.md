# ADR-0081 — path-band draws the working location on its own line above usage-band

**Status:** accepted.

A new mod, `path-band`, shows **where the agent is working now** and on which
branch. It draws one line of its own above `usage-band`, as two chips:
`[ skills/mods/usage-band ] [ main ]`.

## The call, and whose it was

The maintainer's, on 2026-10-20. They chose this from a prototype with four placements,
kept on the `prototype/path-band` branch (`47762e9`), never merged:
*"A가 나음"*, then the chips, the cut and no moved-from marker, each picked
from the options put to them.

## What it was decided on

- **Two problems, one line.** With several Orca worktrees and sessions open, it is
  unclear which window is which. And when the agent moves with `/cd` or
  `EnterWorktree`, the move goes unnoticed. So the line follows the agent's
  location rather than the session's starting one.
- **Nothing showed it.** Neither mod draws a path or a branch, and the repository
  has no record of the ccusage statusline that `usage-band` replaced ever showing
  one. So nothing was dropped on purpose.
- **Its own line, not `usage-band`'s.** The prototype tried the line in three
  places:
  - Merged into `usage-band`'s context head, the location takes a third of the
    width and pushes the model and cache out at 120 columns. It also puts something
    that is not usage into the usage mod.
  - In `PromptHint` it costs no row, but that slot takes one dim string, so it can
    hold no chip.
  - Its own line is what was left, and the band's ordering rule (`7cac533`)
    already places it: above `usage-band`, below any other band.

## The shape

- **What is shown.** The **working location**: the worktree's name inside a
  worktree, otherwise the repository's name, followed by the path relative to it.
  Outside any repository the path is shortened with `~` and no branch chip is drawn.
- **The branch.** Its name only, because dirty marks and ahead/behind would mean
  running `git status` over and over. A detached HEAD shows its short SHA in the
  warning colour, with a dim `detached` outside the chip.
- **Chips, no glyph.** `⎇` was tried and rejected (*"⎇ 가 너무 마음에 안듬"*). A
  chip is a `Text` with a background and a space at each end; the corners are
  square, because a terminal draws whole cells. Its colours come from theme keys
  or `inverse`, not hex, so a light theme still reads.
- **When it does not fit, the path gives way.** The branch chip stays whole, up
  to 40 cells (the same limit `thegraph-panel` puts on a run name), and the path
  is cut at its start with `…`, keeping the folder the agent is in.
- **No moved-from marker.** The line changing is the signal. Showing where the
  agent came from would need the exact moment of the move.

## Measured while building it

On Claude Code 2.1.304, in this session, with a probe that logged each source
after every main-thread tool call:

- **A shell `cd` moves `$.session.cwd()` and nothing else.**
  - `$.session.root()` stayed at the repository root.
  - `CwdChanged` did not fire.
  - So the line follows `cwd()`, which the ADR had left open between the two. The
    second problem above, a move by the agent going unnoticed, asks for exactly
    that.
  - A `cd` outside the project is reset to the project root by the harness, so the
    line shows that reset.
- **One call late.** Inside the `tool.call` hook of the call that ran the `cd`,
  `cwd()` still reads the old folder. The next call reads the new one. So each
  main-thread call is checked again one second after it ends, and the probe saw
  the line right after that check.
- **Refresh** is `thegraph-panel`'s pattern:
  - `.git/HEAD`'s `mtimeMs` is looked at after each main-thread tool call, after
    that one-second recheck, and on a 30-second tick.
  - `HEAD` is re-read only when that time changes.
  - No process is started.
