# ADR-0091 — `lens` runs in a fresh agent, and it always runs

**Status:** accepted. Implements #39, narrowed to `lens`.

`lens` carries `context: fork` and `background: false` in its frontmatter, so
every caller (`check-it`'s check 7 and `thegraph`'s open-decision route) gets a
subagent that has never seen the session that did the work. The brief is the
skill's argument. The report is the result. The caller saves it beside the run
sheet, or in the OS temp folder where there is none, and re-opens every
`CONFIRMED` citation at its source before acting on it. `check-it` runs it on
every change, and a skip is reported with its reason.

## The call, and whose it was

The maintainer's, grilled on 2026-10-27. The scope narrowed from all of
`check-it`'s judging steps to `lens` alone, because only `lens` had evidence.
They chose:

- the frontmatter fork over an instruction in `check-it`;
- *always, with a reported reason for any skip*;
- one reader, with the writing session as judge after it re-opens the
  citations, rather than Felix Rieseberg's *N attackers, then a separate judge*;
- the session's model, inherited.

## What it was decided on

- **Run by hand, it found what the writing session missed.** Through the
  session that made this change, a fresh agent given only the brief ran `lens`
  on #37, #41, #43/#46 and #47. It found 3, 5, 5 and 2 defects, and each was
  re-checked at its source before it was fixed.
- **The #44 audit:** of 32 `check-it` runs, the 5 that loaded `lens` all found
  something actionable. Inline passes found something in 2 of about 10, and
  about 17 runs skipped it silently. This was the one delegate the audit graded
  *needed*. Selection bias is likely, since `lens` was loaded on harder runs.
- **Felix Rieseberg:** the current session is a poor judge of its own work, and
  the outside signal should come first.

## Measured on the change itself

The edited `lens` was invoked once on this change, as its own completeness read:

- **It forked.** The tool reported a *forked execution*. The agent said it could
  see none of the invoking conversation. The brief arrived as the trailing
  `ARGUMENTS:` line, as the skills doc describes.
- **`disallowed-tools` did not reach the fork.** Edit and Write were still in its
  tool pool. The doc says the key applies *while the skill is active*, and it
  never says the key reaches a forked subagent. The key was removed. **Read-only
  now rests on `lens`'s own sentence**, *edit nothing and write no file*, which
  is also why the caller, not `lens`, writes the report file.
- It also found that this record was cited before it existed, and that a
  standalone `check-it` had nowhere to save the report. Both were fixed.

## Not decided here

- `assay` and the other delegates are #44's audit.
- `decant` still calls `lens` with a thin brief. It retires in #44.
- `agent: Explore` or `Plan` would remove the editing tools, but they start
  without `CLAUDE.md` and read excerpts rather than whole files, which `lens`'s
  *read every corpus end to end* rules out.
