# ADR-0103 — What a step makes, it deletes; `clean-it` holds the rules and finds what was missed

> **Amended 2026-11-23 for #136, and that amendment reversed 2026-11-23 by
> #142: there is no shared build folder.** #136 moved the one build folder per
> repository beside the repository, shared across runs and kept; #142 removed
> it. A build goes inside the tree it builds (the main tree, a run's worktree,
> a review or proving copy) and is deleted with that tree, as
> `clean-it/RULES.md`'s *Builds* says, so where this record shares one build
> folder per repository within a run, that part no longer holds. The records of
> those calls are #136's and #142's decision comments.

> **Amended 2026-11-24 for #138: the ledger is only appended to.** A deleted
> item no longer keeps its line with its size appended; it gets a new line,
> `<path> | deleted, <size>`, and readers pair the lines by path, because
> concurrent `check-it` reviewers rewrote the shared ledger whole to mark
> their own line and dropped lines others had appended. A hook under
> `check-it-reviewer` and in a `thegraph-herdr` worker refuses any write to a
> ledger but an append. `clean-it/RULES.md`'s *The ledger* holds the format;
> the record of the call is #138's decision comment.

**Status:** accepted, amended 2026-11-23 and 2026-11-24 (the banners above). No issue of its own: the maintainer's grilling of
2026-11-20, in a `/thegraph-herdr` conductor session. Extends
[ADR-0080](0080-a-run-keeps-a-run-sheet-while-it-lasts.md) and amends
[ADR-0091](0091-lens-runs-in-a-fresh-agent.md) and
[ADR-0102](0102-check-it-reviews-are-a-catalog-chosen-per-change.md).

A new user-invoked skill, `clean-it`, holds `RULES.md`, the one copy of the
cleanup rules. Every skill here that makes copies, builds, tool state, installs,
worktrees or processes points at it instead of restating it. A step writes a
**ledger** line when it makes something heavy, deletes it at its own end and
writes the size freed; one build folder per repository is shared within a run;
tool state goes to a set place. `clean-it`, run by a person, measures known
places only and deletes only what the person confirms.

## The call, and whose it was

The maintainer's, every part of it: a new skill, a ledger with the line format
and where it lives, deletion at the step's end with the size, processes killed
only by the run folder's path in their command line, one shared build folder per
repository, tool state in a set place, what `clean-it` deletes after a
confirmation and what it only measures, and that it never sweeps the disk.
Deleting anything now was left out: the person had already cleaned up.

## What it was decided on

- **The drive filled.** Measured by another session on 2026-11-20: C: had
  7.1 GB free and `%LOCALAPPDATA%\Temp` held 151.8 GB. Session scratchpads
  79.6 GB (a Rust `target` built several times in one session, 41.7 GB for
  one repository's three target folders; Flutter builds; `node_modules`), TLC
  state 25.3 GB from the #78 trial, review and proving copies of one repository
  24.7 GB, probe leftovers about 9 GB.
- **No skill said to delete what it made.** `lens`, `comment-it`, `check-it`
  and the proving agent said only to work in the OS temp folder (#93), which
  moved the leftovers out of the repository and left them on the disk.
- **TLC leaves its state after a run that passed.** Run on 2026-11-20 with
  `tla2tools.jar` v1.7.4: each run left a timestamped folder under `states/`
  beside the spec, or under `-metadir` where given; `-cleanup` removed the
  earlier runs' folders and kept the current one. TLC unpacks its standard
  modules into `java.io.tmpdir`, and a missing folder there stops it; the JVM's
  `hsperfdata_<user>` does not follow that setting (on Windows it follows `TMP`
  and `TEMP`). The first draft of the rules got both wrong; the review run with
  the change reproduced them. `statechart` already sends
  its state to its own temporary folder and deletes it, so the 25.3 GB most
  likely came from TLC run directly; that was not reproduced.

## The shape

- **One copy of the rules, pointed at.** Restated in a dozen files, the rules
  would drift the way a copied rule has drifted here before (ADR-0056); each
  skill carries one sentence that names what it makes and points at
  `clean-it/RULES.md`.
- **The line is written when the thing is made.** A step stopped half way
  leaves a line naming what to look for; a ledger with an open line is a run
  that did not end. A deleted item keeps its line, with its size, as the record
  of what was freed.
- **Everything under one run folder.** `<run sheet>.made/` in a `thegraph` run
  (the conductor's, shared by every worker, in a `thegraph-herdr` run), `made/`
  in the scratchpad otherwise, so one path deletes it and one path tells the
  run's processes from the person's. Each step works in a folder of its own
  inside it and never deletes the run folder itself: in the run that wrote this
  change, one review deleted the run folder while another was working in it.
- **Outside a `thegraph` run, the run's end is the session's end, read as the
  final report.** The maintainer's call was *deleted when the run or session
  ends*; nothing an agent can see marks a session's end, so the moment it hands
  the finished task back is taken for it, a derivation, not the maintainer's
  call. A first draft deleted builds at each step's end there instead; the
  review found that it broke the shared build folder and departed from the call.
- **`clean-it` is user-invoked.** Nothing has to reach it on its own: steps
  follow the rules file, and a person runs the sweep when the disk fills.
- **The generated verify skills say it in their own words.** They live in other
  repositories, which may not have this catalog.

## Not decided here

- Whether a hook should check for open ledger lines at a session's end.
- Deleting the statechart tests' own temporary folders, which carry no owner
  marker.
