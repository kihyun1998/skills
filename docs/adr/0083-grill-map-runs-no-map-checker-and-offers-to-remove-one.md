# ADR-0083 — grill-map runs no map checker, and offers to remove one in use

**Status:** accepted. Its open question was settled the same day by
[ADR-0084](0084-check-map-retires.md): `check_map.py` retires.

Amends [ADR-0082](0082-grill-map-is-rewritten-to-read-the-repo.md)'s
*What stays* line on `scripts/map/check_map.py`.

`grill-map` no longer runs a map checker: not `scripts/map/check_map.py`, not a
vendored copy of it, and not one a repository wrote itself. A **map checker** is
anything that reads the map's notes and fails on their addresses (links,
anchors, symbols, the section set). A general link check over all of a
repository's markdown is not one and is left alone.

Where a repository has a map checker in use, `grill-map` lists its parts (the
script, its config, its tests, the CI steps that run it, and the doc lines that
tell a reader to run it). It then asks the maintainer, recommending removal. Only
on a yes does it remove them. On *keep* it touches nothing, and the next run asks
again.

## The call, and whose it was

The maintainer's, on 2026-10-25: running one costs more than it catches. They
chose the wide scope, every map checker, over `check_map.py` and its copies
alone, which a renamed copy could slip past. They also chose to have a checker
already in use removed after a question and an approval, not left in place.

## What it was decided on

- **It checks the wrong half.** ADR-0082 already found that a checker verifies
  addresses and nothing about claims. In that record a measured refactor decayed
  8%, all of it addresses, and a note passed every gate while contradicting
  itself. The rewrite's done-criterion became a reading test for that reason. The
  checker runs had stayed in it anyway, per note in step 4, after the reading
  test, and as a baseline before a rewrite.
- **Step 4 already follows each link by hand.** It also rereads each symbol, so
  the addresses are still checked without the checker.
- **Asked, not silent.** A repository's CI and docs are the maintainer's, so
  removing a checker is put to them first, like a rewrite of their map.

## What this leaves open

`scripts/map/check_map.py` stays in this repository for now, but nothing in the
catalog runs it any more. Whether it retires is a separate call.
