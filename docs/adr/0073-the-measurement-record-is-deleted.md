# ADR-0073 — The skill-shape measurement record is deleted

**Status:** accepted.

`docs/skill-shape-measurements.md` (41 KB, 711 lines) is deleted. Two findings
move into [`skill-authoring.md`](../skill-authoring.md), which is where positions
live.

## The call, and whose it was

The maintainer's, immediately after
[ADR-0071](0071-thegraph-is-four-skills-in-order.md): *"skill shape measure
없애는게 낫지. 헷갈리니까."*

**Confusing rather than wrong**, and that is the accurate complaint. Nothing in it
was false when written. Most of it measured things that no longer exist.

## What it held, and what happened to each

| | |
|---|---|
| `thegraph` anatomy — section byte counts, per-node sizes, the per-node-file rejection | subject deleted (ADR-0071) |
| Skills observed being run — 24 cells across six evaluations, two model tiers | all six evaluations deleted, three with the build they queried (ADR-0065) and three with the rules they tested |
| `spec-kit` structural comparison | about a graph this method no longer has |
| Four-corpus statistics | **kept**, condensed |
| Four disproved hypotheses | **kept**, condensed |

## Why the two survivors moved rather than stayed

The file's own reason for existing was that *numbers go there, positions go
here*. That split held while the numbers were about a live design. What is left
after the deletions is **not numbers about anything current** — it is two
positions that happen to have been reached by counting: this catalog's
description median against `mattpocock`'s 179, and four things measured and
disproved so nobody proposes them again.

A position reached by counting is still a position. Keeping a second file for two
of them is the two-homes problem this repo spends most of its rules on.

## What is lost, said plainly

The raw per-file counts, the clone commands that produced them, and the full
evaluation write-ups. Re-running the comparison is a `gh repo clone --depth 1` and
a script; re-running the evaluations is not, because the evaluations are gone.

**The disproved list is the part worth having been kept.** Three of its four had
already been acted on and reverted once.

## Relation to the trail

- [ADR-0057](0057-the-catalog-points-somewhere.md) cites this file for its one
  measured assertion. That citation now dangles, which is the same treatment
  [ADR-0049](0049-a-prose-rule-and-the-pattern-that-reads-it-are-one-design.md)
  gives every record: a record describes the world when it was written.
- `evaluations/README.md` pointed here for results and now says there is no
  destination and no evaluation to produce one — which is true, and truer than a
  pointer at a deleted file.
