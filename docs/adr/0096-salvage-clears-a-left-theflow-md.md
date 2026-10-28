# ADR-0096 — `salvage` clears a left `theflow.md` by default, into the map

**Status:** accepted. Implements #50. Amends [ADR-0094](0094-an-older-build-is-found-by-its-stamp.md),
which had `salvage` take a `theflow.md` only when asked.

Running `/salvage` is the request: a `docs/agents/theflow.md` that is there joins
the list. Three things stop its part before any of it is deleted (an old build's
part goes on): no map or build, code that reads the file at run time, and a
recorded decision to keep it. Otherwise its parts go by a table: Step 1's routing
and the tie-breaker to the build's References and their Binding column, the
module map and Steps 2, 4, 6 and 7 to map notes, Step 5's sacred paths to map
invariant notes, what the repository already states dropped with where it is
stated, the war-story index to `lessons.md`, and anything else to the map note it
describes. Lines elsewhere that point at the file are repointed, not deleted. Provenance left behind is pinned to the
commit before the deletion. Search ③ also reads map notes, for sentences that
turn false when the file goes.

## The call, and whose it was

The maintainer's, grilled on 2026-10-28, after they reported that `salvage`
cleared an old build but handled `theflow.md` poorly. Each of the seven points in
#50's *Decided* section is theirs, including two that depart from what was there:
`theflow.md`'s sacred paths are kept, while an old build's are still dropped; and
the default, which reverses ADR-0094. After the completeness read they also
settled two cases it raised: the no-map stop is lifted by `grill-map`'s notes,
not by `grill-the-graph`'s empty hub (boring_avatars built a 35-note map first);
and a `theflow.md` that only points into an old build is cleared with that build,
not stopped on.

## What it was decided on

- **The prior art.** Three repositories retired their `theflow.md` by hand:
  boring_avatars (`94af633`, `d40e80d`), flutter_password_input (`44ae8be`),
  just_tooltip (`ad01a6d`). Two used the map as the main destination; just_tooltip
  sent proofs, gates and release to its `thegraph.md` instead. `salvage` listed
  neither the map nor that split. The table follows the two, as `grill-the-graph`
  allows the build only References and Gates; none sent anything to a decision record; boring_avatars
  kept the sacred paths as a map invariant; two pinned provenance to a commit.
  boring_avatars also shows the case search ③ now covers: two map notes still
  claim a pointer dangles that its own commit fixed.
- **The live files.** Four repositories hold one (ADR-0094). frameee's
  `GateCommandDriftTests.swift` reads it at run time; justerm's `CLAUDE.md:80`
  records keeping it; neither frameee nor flutter_tweakcn_generator has a map.
  Each of the three stops is a case found on disk.
- **Why sacred paths differ.** An old build's list was drafted by the builder
  and ratified; `grill-the-flow` asked the person for theirs.

## Measured on the change

Two fresh agents followed the edited skill on real repositories, up to the list it
shows before deleting; neither repository was changed.

- **frameee** (`theflow.md`, 885 lines, no map, no build): stopped on *no map*
  and on *code that reads it at run time* (`GateCommandDriftTests.swift:56`). It
  sorted the CI header and gate-script comments that call the file the source of
  truth as ring 3.
- **mobile_init_project** (an old stamped build plus a pointer-only
  `theflow.md`): found the build's 10 stamped files, including a script the
  manifest missed, and stopped the `theflow.md` part on *no map*.

Both reported where the text was silent. The `theflow.md` gaps were fixed before
commit: the stop's scope, a keep decision told apart from a pointer, rows for
identity, prior art, divergences, the tie-breaker, the hidden-state list and
branch rules, a pointer-only file, source-of-truth comments, and which sacred
paths are kept. Gaps they found in clearing an old build are outside this record.
