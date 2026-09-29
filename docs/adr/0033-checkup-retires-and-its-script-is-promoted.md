# `checkup` retires, and the one part of it that ever ran becomes a script

`checkup` asked whether a repo's written agent artifacts were still true and still
current, in three tiers. It is retired to [`retired/`](../../retired/checkup/), and
its mechanical tier is promoted to [`scripts/map/`](../../scripts/map/).

The decision rests on measurement, not on taste.

## What was actually running

| | Evidence |
|---|---|
| `.checkup.json`, which the skill calls *"the whole portability story"* | **does not exist in any repository** — six of them hold 222 map notes between them |
| The skill itself | **referenced by no `CLAUDE.md` and no `docs/agents/`** anywhere |
| `check_map.py` | **runs in CI**, in `justrdp`, with `--selftest` as its own step |
| …but through the skill? | **No.** Vendored to `.github/scripts/check_map.py`, and at 507 lines against this repo's 773 it is a fork, not a copy |

So the script earns its place and the skill does not deliver it. The one place
that wanted the check reached past the skill and took the file.

## The other two tiers were squeezed out from both sides

- **Stamp tier** — settled: a behind stamp with no missing slot is
  *informational*, not stale. The rule was written here and had no other home;
  retiring the skill promoted it to
  [ADR-0041](0041-a-behind-stamp-with-no-missing-slot-is-informational.md).
- **Schema tier** — `grill-the-graph` re-reads `build_gaps` from past runs as its
  own drift detector, on the stated grounds that without it *"the graph drifted"*
  is a condition nobody is positioned to notice.
- **Semantic tier** — never a gate by its own admission (*"the check no gate can
  do"*). It is a paragraph of guidance, and it moves to the script's README where
  someone reading a failing run will meet it.

And one tier it **declared and never delivered**: its opening sentence claims
`grill-the-graph`'s output as *"`docs/agents/thegraph.md` **plus generated agents
and scripts**"*, while its first process step looks only for the three docs.
Artifacts were never checked. That gap is what a live `thegraph` repository is
currently paying — a generated lens carrying the grade table inline, which the
fixtures say fails, and which no tier of `checkup` would have reported.

## Why the script and not the skill

The check belongs in **CI**, and CI cannot reach a skills directory. A skill is
reachable by a person typing `/checkup`; a gate that matters runs whether or not
someone remembers to type anything. `justrdp` demonstrated the right shape by
accident: vendor the file, run `--selftest` then the check, two steps, every push.

`scripts/map/README.md` carries what the skill knew and the script did not say
aloud — the CRLF split, the anchor rules, the do-not-re-implement warning with its
three failed ports, adjudicate-don't-fix, and the fact that a run which inspected
nothing is not a pass.

## What is genuinely lost

**Nothing checks a map except this script**, and that was true before today.
`thegraph`'s `map` node *reads* a territory map and never verifies it, and
`sweep`'s surface list does not name maps at all. Retiring the skill does not
change that; promoting the script keeps the only answer there is.

Two consequences worth naming rather than discovering:

- **196 of the 222 map notes are unchecked.** Only `justrdp`'s 26 run in CI, and
  against an older fork of the script. Copying the current one forward is the
  cheapest available improvement to that number.
- **`sweep` does not name maps as a surface.** A map describes what moves when you
  touch something, so it goes stale exactly when behaviour moves — which is
  `sweep`'s trigger. That reads as an omission rather than a decision, and it is
  recorded here rather than fixed, because it is a separate change.

## Consequences

- **`/checkup` stops resolving** after the next install run. Nothing referenced it,
  so nothing breaks.
- **The listing budget drops by 1,342 characters**, its description's full length.
- **`scripts/map/` is the home**, with `check_map.example.json` beside the script
  rather than at a repo root under a name that only made sense as a skill's config.
- **The skill stays readable** under `retired/`, because a `.checkup.json` written
  against its rules may still exist somewhere and someone will need to read what it
  meant.
