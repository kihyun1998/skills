# ADR-0093 — User-level instructions are distilled from feedback, kept here, and linked

**Status:** accepted. Implements #42, reframed at triage.

`docs/environment/CLAUDE.md` holds the maintainer's working preferences that hold
in every project, at most 20 lines. `scripts/install-skills.sh` links it to
`~/.claude/CLAUDE.md` and `$CODEX_HOME/AGENTS.md`, the documented user-level
instruction files of both agents. Where each line came from is in
`docs/environment/user-instructions.md`, which nothing loads.

## The call, and whose it was

The maintainer's, grilled on 2026-10-28. #42 had proposed a `grill-the-graph`
feature that distils standing answers. The maintainer chose instead:

- **a one-off distillation**, not a feature;
- **sources:** the 39 `feedback` auto-memories, plus a month of corrections
  (answers that departed from the recommendation, and messages correcting how the
  assistant worked);
- **the bar:** two or more projects, plus one line the maintainer asked for
  directly and one inferred line they adopted. A rule a skill already holds still
  qualifies, because a skill's rule applies only while that skill runs. Skills keep
  their copies. This reverses #42's first bar (*not already enforced by a skill*),
  which was set before the corrections showed where they came from;
- **the source lives in this repository and is linked**, rather than written into
  `~/.claude` by hand, so it is versioned and the same on every machine. Codex gets
  the same file;
- **each line adopted one at a time.** Felix Rieseberg's third pass, *principles
  you believe but don't know you believe*, was drafted by the model and put to the
  maintainer one candidate at a time. One was adopted in a form the maintainer set:
  ask before checking a claim of theirs. Three were dropped;
- **cleanup:** memories duplicating a line are deleted now. A repository's
  `CLAUDE.md` loses such a line on its next `grill-the-graph` update, which now
  shows it as a removal. `winnow` counts it as said elsewhere.

## What it was decided on

- **Auto memory is per repository** (`code.claude.com/docs/en/memory.md`), and no
  user-level file existed on this machine. The same preference had therefore been
  recorded once per project: Korean questions in 3, English artifacts in 3.
- **The corrections:** 69 sessions, 1,337 user messages, 450 question-tool answers,
  read by a fresh agent and grouped into 19 recurring themes. Six of them had no
  memory anywhere.
- **Most corrections came from sessions outside any skill**, which is why the skill
  rule did not disqualify a line.

## Consequences

- Every Claude Code and Codex session on a linked machine loads the 20 lines.
- **Claude Code skips a symlinked `~/.claude/CLAUDE.md` in Cowork desktop sessions**
  (same doc). On Windows the link is a file symlink and needs Developer Mode; the
  script fails loudly rather than copying.
- A real file already at either path is reported and left alone. `--replace-copies`
  moves it aside.
- **Of 51 memory files, 18 were deleted** in the same pass. A full audit graded each
  one against the new file, its repository's records, and staleness. A backup was
  taken first. The keeps that carry project-specific exceptions stay.
- Not measured. Whether a correction recurs after this is the measure, at the
  next distillation.
