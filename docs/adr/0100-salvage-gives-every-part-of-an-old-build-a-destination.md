# ADR-0100 — `salvage` gives every part of an old build a destination

> **Amended on 2026-11-17 (#62).** Point 7 below, which says to run
> `grill-the-graph`, then `grill-map`, now holds for a `theflow.md` only. For an
> old build, `salvage` says to run `grill-map` alone: `grill-the-graph` stops on
> an old build and points at `salvage`, so naming it sent the maintainer between
> the two with neither running. `grill-map` has no stop on an old build and makes
> the folder, the hub and the notes itself in its init mode. The maintainer chose
> this on #62; `grill-the-graph` runs after `salvage` has cleared the old build.
> Where both an old build and a `theflow.md` are present: `salvage`, then
> `grill-map`, then `salvage` again. The grilled order ran `grill-the-graph` in the
> middle; it writes only a hub stub, no notes, so the second `salvage` would have
> stopped on the same condition. Decision 7's destination, the map, is
> unchanged.

**Status:** accepted. Implements #51. Extends [ADR-0096](0096-salvage-clears-a-left-theflow-md.md),
whose table now serves an old `thegraph.md` as well; relates to
[ADR-0094](0094-an-older-build-is-found-by-its-stamp.md) and
[ADR-0065](0065-this-repos-thegraph-build-is-retired.md).

A dry run on an old stamped build found six cases where `salvage` gave no answer.
Seven points settle them. A part of an old `thegraph.md` that no destination
names goes where the `theflow.md` table sends the same kind of part (the table is
shared, not restated). A divergence row citing only an issue moves to the map with
its issue number. A ring-1 file a later commit touched still goes to ring 3, shown
with that commit's hash and subject and grouped by commit. A per-layer tie-breaker
goes to the References' Binding column; a one-sentence one is still dropped.
Informs and Binds are asked before Process 4, one question per source. A ring-2
line naming a file rewritten at the same path is kept or rewritten, never deleted.
Where parts would go to map notes and there is no map with notes, the run stops
and says to run `grill-the-graph`, then `grill-map`.

## The call, and whose it was

The maintainer's, grilled on 2026-11-17 on #51. Each of the seven points is their
judgement, and falls only to them. Point 7 was added during the grilling.

## What it was decided on

- **A dry run on `mobile_init_project`** (2026-10-28, during #50), up to the list
  the skill shows before deleting. The facts behind each case come from that
  report; they were not re-measured in the grilling or in this change.
- **ADR-0096's rules for `theflow.md`**, which these points apply to an old
  `thegraph.md`.

## What it did not cover

- Whether a commit touching a generated file is a bug fix or a person's edit: the
  rule stays, so the maintainer is asked each time.
- Behaviour of `grill-the-graph` and `grill-map`; `salvage` only names them.
- Neither repository holding an old build (`portfolio`, `mobile_init_project`)
  was run again after this edit.
