# ADR-0084 — `check_map.py` retires

**Status:** accepted. Settles what [ADR-0083](0083-grill-map-runs-no-map-checker-and-offers-to-remove-one.md)
left open, and amends [ADR-0033](0033-checkup-retires-and-its-script-is-promoted.md),
which promoted the script to `scripts/map/`.

`scripts/map/` moves to [`retired/check_map/`](../../retired/check_map/), with its
README and example config. It is frozen there like a retired skill
([ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md)). It stays
readable, because vendored copies of it still exist in other repositories.

## The call, and whose it was

The maintainer's, on 2026-10-25, the same day as ADR-0083.

## What it was decided on

- **Nothing runs it.** ADR-0083 took the last runner out of `grill-map`. No
  other skill, script or workflow here names it.
- **A live script nothing runs is an invitation.** Left in `scripts/`, its README
  still told a reader to vendor it into CI, which is the opposite of what
  `grill-map` now does with a copy it finds.

## What still points at it

The old path `scripts/map/` still appears in decision records and in
`retired/checkup/`. Those files are records and stay as written. The live
references (`README.md`, `retired/README.md`, `grill-map/SKILL.md`) point at the
new place.
