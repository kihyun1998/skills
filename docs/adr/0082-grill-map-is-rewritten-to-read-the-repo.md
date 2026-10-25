# `grill-map` is rewritten to read the repo; its first version retires

> **Amended 2026-10-25** by [ADR-0083](0083-grill-map-runs-no-map-checker-and-offers-to-remove-one.md):
> the rewrite no longer runs a map checker, vendored or not, and offers to remove
> one in use. The *What stays* line on `check_map.py` below is no longer true in
> its second half.

The first `grill-map` moves to [`retired/grill-map-v1`](../../retired/grill-map-v1/)
and is no longer installed
([ADR-0027](0027-retirement-moves-a-skill-to-the-retired-folder.md)). A
rewrite takes its name, [`grill-map`](../../grill-map/), and writes the same
**MAP** — same location, hub, note kinds and headings — so `read-it`,
`grill-the-graph`'s hub stub and every map already written keep working.
Tracked as #14 and its children #15–#19, #21.

**The rewrite was built and verified as `map-it`** — that name is in the issues,
commits and comments of #14 — and **renamed to `grill-map` on the maintainer's
call (2026-10-22)**, shown two options: keep `map-it` and repoint nine
instructions in other repositories that named `grill-map`, or take the old name
and change none. They took the name, so a hub stub or a `CLAUDE.md` rule written
into another repository that says *"all at once with `grill-map`"* still names a
skill that exists. What the name no longer tells a reader is which version wrote
a given map: the first version stamps `grill-map build stamp` and no
`grill-map synced at` line; the rewrite stamps both.

## What changed in how a map is made

The maintainer did not trust the first version's maps (2026-10-21). Its first
step was a fixed battery of measurements — public-surface counts, record greps,
file-size distribution — and its notion of a finished note leaned on a checker
that verifies **addresses** (links, anchors, that a symbol exists) and nothing
about **claims**. Its own measured refactor decayed 8%, all addresses; it
recorded a note that passed every gate while contradicting itself.

The rewrite reads the repo the way a new maintainer does — README and identity
docs, glossary and decision records, the folder tree as a reading guide, the
entry points, the open backlog, and the caller across the boundary — asks when
the reading does not explain something, and records each answer by provenance:
confirmed and cited, or attributed with source and date. Done is a **reading
test** run by a subagent that sees only the map, not a checker passing. It has
three modes read from disk: init, init over an existing map (old notes as
leads, surviving concepts keep their paths), and update (commits and backlog
since the synced-at stamp, claims re-verified, facts with a second copy made
one owner and pointers).

## How the replacement was decided on

Each mode was run on real repositories by subagents reading only the skill
text, and every place they had to guess became a fix. Then a blind comparison:
a past commit, the old map deleted, the rewrite's init run there; predictors
given only a later commit's subject and confined to one map folder; a separate
subagent judging which notes each real diff touched.

| run | first version | rewrite | verdict |
|---|---|---|---|
| #18, `justerm` @ `8888432` | 0.69 | 0.59 | fail — fixes derived, #21 |
| #21, `justerm` @ `7a2fca3` | 0.42 | 0.62 | pass |
| variance, same, 3 runs each | 0.38–0.46 | 0.62–0.66 | ranges do not overlap |
| backlog lines removed from the rewrite's map | — | 0.58 | the margin on change A was the backlog; B and C kept theirs |
| held-out `flutter_table_plus` @ `d8728d8`, pre-registered on #14 | 0.70 | 0.86 | pass (rule-compliant subset: 0.60 vs 1.00) |

Judged recall throughout; the numbers, truth sets and every exposure are on #14.
The maintainer accepted the #21 pass with the backlog caveat stated beside it,
then asked whether it had overfit and chose the three checks below the #21 row
before this retirement; this record is written on those results.

## What it was not decided on

Two repositories, three changes per run, predictors and judges from one model
family. **Init was compared; update was compared once, later.** #18's update
round was not run once its first round failed, and #21 re-ran init only. #23
then compared update on `justable` — init at one commit, update to a later one,
against the repo's own maintained map: 0.605 against 0.611, a fail by its
registered "at least" and parity within run-to-run noise. Init over an existing
map was run and checked but never compared. On the held-out run the rewrite's init
saw ten old note names in `git status` before drafting and, by its cited-path
rule, kept 16 old paths. The mechanical symbol-grain truth was a tie on
`justerm` and could not be computed for Dart. Some rules in the rewrite still
rest on one observed case. The held-out run's selection rule missed an issue
open at its commit (a timestamp compared across time zones as strings); the
subset that obeys the rule gives the same answer. If later use shows the
rewrite's maps losing to a maintained first-version map, that is evidence
against this call, and `retired/grill-map-v1` is there to be read.

## What stays

- **Maps written by the first version** in other repositories stay as they are.
  The rewrite reads them as leads when it runs there.
- **`scripts/map/check_map.py`** stays: it checks any MAP's addresses, and the
  rewrite runs a repo's own checker per note when one is vendored.
- **Hub stubs and comment rules** already written into other repositories name
  `grill-map` and need no change. An old stub is a hub with no notes, which the
  rewrite treats as init.
