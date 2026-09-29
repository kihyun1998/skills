# ADR-0077 — An always-loaded document keeps its rules, and the history leaves

**Status:** accepted.

`winnow` cuts a document an agent loads on every run — a repository's
`CLAUDE.md`, an `AGENTS.md`, a skill body — down to what every run needs. It
exists because one such cut was done by hand and the order it needed was not
obvious until the second pass. The instructions are in
[`winnow/SKILL.md`](../../winnow/SKILL.md), once; this record holds the evidence.

## The case it was cut from

A private work repository's `CLAUDE.md` had reached 933 lines and 66 KB, loaded into every session.
Most of the volume was not rules. It was the evidence behind them, told as
stories: *"Measured 2026-08-21 …"*, *"this paragraph said `src-tauri/target/`
until 2026-09-02"*, a 69-hour broken-build narrative, counts of files that had
once carried CRLF.

- **First pass, detail moved verbatim.** 933 → 234 lines in `CLAUDE.md`, with
  721 lines moved into eight task-branch docs. The size dropped; the stories
  moved with it.
- **The maintainer then asked why dates and ADR ids were kept at all.** The
  answer was that they did not need to be: version control keeps history, and a
  document restating it drifts from it. Rewriting the eight docs without history
  took them from 721 to 417 lines, and nothing an agent acts on was lost.
- **What was kept** was the `NUMBER` shape: a value a decision turns on. A 3.19
  headless / 2.71 headed contrast reading is why no contrast floor is gated;
  someone re-adding one needs it. The count of CRLF files is not needed by anyone.

## Why the order is what it is

- **History is asked last**, as in `decant` (ADR-0076): a wrong move costs a
  lookup, and a wrong drop costs a measurement. The first pass would have dropped
  the contrast reading along with the CRLF counts if "is this a story?" had been
  asked before "does a decision turn on this value?".
- **The stop before writing is the maintainer's.** Which history can go was the
  maintainer's call in the case above — the first pass had kept it on the
  assumption it mattered. So the report quotes every `HISTORY` part in one line
  rather than counting them.
- **The proof step compares against version control, not memory.** In the case
  above the first rewrite silently dropped an annotated directory tree, the notes
  under a table of doc pointers, and a title-bar history. A size comparison could
  not see it; a section-by-section read of the old file against the new files
  did.
- **Repointing is its own step.** Twenty-odd files in that repository cited
  `CLAUDE.md`. Three named a section that no longer existed — one in a test's
  failure message — and those were the ones that would send a reader nowhere.
  The vague ones ("per CLAUDE.md") still resolved.

## What it does not do

- It does not touch source comments; `decant` does.
- It does not rewrite decision records. They are where history belongs, and this
  repository keeps superseded records with a banner by its own rule.
- It does not decide which directory holds detail docs when a repository has
  none; it proposes one named for the task branch and asks.
