# `grill-code` is retired

## The call, and whose it was

The maintainer's, made on use: *"grill-code, I'm not going to use this any more —
retire it."* It moves to [`retired/`](../../retired/) and is no longer installed,
by the mechanism [ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md)
established — the folder move *is* the uninstall, because the install scripts
scan top-level directories and prune links whose `<name>/SKILL.md` has gone.

**This is a product judgement, not a derivation**, and the difference matters for
how it can be reversed. Nothing measured `grill-code` as defective, nothing
superseded it, and no rule required this. It stopped being used. A derivation
falls to a better derivation; this falls only to the person who made it, and
reversing it costs one `git mv` back.

## What it was shown against

The call was made while looking at something else. `grill-code` had surfaced in
the #39 cluster's audit as one of three skills whose `description` exceeds the
1,024-character maximum the skill-authoring guidance states — 1,107 characters,
44.7% of it body rules that its own `SKILL.md` already carries. A rewritten
description had been prepared and was about to be applied.

Recorded because it is the alternative that was on the table: the skill could
have been kept and its description fixed. It was not kept, and the rewrite was
never applied. The over-limit finding now covers **two** skills, not three.

## What retirement leaves behind

**Its three decision records stay live.** [ADR-0002](0002-grill-code-is-standalone.md),
[ADR-0003](0003-grill-code-learning-mode-uses-its-own-value-axis.md) and
[ADR-0005](0005-grill-code-defect-modes-report-strengths.md) describe decisions
that were made and are not unmade by the subject being retired. They keep their
cluster in `cluster.py` for the same reason: a vacated number is never reused,
and these are not vacated.

**`to-html` loses its only declared consumer.** `grill-code` was the sole skill
with `requires: [to-html]`. `to-html` stays live — it is invoked directly, not
only through `grill-code` — but nothing now declares it, so a future reader
should not read the empty reverse-dependency set as evidence it is unused.

**One reference the gate still cannot see travels with it.** `grill-code`'s
description names `grill-me`, a third-party skill installed under
`~/.claude/skills` and declared nowhere in
[`skill-dependencies.md`](../agents/skill-dependencies.md). The prose scan covers
retired documents too, so retirement does not discharge this; the gate misses it
because *"Distinct from"* is not one of the scanned dependency phrasings. It is
recorded in [`skill-authoring.md`](../skill-authoring.md) as a known violation
and is a separate call.

## What it does not touch

The reports `grill-code` wrote are files in consuming repositories and are not
this repo's to reach. Nothing in the catalog reads them, and no other skill
depends on `grill-code` running.
